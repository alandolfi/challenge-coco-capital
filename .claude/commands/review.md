# Review: Hexagonal Architecture & Best Practices

Review the changed or specified files against the project's architectural rules and best practices.

## Phase 1: Identify files to review

If files were specified as arguments, review those. Otherwise run `git diff --name-only` to find changed files.

## Phase 2: Run three review agents in parallel

Pass each agent the full content of the files to review.

### Agent 1: Hexagonal Architecture

Check that layer boundaries are respected:

1. **Domain layer** (`domain/`): no imports from `infrastructure/` or `application/`. No decorators de NestJS (`@Injectable`, `@Column`, etc.). Value objects con `readonly` en todas sus propiedades. Repositorios definidos como `abstract class` (ports).
2. **Application layer** (`application/`): solo depende de `domain/`. Use cases reciben el port por constructor. Sin lógica HTTP ni TypeORM directa.
3. **Infrastructure layer** (`infrastructure/`): controllers solo llaman use cases, sin lógica de negocio. Adapters implementan el port del dominio. DTOs de entrada tienen decoradores `class-validator`. Nunca se retorna una entidad de dominio directamente — siempre `toPrimitives()` o DTO de respuesta.

### Agent 2: Code Quality

Check for quality issues specific to this project:

1. **Stringly-typed code**: strings hardcodeados donde debería haber un enum o string union del dominio (`'FILLED'`, `'BUY'`, `'MARKET'`, etc.)
2. **Validación mal ubicada**: lógica de validación de negocio fuera del constructor del value object
3. **Excepciones HTTP en dominio/aplicación**: `HttpException`, `BadRequestException`, etc. fuera de infrastructure
4. **`process.env` directo**: uso de variables de entorno sin pasar por `ConfigService`
5. **Leaky abstractions**: entidades TypeORM (`TypeOrmUser`) expuestas fuera de infrastructure

### Agent 3: Efficiency & TypeORM

Check for efficiency issues:

1. **N+1 queries**: queries dentro de loops; sugerir `leftJoinAndSelect` o `QueryBuilder`
2. **`synchronize: true`** fuera de tests
3. **Operaciones secuenciales independientes** que podrían correr en paralelo (`Promise.all`)
4. **Carga innecesaria de datos**: traer todas las columnas cuando solo se necesitan algunas (`.select()`)
5. **Falta de índices obvios**: foreign keys sin índice en entidades TypeORM

## Phase 3: Fix issues

Esperar que los tres agentes terminen. Corregir cada problema encontrado directamente en el código. Si un hallazgo es falso positivo, anotarlo y continuar.

Resumir brevemente qué se corrigió al final.
