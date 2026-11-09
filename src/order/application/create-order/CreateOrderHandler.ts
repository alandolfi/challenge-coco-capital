import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InvalidArgument } from 'src/shared/domain/exceptions/InvalidArgument';
import { NotFound } from 'src/shared/domain/exceptions/NotFound';
import { ARS_INSTRUMENT_ID } from 'src/shared/domain/constants';
import { Order } from 'src/order/domain/Order';
import { OrderRepository } from 'src/order/domain/OrderRepository';
import { OrderSide } from 'src/order/domain/OrderSide';
import { OrderType } from 'src/order/domain/OrderType';
import { PositionDelta } from 'src/order/domain/PositionDelta';
import { OrderPrice } from 'src/order/domain/value-objects/OrderPrice';
import { OrderSize } from 'src/order/domain/value-objects/OrderSize';
import { CreateOrderCommand } from './CreateOrderCommand';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(private readonly repository: OrderRepository) {}

  async execute(command: CreateOrderCommand): Promise<Record<string, unknown>> {
    const { userId, instrumentId, side, type } = command;

    const [userOk, instrumentOk] = await Promise.all([
      this.repository.userExists(userId),
      this.repository.instrumentExists(instrumentId),
    ]);

    if (!userOk) throw new NotFound('Usuario', userId);
    if (!instrumentOk) throw new NotFound('Instrumento', instrumentId);

    const price = await this.resolvePrice(type, instrumentId, command.price);
    const size = this.resolveSize(command.size, command.amount, price.value);

    const hasBalance = await this.validateBalance(side, { userId, instrumentId, size: size.value, price: price.value });
    const order = Order.create({ userId, instrumentId, side, size, price, type, hasBalance });
    const deltas = order.isFilled() ? this.buildDeltas(side, { userId, instrumentId, size: size.value, price: price.value }) : [];

    return this.repository.save(order, deltas);
  }

  /**
   * Lookup table: cada side sabe cómo validar si tiene saldo suficiente.
   * CASH_IN no valida — el dinero entrante siempre se acepta.
   */
  private async validateBalance(
    side: OrderSide,
    ctx: { userId: number; instrumentId: number; size: number; price: number },
  ): Promise<boolean> {
    const validators: Partial<Record<OrderSide, () => Promise<boolean>>> = {
      BUY: async () => {
        const cash = await this.repository.getPositionQuantity(ctx.userId, ARS_INSTRUMENT_ID);
        return ctx.size * ctx.price <= cash;
      },
      SELL: async () => {
        const shares = await this.repository.getPositionQuantity(ctx.userId, ctx.instrumentId);
        return ctx.size <= shares;
      },
      CASH_OUT: async () => {
        const cash = await this.repository.getPositionQuantity(ctx.userId, ARS_INSTRUMENT_ID);
        return ctx.size <= cash;
      },
    };

    return validators[side]?.() ?? Promise.resolve(true);
  }

  /**
   * Lookup table: cada side sabe qué posiciones actualizar cuando se ejecuta.
   */
  private buildDeltas(
    side: OrderSide,
    ctx: { userId: number; instrumentId: number; size: number; price: number },
  ): PositionDelta[] {
    const builders: Record<OrderSide, () => PositionDelta[]> = {
      BUY: () => [
        { userId: ctx.userId, instrumentId: ctx.instrumentId, delta: ctx.size },
        { userId: ctx.userId, instrumentId: ARS_INSTRUMENT_ID, delta: -(ctx.size * ctx.price) },
      ],
      SELL: () => [
        { userId: ctx.userId, instrumentId: ctx.instrumentId, delta: -ctx.size },
        { userId: ctx.userId, instrumentId: ARS_INSTRUMENT_ID, delta: ctx.size * ctx.price },
      ],
      CASH_IN: () => [{ userId: ctx.userId, instrumentId: ARS_INSTRUMENT_ID, delta: ctx.size }],
      CASH_OUT: () => [{ userId: ctx.userId, instrumentId: ARS_INSTRUMENT_ID, delta: -ctx.size }],
    };

    return builders[side]();
  }

  private async resolvePrice(type: OrderType, instrumentId: number, requestedPrice?: number): Promise<OrderPrice> {
    if (type === 'MARKET') {
      if (requestedPrice) throw new InvalidArgument('Las órdenes MARKET no requieren precio — se usa el precio de mercado automáticamente');
      const marketPrice = await this.repository.getLatestMarketPrice(instrumentId);
      if (!marketPrice) throw new InvalidArgument(`No hay precio de mercado para el instrumento ${instrumentId}`);
      return new OrderPrice(marketPrice);
    }
    if (!requestedPrice) throw new InvalidArgument('Las órdenes LIMIT requieren precio');
    return new OrderPrice(requestedPrice);
  }

  private resolveSize(size?: number, amount?: number, price?: number): OrderSize {
    const resolved = size || (amount && price ? Math.floor(amount / price) : 0) || 0;
    return new OrderSize(resolved);
  }
}
