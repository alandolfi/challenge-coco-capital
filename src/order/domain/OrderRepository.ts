import { Order } from './Order';
import { PositionDelta } from './PositionDelta';

export abstract class OrderRepository {
  abstract userExists(userId: number): Promise<boolean>;
  abstract instrumentExists(instrumentId: number): Promise<boolean>;

  /** Precio de cierre más reciente del instrumento en marketdata */
  abstract getLatestMarketPrice(instrumentId: number): Promise<number | null>;

  /**
   * Cantidad disponible de un instrumento en el portfolio del usuario.
   * Para ARS (id=66) devuelve el saldo en pesos.
   */
  abstract getPositionQuantity(userId: number, instrumentId: number): Promise<number>;

  /**
   * Persiste la orden y aplica los deltas de posición en una sola transacción.
   * Los deltas solo se aplican cuando status=FILLED.
   */
  abstract save(order: Order, deltas: PositionDelta[]): Promise<Record<string, unknown>>;
}
