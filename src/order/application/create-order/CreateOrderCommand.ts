import { OrderSide } from 'src/order/domain/OrderSide';
import { OrderType } from 'src/order/domain/OrderType';

export class CreateOrderCommand {
  constructor(
    readonly userId: number,
    readonly instrumentId: number,
    readonly side: OrderSide,
    readonly type: OrderType,
    readonly size?: number,
    readonly amount?: number,
    readonly price?: number,
  ) {}
}
