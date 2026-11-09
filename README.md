# Cocos Capital — Backend Challenge

API REST para gestión de portfolio de inversiones, construida con NestJS y arquitectura hexagonal.

---

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| Node.js | 20 | Runtime |
| NestJS | 12 | Framework HTTP |
| TypeScript | 5 | Lenguaje |
| TypeORM | 0.3 | ORM |
| PostgreSQL | 16 | Base de datos |
| Jest + jest-mock-extended | — | Testing unitario |
| New Relic | — | APM / Telemetría (opcional) |

---

## Inicio rápido (Docker — recomendado)

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd cocos-challenge

# 2. Crear el archivo de variables de entorno
cp .env.example .env

# 3. Levantar toda la infra (Postgres + App)
docker compose up --build
```

La app queda disponible en `http://localhost:3000`
La documentación Swagger en `http://localhost:3000/api`

> **Nota:** El primer arranque ejecuta `database/init.sql` automáticamente — crea las tablas y carga los datos de seed. No es necesario correr ninguna migración manualmente para desarrollo.

---

## Inicio sin Docker

Requiere PostgreSQL corriendo localmente.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con los datos de tu Postgres local

# 3. Levantar en modo desarrollo (hot reload)
npm run start:dev
```

---

## Variables de entorno

Copiar `.env.example` como `.env` y completar los valores:

```bash
# Base de datos (app)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cocos
DB_USER=cocos
DB_PASSWORD=cocos

# Postgres (servicio Docker)
POSTGRES_DB=cocos
POSTGRES_USER=cocos
POSTGRES_PASSWORD=cocos

# Aplicación
NODE_ENV=development
PORT=3000

# New Relic — dejar vacío para deshabilitar telemetría
NEW_RELIC_APP_NAME=cocos-challenge
NEW_RELIC_LICENSE_KEY=
NEW_RELIC_NO_CONFIG_FILE=true
NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
NEW_RELIC_LOG_LEVEL=info
```

> `.env` está en `.gitignore` y nunca se sube al repositorio.
> `.env.example` documenta todas las variables necesarias.

---

## API Endpoints

### `GET /instruments?search=`

Busca instrumentos por ticker o nombre. La búsqueda es case-insensitive.

```bash
curl "http://localhost:3000/instruments?search=GGAL"
curl "http://localhost:3000/instruments?search=banco"
curl "http://localhost:3000/instruments"   # todos los instrumentos
```

**Respuesta:**
```json
[
  {
    "id": 34,
    "ticker": "GGAL",
    "name": "Grupo Financiero Galicia",
    "type": "ACCIONES",
    "lastPrice": 885.8,
    "dailyReturn": -3.48
  }
]
```

---

### `POST /orders`

Envía una orden de compra o venta.

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "instrumentId": 34,
    "side": "BUY",
    "type": "MARKET",
    "size": 10
  }'
```

**Body:**

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `userId` | number | ✓ | ID del usuario |
| `instrumentId` | number | ✓ | ID del instrumento |
| `side` | `BUY` \| `SELL` \| `CASH_IN` \| `CASH_OUT` | ✓ | Dirección de la orden |
| `type` | `MARKET` \| `LIMIT` | ✓ | Tipo de orden |
| `size` | number | * | Cantidad de acciones |
| `amount` | number | * | Monto en pesos (alternativa a `size`) |
| `price` | number | LIMIT | Precio de ejecución. **No enviar para MARKET** |

> `size` o `amount` — se requiere al menos uno. Si se envía `amount`, se calcula el máximo de acciones enteras posibles (`floor(amount / precio)`).
> Los valores `side` y `type` aceptan minúsculas (`buy`, `market`, etc.).

**Reglas de negocio:**

| Condición | Status resultado |
|---|---|
| `MARKET` + saldo suficiente | `FILLED` — ejecuta inmediatamente |
| `LIMIT` + saldo suficiente | `NEW` — queda pendiente |
| Saldo / acciones insuficientes | `REJECTED` |

**Respuesta:**
```json
{
  "id": 15,
  "instrumentId": 34,
  "userId": 1,
  "side": "BUY",
  "size": 10,
  "price": 885.8,
  "type": "MARKET",
  "status": "FILLED",
  "datetime": "2026-11-08T21:19:22.549Z"
}
```

---

### `GET /portfolio/:userId`

Devuelve el valor total de la cuenta, pesos disponibles y posiciones del usuario.

```bash
curl "http://localhost:3000/portfolio/1"
```

**Respuesta:**
```json
{
  "totalValue": 904784,
  "availableCash": 712713.5,
  "positions": [
    {
      "instrumentId": 34,
      "ticker": "GGAL",
      "name": "Grupo Financiero Galicia",
      "quantity": 5,
      "lastPrice": 885.8,
      "marketValue": 4429,
      "dailyReturn": -3.48
    }
  ]
}
```

| Campo | Descripción |
|---|---|
| `totalValue` | `availableCash` + suma de `marketValue` de todas las posiciones |
| `availableCash` | Saldo en pesos disponible para operar |
| `marketValue` | `quantity × lastPrice` |
| `dailyReturn` | `(close - previousClose) / previousClose × 100` |

