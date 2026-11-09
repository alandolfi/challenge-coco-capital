import { Order } from 'src/order/domain/Order';
import { OrderSide } from 'src/order/domain/OrderSide';
import { OrderStatus } from 'src/order/domain/OrderStatus';
import { OrderType } from 'src/order/domain/OrderType';

interface OrderParams {
  instrumentId: number;
  userId: number;
  side: OrderSide;
  size: number;
  price: number;
  type: OrderType;
  status: OrderStatus;
}

export class OrderMother {
  static create(params?: Partial<OrderParams>): Order {
    return Order.create({
      instrumentId: 34,
      userId: 1,
      side: 'BUY',
      size: 10,
      price: 885.8,
      type: 'MARKET',
      status: 'FILLED',
      ...params,
    });
  }

  static buyMarket(params?: Partial<OrderParams>): Order {
    return OrderMother.create({ side: 'BUY', type: 'MARKET', status: 'FILLED', ...params });
  }

  static sellMarket(params?: Partial<OrderParams>): Order {
    return OrderMother.create({ side: 'SELL', type: 'MARKET', status: 'FILLED', ...params });
  }

  static buyLimit(params?: Partial<OrderParams>): Order {
    return OrderMother.create({ side: 'BUY', type: 'LIMIT', status: 'NEW', ...params });
  }

  static rejected(params?: Partial<OrderParams>): Order {
    return OrderMother.create({ status: 'REJECTED', ...params });
  }
}
