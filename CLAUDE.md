# Cocos Capital - Backend Challenge

## Stack
- **Framework**: NestJS 12 + TypeScript 6
- **ORM**: TypeORM 0.3 con PostgreSQL (`pg`)
- **Testing**: Jest + jest-mock-extended
- **Architecture**: Hexagonal (Ports & Adapters) + CQRS (`@nestjs/cqrs`)

## Running the project

```bash
# Docker (recomendado)
docker compose up --build

# Local (requiere Postgres corriendo)
npm install
npm run start:dev
```

## Environment variables

| Variable    | Default     | Description          |
|-------------|-------------|----------------------|
| DB_HOST     | localhost   | Postgres host        |
| DB_PORT     | 5432        | Postgres port        |
| DB_NAME     | cocos       | Database name        |
| DB_USER     | cocos       | Database user        |
| DB_PASSWORD | cocos       | Database password    |

## Database

Postgres se levanta via docker-compose. El init script `database/init.sql` crea las tablas y carga el seed al primer arranque.

### Schema
- **users**: id, email, accountNumber
- **instruments**: id, ticker, name, type (`ACCIONES` | `MONEDA`)
- **orders**: id, instrumentId, userId, side, size, price, type, status, datetime
- **marketdata**: id, instrumentId, high, low, open, close, previousClose, date
- **positions**: id, userId, instrumentId, quantity ← read model CQRS, creada por migración

### Order sides
`BUY` | `SELL` | `CASH_IN` | `CASH_OUT`

### Order types
`MARKET` (ejecuta inmediato → FILLED) | `LIMIT` (queda en NEW)

### Order statuses
`NEW` | `FILLED` | `REJECTED` | `CANCELLED`

## Migrations

```bash
npm run migration:generate -- src/shared/infrastructure/persistence/typeorm/migrations/NombreMigration
npm run migration:run
npm run migration:revert
```

DataSource config: `src/shared/infrastructure/persistence/typeorm/data-source.ts`

## Project structure

```
src/
├── app.module.ts
├── main.ts
├── shared/
│   ├── domain/
│   │   ├── constants.ts                 # ARS_INSTRUMENT_ID y otras constantes
│   │   ├── exceptions/                  # Exception, InvalidArgument, NotFound
│   │   └── value-objects/
│   └── infrastructure/
│       ├── all-exceptions.filter.ts     # Mapea excepciones de dominio a HTTP
│       ├── telemetry/                   # TelemetryService (New Relic), LoggingInterceptor
│       └── persistence/typeorm/
│           ├── PostgresTypeormClient.ts
│           ├── SqliteTypeormClient.ts   # Para tests
│           ├── data-source.ts
│           └── migrations/
│
├── order/                               # POST /orders — write side CQRS
│   ├── domain/
│   │   ├── Order.ts / OrderSide.ts / OrderType.ts / OrderStatus.ts
│   │   ├── PositionDelta.ts
│   │   └── OrderRepository.ts          # Port
│   ├── application/create-order/
│   │   ├── CreateOrderCommand.ts       # Command (datos de entrada)
│   │   ├── CreateOrderHandler.ts       # CommandHandler — lógica de negocio
│   │   └── CreateOrderHandler.spec.ts  # 14 tests unitarios
│   └── infrastructure/
│       ├── order.controller.ts         # Despacha via CommandBus
│       ├── order.module.ts             # Importa CqrsModule, registra handler
│       ├── dto/CreateOrderDto.ts
│       └── persistence/TypeOrmOrderRepository.ts  # Adapter + transacciones
│
├── portfolio/                           # GET /portfolio/:userId — read side CQRS
│   ├── domain/
│   │   ├── Portfolio.ts / Position.ts
│   │   └── PortfolioRepository.ts      # Port
│   ├── application/get-portfolio/
│   │   ├── GetPortfolioQuery.ts        # Query (datos de entrada)
│   │   └── GetPortfolioHandler.ts      # QueryHandler — lee de positions
│   └── infrastructure/
│       ├── portfolio.controller.ts     # Despacha via QueryBus
│       ├── portfolio.module.ts
│       └── persistence/TypeOrmPortfolioRepository.ts  # Adapter — lee de positions
│
└── instrument/                          # GET /instruments?search=
    ├── domain/
    │   ├── Instrument.ts
    │   └── InstrumentRepository.ts     # Port
    ├── application/search-instruments/
    │   ├── SearchInstrumentsQuery.ts   # Query (datos de entrada)
    │   └── SearchInstrumentsHandler.ts # QueryHandler
    └── infrastructure/
        ├── instrument.controller.ts    # Despacha via QueryBus
        ├── instrument.module.ts
        └── persistence/TypeOrmInstrumentRepository.ts

database/
└── init.sql                            # Schema + seed

__mocks__/@nestjs/
├── common.js                           # Stub decoradores NestJS para Jest (ESM compat)
└── cqrs.js                             # Stub CommandHandler/QueryHandler para Jest
```