---

## Respuestas de error

Todos los errores siguen la misma estructura:

```json
{
  "statusCode": 404,
  "message": "Usuario con id 999 no existe",
  "path": "/portfolio/999",
  "timestamp": "2026-11-08T21:03:38.531Z"
}
```

| Status | Causa |
|---|---|
| `400` | Parámetros inválidos (precio en MARKET, LIMIT sin precio, size ≤ 0) |
| `404` | `userId` o `instrumentId` no existen |
| `500` | Error inesperado del servidor |

---

## Estructura del proyecto

```
src/
├── main.ts                          # Bootstrap, Swagger, New Relic, ValidationPipe
├── app.module.ts                    # Módulo raíz
│
├── shared/
│   ├── domain/
│   │   ├── constants.ts             # ARS_INSTRUMENT_ID y otras constantes de dominio
│   │   ├── exceptions/
│   │   │   ├── Exception.ts         # Base
│   │   │   ├── InvalidArgument.ts   # → HTTP 400
│   │   │   └── NotFound.ts          # → HTTP 404
│   │   └── value-objects/
│   └── infrastructure/
│       ├── all-exceptions.filter.ts # Mapea excepciones de dominio a HTTP
│       ├── telemetry/
│       │   ├── TelemetryService.ts  # Wrapper de New Relic (no-op si no hay key)
│       │   ├── LoggingInterceptor.ts# Loguea todos los HTTP requests
│       │   └── telemetry.module.ts  # Global — disponible en toda la app
│       └── persistence/typeorm/
│           ├── PostgresTypeormClient.ts
│           ├── SqliteTypeormClient.ts   # Para tests
│           ├── data-source.ts           # CLI de migraciones
│           └── migrations/
│               └── 1700000000000-CreatePositionsTable.ts
│
├── instrument/                      # GET /instruments?search=
│   ├── domain/
│   │   ├── Instrument.ts
│   │   └── InstrumentRepository.ts  # Port
│   ├── application/search-instruments/
│   │   ├── SearchInstrumentsQuery.ts    # Query (datos de entrada)
│   │   └── SearchInstrumentsHandler.ts # QueryHandler
│   └── infrastructure/
│       ├── instrument.controller.ts  # Despacha SearchInstrumentsQuery via QueryBus
│       ├── instrument.module.ts
│       ├── instrument.service.ts
│       ├── dto/SearchInstrumentsResponseDto.ts
│       └── persistence/
│           ├── TypeOrmInstrumentRepository.ts  # Adapter
│           └── typeorm/TypeOrmInstrument.ts
│
├── order/                           # POST /orders
│   ├── domain/
│   │   ├── Order.ts
│   │   ├── OrderSide.ts             # 'BUY' | 'SELL' | 'CASH_IN' | 'CASH_OUT'
│   │   ├── OrderType.ts             # 'MARKET' | 'LIMIT'
│   │   ├── OrderStatus.ts           # 'NEW' | 'FILLED' | 'REJECTED' | 'CANCELLED'
│   │   ├── PositionDelta.ts         # Interface para actualizar positions
│   │   └── OrderRepository.ts      # Port
│   ├── application/create-order/
│   │   ├── CreateOrderCommand.ts    # Command (datos de entrada)
│   │   ├── CreateOrderHandler.ts    # CommandHandler — lógica de negocio central
│   │   └── CreateOrderHandler.spec.ts  # 14 tests unitarios
│   └── infrastructure/
│       ├── order.controller.ts      # Despacha CreateOrderCommand via CommandBus
│       ├── order.module.ts
│       ├── dto/CreateOrderDto.ts
│       └── persistence/
│           ├── TypeOrmOrderRepository.ts  # Adapter + manejo de transacciones
│           └── typeorm/TypeOrmOrder.ts
│
└── portfolio/                       # GET /portfolio/:userId
    ├── domain/
    │   ├── Portfolio.ts
    │   ├── Position.ts
    │   └── PortfolioRepository.ts   # Port (read side — QueryHandler)
    ├── application/get-portfolio/
    │   ├── GetPortfolioQuery.ts     # Query (datos de entrada)
    │   └── GetPortfolioHandler.ts  # QueryHandler — lee de positions
    └── infrastructure/
        ├── portfolio.controller.ts  # Despacha GetPortfolioQuery via QueryBus
        ├── portfolio.module.ts
        ├── dto/PortfolioResponseDto.ts
        └── persistence/
            └── TypeOrmPortfolioRepository.ts  # Adapter — lee de positions

test/
└── order/domain/
    └── OrderMother.ts               # Object Mother para fixtures de tests
```

---

## Base de datos

### Schema

```sql
users        — id, email, accountNumber
instruments  — id, ticker, name, type (ACCIONES | MONEDA)
orders       — id, instrumentId, userId, side, size, price, type, status, datetime
marketdata   — id, instrumentId, high, low, open, close, previousClose, date
positions    — id, userId, instrumentId, quantity   ← creada por migración
```

