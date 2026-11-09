import { OrderSide } from './OrderSide';
import { OrderStatus } from './OrderStatus';
import { OrderType } from './OrderType';
import { OrderPrice } from './value-objects/OrderPrice';
import { OrderSize } from './value-objects/OrderSize';

export class Order {
  constructor(
    readonly id: number | null,
    readonly instrumentId: number,
    readonly userId: number,
    readonly side: OrderSide,
    readonly size: OrderSize,
    readonly price: OrderPrice,
    readonly type: OrderType,
    readonly status: OrderStatus,
    readonly datetime: Date,
  ) {}

  static create(params: {
    instrumentId: number;
    userId: number;
    side: OrderSide;
    size: OrderSize;
    price: OrderPrice;
    type: OrderType;
    hasBalance: boolean;
  }): Order {
    return new Order(
      null,
      params.instrumentId,
      params.userId,
      params.side,
      params.size,
      params.price,
      params.type,
      Order.resolveStatus(params.type, params.hasBalance),
      new Date(),
    );
  }

  isFilled(): boolean {
    return this.status === 'FILLED';
  }

  private static resolveStatus(type: OrderType, hasBalance: boolean): OrderStatus {
    if (!hasBalance) return 'REJECTED';
    return type === 'MARKET' ? 'FILLED' : 'NEW';
  }

  toPrimitives() {
    return {
      id: this.id,
      instrumentId: this.instrumentId,
      userId: this.userId,
      side: this.side,
      size: this.size.value,
      price: this.price.value,
      type: this.type,
      status: this.status,
      datetime: this.datetime,
    };
  }
}
