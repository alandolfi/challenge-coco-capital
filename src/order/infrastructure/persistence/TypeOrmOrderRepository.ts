import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Order } from 'src/order/domain/Order';
import { OrderRepository } from 'src/order/domain/OrderRepository';
import { PositionDelta } from 'src/order/domain/PositionDelta';
import { TypeOrmOrder } from './typeorm/TypeOrmOrder';

@Injectable()
export class TypeOrmOrderRepository implements OrderRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async userExists(userId: number): Promise<boolean> {
    const rows = await this.dataSource.query(`SELECT 1 FROM users WHERE id = $1`, [userId]);
    return rows.length > 0;
  }

  async instrumentExists(instrumentId: number): Promise<boolean> {
    const rows = await this.dataSource.query(`SELECT 1 FROM instruments WHERE id = $1`, [instrumentId]);
    return rows.length > 0;
  }

  async getLatestMarketPrice(instrumentId: number): Promise<number | null> {
    const rows = await this.dataSource.query(
      `SELECT close FROM marketdata WHERE instrumentid = $1 ORDER BY date DESC LIMIT 1`,
      [instrumentId],
    );
    return rows[0]?.close ? parseFloat(rows[0].close) : null;
  }

  async getPositionQuantity(userId: number, instrumentId: number): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT quantity FROM positions WHERE "userId" = $1 AND "instrumentId" = $2`,
      [userId, instrumentId],
    );
    return rows[0]?.quantity ? parseFloat(rows[0].quantity) : 0;
  }

  async save(order: Order, deltas: PositionDelta[]): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const entity = manager.create(TypeOrmOrder, {
        instrumentId: order.instrumentId,
        userId: order.userId,
        side: order.side,
        size: order.size.value,
        price: order.price.value,
        type: order.type,
        status: order.status,
        datetime: order.datetime,
      });
      const saved = await manager.save(entity);

      await Promise.all(
        deltas.map(({ userId, instrumentId, delta }) =>
          manager.query(
            `INSERT INTO positions ("userId", "instrumentId", quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT ("userId", "instrumentId")
             DO UPDATE SET quantity = positions.quantity + $3`,
            [userId, instrumentId, delta],
          ),
        ),
      );

      return { ...order.toPrimitives(), id: saved.id };
    });
  }
}