## Hexagonal architecture conventions

- **Domain**: entidades, value objects, interfaces de repositorio (ports). Sin dependencias externas.
- **Application**: CommandHandlers y QueryHandlers. Solo dependen del dominio. Nunca acceden a la DB directamente.
- **Infrastructure**: controllers, repositorios TypeORM (adapters), módulos NestJS.

Para agregar un nuevo bounded context, replicar la estructura de `src/order/` (write) o `src/portfolio/` (read).

## Coding conventions

- **Archivos**: `PascalCase` para clases (`UserCreator.ts`), mismo nombre que la clase exportada
- **Tests**: co-ubicados con el use case (`UserCreator.spec.ts` junto a `UserCreator.ts`)
- **Import paths**: usar alias `src/` en lugar de rutas relativas (configurado en `jest.config.js`)
  ```ts
  import { UserRepository } from 'src/user/domain/UserRepository'; // ✓
  import { UserRepository } from '../../domain/UserRepository';     // ✗
  ```
- **Handler naming**: `<Accion><Entidad>Handler` → `CreateOrderHandler`, `GetPortfolioHandler`, `SearchInstrumentsHandler`
- **Command/Query naming**: `<Accion><Entidad>Command` / `<Accion><Entidad>Query` → `CreateOrderCommand`, `GetPortfolioQuery`
- **Variable SUT** en tests: la clase bajo prueba se llama `SUT` (System Under Test)

## Dependency injection pattern (Port → Adapter + CQRS)

Así se wiree un port con su adapter y se registran los handlers en el módulo NestJS:

```ts
// src/order/infrastructure/order.module.ts
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([TypeOrmOrder])],
  controllers: [OrderController],
  providers: [
    { provide: OrderRepository, useClass: TypeOrmOrderRepository }, // Port → Adapter
    CreateOrderHandler,  // registrado como provider — el CqrsModule lo detecta por @CommandHandler
  ],
})
export class OrderModule {}
```

- El port (`OrderRepository`) es una clase abstracta en `domain/`
- El adapter (`TypeOrmOrderRepository`) implementa el port en `infrastructure/persistence/`
- El handler (`CreateOrderHandler`) recibe el port por DI normal de NestJS
- El controller solo inyecta `CommandBus` o `QueryBus`, nunca el handler directamente

## Testing patterns

### Mock de ports con jest-mock-extended

```ts
import { MockProxy, mock } from 'jest-mock-extended';
import { OrderRepository } from 'src/order/domain/OrderRepository';
import { CreateOrderCommand } from './CreateOrderCommand';
import { CreateOrderHandler } from './CreateOrderHandler';

let mockRepository: MockProxy<OrderRepository>;
let SUT: CreateOrderHandler;

beforeEach(() => {
  mockRepository = mock<OrderRepository>();
  SUT = new CreateOrderHandler(mockRepository);
});

// Los handlers se instancian directamente — sin CommandBus ni contenedor DI
it('FILLED: BUY cuando el saldo es suficiente', async () => {
  await SUT.execute(new CreateOrderCommand(1, 34, 'BUY', 'MARKET', 10));
  expect(mockRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'FILLED' }),
    expect.any(Array),
  );
});
```

### Mother objects

Los fixtures de test se generan con el patrón Object Mother en `test/<bounded-context>/domain/`.

```ts
// Uso
const user = UserMother.create();                        // datos aleatorios
const user = UserMother.create({ email: 'x@test.com' }); // override parcial
```

Estructura de un Mother:
```ts
export class UserMother {
  static create(params?: Partial<UserParams>): User {
    return User.fromPrimitives({
      id: UserIdMother.create().value,
      email: UserEmailMother.create().value,
      name: UserNameMother.create().value,
      ...params,
    });
  }
}
```

Los value object mothers usan `@faker-js/faker` para generar datos válidos aleatorios.

### Comandos de test

```bash
npm run test          # unit tests
npm run test:watch    # watch mode
npm run test:cov      # coverage
npm run test:e2e      # e2e (test/)
```

