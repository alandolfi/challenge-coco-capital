import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla `positions` — read model del patrón CQRS.
 *
 * PROBLEMA:
 * Calcular el portfolio agregando toda la tabla `orders` en cada request
 * crece O(n) con el historial y genera contención lectura/escritura.
 *
 * SOLUCIÓN:
 * La arquitectura separa write side y read side (CQRS):
 * - CreateOrderHandler (write): si la orden se ejecuta (FILLED), actualiza
 *   `positions` en la misma transacción DB → consistencia garantizada.
 * - GetPortfolioHandler (read): lee directamente de `positions` → O(1)
 *   independientemente del volumen de órdenes históricas.
 *
 * PRÓXIMO PASO A ESCALA:
 * Publicar un `OrderFilled` domain event desde CreateOrderHandler y actualizar
 * `positions` de forma asíncrona (Kafka / RabbitMQ), aceptando eventual consistency.
 */
export class CreatePositionsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id            SERIAL PRIMARY KEY,
        "userId"      INTEGER NOT NULL,
        "instrumentId" INTEGER NOT NULL,
        quantity      NUMERIC(15, 4) NOT NULL DEFAULT 0,
        CONSTRAINT fk_positions_user       FOREIGN KEY ("userId")       REFERENCES users(id),
        CONSTRAINT fk_positions_instrument FOREIGN KEY ("instrumentId") REFERENCES instruments(id),
        CONSTRAINT uq_positions_user_instrument UNIQUE ("userId", "instrumentId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_user ON positions ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_marketdata_instrument_date
        ON marketdata (instrumentid, date DESC)
    `);

    // Poblar positions desde órdenes FILLED existentes (seed data)
    // Stock positions: BUY suma, SELL resta
    await queryRunner.query(`
      INSERT INTO positions ("userId", "instrumentId", quantity)
      SELECT userid, instrumentid,
        SUM(CASE WHEN side = 'BUY' THEN size ELSE -size END)
      FROM orders
      WHERE status = 'FILLED' AND side IN ('BUY', 'SELL')
      GROUP BY userid, instrumentid
      ON CONFLICT ("userId", "instrumentId")
      DO UPDATE SET quantity = positions.quantity + EXCLUDED.quantity
    `);

    // ARS positions: combinando CASH_IN/OUT (size directo) y BUY/SELL (size * price)
    await queryRunner.query(`
      INSERT INTO positions ("userId", "instrumentId", quantity)
      SELECT userid, 66,
        SUM(delta)
      FROM (
        SELECT userid, CASE WHEN side = 'CASH_IN' THEN size ELSE -size END AS delta
        FROM orders WHERE status = 'FILLED' AND side IN ('CASH_IN', 'CASH_OUT')
        UNION ALL
        SELECT userid, CASE WHEN side = 'BUY' THEN -(size * price) ELSE size * price END AS delta
        FROM orders WHERE status = 'FILLED' AND side IN ('BUY', 'SELL')
      ) t
      GROUP BY userid
      ON CONFLICT ("userId", "instrumentId")
      DO UPDATE SET quantity = positions.quantity + EXCLUDED.quantity
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS positions`);
  }
}