### CQRS + tabla `positions` como read model

La arquitectura separa explícitamente escrituras y lecturas usando el patrón CQRS:

- **Write side** — `CommandBus` despacha `CreateOrderCommand` → `CreateOrderHandler`
- **Read side** — `QueryBus` despacha `GetPortfolioQuery` → `GetPortfolioHandler`

Los handlers viven en `application/` y son las únicas clases que pueden mutar o leer estado respectivamente. Los controllers no contienen lógica: solo construyen el command/query y lo despachan al bus.

**Problema de escala:** calcular el portfolio agregando toda la tabla `orders` en cada request crece O(n) con el historial y genera contención lectura/escritura.

**Solución — read model `positions`:**

```
CommandHandler (write side) → POST /orders
  Guarda en `orders`
  Si status = FILLED: actualiza `positions` en la misma transacción DB

QueryHandler (read side) → GET /portfolio/:userId
  Lee directamente de `positions` (1 fila por instrumento por usuario)
  Nunca toca `orders` → O(1) independientemente del historial
```

La tabla `positions` es el read model del CQRS: siempre consistente porque se actualiza sincrónicamente en la misma transacción.

**Próximo paso a escala:** hoy `CreateOrderHandler` actualiza `positions` sincrónicamente en la misma transacción DB. Si el volumen de escrituras genera contención, el siguiente paso sería publicar un `OrderFilled` domain event y actualizar `positions` de forma asíncrona (Kafka / RabbitMQ), aceptando eventual consistency en el read model.

---

## Arquitectura hexagonal

Cada bounded context sigue la misma estructura de tres capas:

```
domain/          → entidades, value objects, interfaces de repositorio (ports)
                   Sin dependencias externas. Contiene las reglas de negocio.

application/     → casos de uso. Solo depende del dominio.
                   Orquesta los ports, nunca accede a la DB directamente.

infrastructure/  → controllers, repositorios TypeORM (adapters), módulos NestJS.
                   Implementa los ports del dominio.
```

Los ports son clases abstractas en `domain/`. NestJS inyecta el adapter cuando cualquier clase pide el port en su constructor:

```ts
{ provide: OrderRepository, useClass: TypeOrmOrderRepository }
```

### Manejo de excepciones

Las excepciones de dominio se lanzan desde `domain/` y `application/`. El `AllExceptionsFilter` las mapea a HTTP en la capa de infraestructura:

| Excepción de dominio | HTTP |
|---|---|
| `NotFound` | 404 |
| `InvalidArgument` | 400 |
| `Error` genérico | 500 |

Regla: **nunca** lanzar `HttpException` desde dominio o aplicación.

---

## Telemetría — New Relic (opcional)

La capa de telemetría es un módulo global (`@Global`) que provee:

- **`TelemetryService`** — wrapper de New Relic. Si `NEW_RELIC_LICENSE_KEY` está vacío, todos los métodos son no-ops silenciosos. La app funciona igual sin credenciales.
- **`LoggingInterceptor`** — intercepta todos los requests HTTP, loguea método/ruta/status/duración y envía eventos `HttpRequest` custom a New Relic.

Para activar en producción, solo completar en `.env`:
```bash
NEW_RELIC_LICENSE_KEY=tu_clave_aqui
```

---

## Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

Los tests unitarios usan `jest-mock-extended` para mockear los ports (repositorios). No requieren base de datos.

Los fixtures se generan con el patrón **Object Mother** en `test/<bounded-context>/domain/`.

**Cobertura actual — `CreateOrder` (14 tests):**
- `MARKET`: FILLED cuando saldo suficiente, REJECTED cuando insuficiente
- `SELL`: FILLED cuando acciones suficientes, REJECTED cuando insuficientes
- `LIMIT`: NEW cuando saldo suficiente, REJECTED cuando insuficiente
- `CASH_IN`: siempre FILLED
- Cálculo de `size` a partir de `amount`
- Validación: MARKET con precio → error
- Validación: LIMIT sin precio → error
- Validación: sin size ni amount → error
- Validación: sin precio de mercado → error
- Validación: `userId` inexistente → `NotFound`
- Validación: `instrumentId` inexistente → `NotFound`

---

## Migraciones

```bash
# Generar una nueva migración
npm run migration:generate -- src/shared/infrastructure/persistence/typeorm/migrations/NombreMigration

# Ejecutar migraciones pendientes
npm run migration:run

# Revertir última migración
npm run migration:revert
```

> En producción las migraciones corren automáticamente al arrancar (`migrationsRun: true`).
> `synchronize` está en `false` — siempre usar migraciones, nunca sync automático.

---

## Comandos útiles

```bash
npm run start:dev     # Desarrollo con hot reload
npm run build         # Compilar a dist/
npm run lint          # ESLint con autofix
npm run format        # Prettier

docker compose up --build        # Levantar todo
docker compose down -v           # Bajar y limpiar volúmenes (reset de DB)
docker compose logs app -f       # Ver logs en tiempo real
```