## Swagger

El plugin `@nestjs/swagger` está configurado en `nest-cli.json`. Decorar los DTOs y controllers con los decoradores de Swagger. La UI queda disponible en:

```
http://localhost:3000/api
```

Configurar en `main.ts`:
```ts
const config = new DocumentBuilder()
  .setTitle('Cocos API')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

## Useful commands

```bash
npm run start:dev     # desarrollo con hot reload
npm run build         # compilar a dist/
npm run lint          # ESLint con autofix
npm run format        # Prettier
npm run test          # unit tests
npm run test:e2e      # e2e tests
npm run migration:generate -- src/shared/infrastructure/persistence/typeorm/migrations/NombreMigration
npm run migration:run
npm run migration:revert
```

## Best practices

### Dominio y aplicación
- **Readonly en entidades y value objects** — garantiza inmutabilidad; nunca mutar estado después de construir
- **Validación solo en value objects** — el constructor lanza `InvalidArgument`; nunca validar en use cases ni controllers
- **Nunca lanzar excepciones HTTP desde dominio/aplicación** — solo excepciones de dominio (`InvalidArgument`); el `AllExceptionsFilter` mapea a HTTP
- **Nunca exponer entidades de dominio en HTTP** — siempre retornar `entity.toPrimitives()` o un DTO de respuesta

### Infraestructura
- **Controllers solo delegan** — sin `if`, sin cálculos; solo llaman al use case y retornan el resultado
- **Validación de inputs con `class-validator`** — decoradores `@IsString()`, `@IsEmail()`, etc. en DTOs de entrada con `ValidationPipe` global
- **ConfigModule en lugar de `process.env` directo** — usar `@nestjs/config` para centralizar y tipar variables de entorno
- **Usar constantes/enums para strings repetidos** — nunca hardcodear `'FILLED'`, `'BUY'`, etc.; definir en el dominio como enums o string unions

### TypeORM
- **`synchronize: false` en producción** — siempre usar migrations; nunca `synchronize: true` fuera de tests
- **Evitar N+1** — usar `relations` o `QueryBuilder` con `leftJoinAndSelect` en lugar de queries dentro de loops

### Constantes y datos repetidos
- **Extraer valores mágicos a constantes nombradas** — si un valor aparece en más de un lugar, centralizarlo en `src/shared/domain/constants.ts`. Un solo lugar para cambiar, cero desincronizaciones.
  ```ts
  // ✗ — valor duplicado en CreateOrderHandler.ts y TypeOrmPortfolioRepository.ts
  const cash = await repository.getPositionQuantity(userId, 66);

  // ✓ — fuente única de verdad
  import { ARS_INSTRUMENT_ID } from 'src/shared/domain/constants';
  const cash = await repository.getPositionQuantity(userId, ARS_INSTRUMENT_ID);
  ```
- **Constantes de dominio en `shared/domain/`** — no en infraestructura ni en use cases. Son hechos del dominio, no detalles de implementación.
- **Strings de status/side/type como string unions en dominio** — `'FILLED' | 'REJECTED' | 'NEW' | 'CANCELLED'` definidos en `OrderStatus.ts`; nunca hardcodear el literal en capas de aplicación o infraestructura.

### Patrones de diseño — criterio de selección

Antes de escribir código, identificar el problema estructural que se quiere resolver y elegir el patrón mínimo que lo resuelva. La siguiente tabla es una guía rápida:

| Problema | Patrón | Señal de alarma opuesta |
|---|---|---|
| Comportamiento varía por un discriminante finito | **Lookup table** | `if/else if` con >2 ramas que crecen |
| Comportamiento varía y necesita estado/herencia | **Strategy** (clase) | Lógica condicional duplicada en subclases |
| Validaciones secuenciales independientes | **Guard clauses** (early return) | Pirámide de `if` anidados |
| Operaciones con efectos colaterales desacoplados | **Domain Events** | Use case haciendo demasiadas cosas |
| Leer vs escribir con patrones de acceso distintos | **CQRS** | Query que toca tablas de escritura |
| Crear objetos complejos con variantes | **Factory / Builder** | Constructores con 5+ parámetros opcionales |
| Valor con reglas de negocio propias | **Value Object** | Primitivos validados inline en múltiples lugares |

---

#### Lookup table
Cuando el comportamiento varía según un valor discriminante conocido (`side`, `type`, `role`):

```ts
// ✗ — crece con cada nuevo caso, difícil de testear por rama
if (side === 'BUY') { ... }
else if (side === 'SELL') { ... }

// ✓ — cada entrada es testeable, agregar un caso = agregar una key
const HANDLERS: Record<OrderSide, (ctx: Ctx) => Result> = {
  BUY:      (ctx) => [...],
  SELL:     (ctx) => [...],
  CASH_IN:  (ctx) => [...],
  CASH_OUT: (ctx) => [...],
};
```

Usar `Partial<Record<K, Fn>>` cuando no todos los casos necesitan handler — la ausencia es intencional y autodocumentada.

---

#### Guard clauses (early return)
Validar precondiciones al inicio de la función y salir temprano. Elimina la pirámide de `if` anidados y hace que el camino feliz quede al final, sin indentación.

```ts
// ✗ — lógica principal enterrada en else
async execute(req) {
  if (userExists) {
    if (instrumentExists) {
      if (hasBalance) {
        // lógica real aquí, muy adentro
      }
    }
  }
}

// ✓ — falla rápido, lógica principal al nivel superior
async execute(req) {
  if (!userExists)      throw new NotFound(...);
  if (!instrumentExists) throw new NotFound(...);
  if (!hasBalance)      return save(order, 'REJECTED');
  // lógica principal aquí, sin indentación extra
  return save(order, 'FILLED');
}
```

---

#### Strategy (clase) vs Lookup table
Preferir **lookup table** cuando los handlers son funciones puras sin estado.
Preferir **Strategy** (clase con interfaz) cuando cada variante necesita: estado propio, múltiples métodos, o inyección de dependencias.

```ts
// Lookup table — suficiente para funciones puras
const VALIDATORS = { BUY: (ctx) => ctx.cash >= ctx.total };

// Strategy — necesario cuando hay estado o DI
interface PricingStrategy { calculate(order: Order): number; }
class MarketPricing implements PricingStrategy { ... }
class LimitPricing  implements PricingStrategy { ... }
```

---

#### Value Objects
Encapsular un primitivo con sus reglas de validación. Si el mismo tipo de dato se valida en más de un lugar, es candidato a Value Object.

```ts
// ✗ — validación de precio dispersa en use case, controller, test
if (price <= 0) throw new InvalidArgument('...');

// ✓ — Price sabe cuándo es válido; el use case confía en él
class Price {
  constructor(readonly value: number) {
    if (value <= 0) throw new InvalidArgument('El precio debe ser mayor a 0');
  }
}
```

---

#### CQRS — cómo está implementado en este proyecto

Commands (write side) y Queries (read side) son clases separadas despachadas via bus:

```ts
// Write side — controller construye el command y lo despacha
commandBus.execute(new CreateOrderCommand(userId, instrumentId, side, type, size));

// Read side — controller construye la query y la despacha
queryBus.execute(new GetPortfolioQuery(userId));
```

Cada handler implementa la interfaz correspondiente:
```ts
@CommandHandler(CreateOrderCommand)
class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> { ... }

@QueryHandler(GetPortfolioQuery)
class GetPortfolioHandler implements IQueryHandler<GetPortfolioQuery> { ... }
```

La tabla `positions` es el read model: `CreateOrderHandler` la actualiza sincrónicamente cuando status=FILLED; `GetPortfolioHandler` la lee directamente (O(1) vs O(n) sobre `orders`).

**Cuándo aplicar CQRS:**
- La query necesita proyecciones que no existen en el modelo de escritura
- Leer del modelo de escritura genera contención o queries lentas
- Se quiere que sea imposible que un handler de lectura mute estado

**Señal de alarma:** un CommandHandler que hace un `SELECT` complejo solo para devolver el estado actualizado — separar en Command + Query independiente.

## Business logic (challenge)

Implementar 3 endpoints:

1. **GET /portfolio/:userId** — valor total de cuenta, pesos disponibles, listado de posiciones (cantidad, valor total $, rendimiento %)
2. **GET /instruments?search=** — búsqueda por ticker o nombre
3. **POST /orders** — enviar orden BUY/SELL con tipo MARKET o LIMIT

Reglas clave:
- Precio de mercado = `close` de la última fecha en `marketdata`
- Rendimiento diario = `(close - previousClose) / previousClose * 100`
- MARKET orders → se ejecutan inmediatamente (status: FILLED)
- LIMIT orders → quedan pendientes (status: NEW)
- Si el monto supera el disponible → status: REJECTED
- Cash (ARS) está modelado como instrumento tipo MONEDA (instrumento id=66)
