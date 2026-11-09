import { MockProxy, mock } from 'jest-mock-extended';
import { InvalidArgument } from 'src/shared/domain/exceptions/InvalidArgument';
import { NotFound } from 'src/shared/domain/exceptions/NotFound';
import { ARS_INSTRUMENT_ID } from 'src/shared/domain/constants';
import { OrderRepository } from 'src/order/domain/OrderRepository';
import { CreateOrderCommand } from './CreateOrderCommand';
import { CreateOrderHandler } from './CreateOrderHandler';

const MARKET_PRICE = 885.8;
const ENOUGH_CASH = 100_000;
const ENOUGH_SHARES = 100;

describe('CreateOrderHandler', () => {
  let mockRepository: MockProxy<OrderRepository>;
  let SUT: CreateOrderHandler;

  beforeEach(() => {
    mockRepository = mock<OrderRepository>();
    SUT = new CreateOrderHandler(mockRepository);

    mockRepository.userExists.mockResolvedValue(true);
    mockRepository.instrumentExists.mockResolvedValue(true);
    mockRepository.getLatestMarketPrice.mockResolvedValue(MARKET_PRICE);
    mockRepository.getPositionQuantity.mockResolvedValue(ENOUGH_CASH);
    mockRepository.save.mockResolvedValue({ id: 1 });
  });

  // ─── MARKET orders ────────────────────────────────────────────────────────

  describe('MARKET orders', () => {
    it('FILLED: BUY cuando el saldo es suficiente', async () => {
      await SUT.execute(new CreateOrderCommand(1, 34, 'BUY', 'MARKET', 10));

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FILLED',
          side: 'BUY',
          price: expect.objectContaining({ value: MARKET_PRICE }),
          size: expect.objectContaining({ value: 10 }),
        }),
        expect.arrayContaining([
          expect.objectContaining({ instrumentId: 34, delta: 10 }),
          expect.objectContaining({ instrumentId: ARS_INSTRUMENT_ID, delta: -(10 * MARKET_PRICE) }),
        ]),
      );
    });

    it('REJECTED: BUY cuando el saldo es insuficiente', async () => {
      mockRepository.getPositionQuantity.mockResolvedValue(100); // solo 100 ARS, necesita 8858

      await SUT.execute(new CreateOrderCommand(1, 34, 'BUY', 'MARKET', 10));

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'REJECTED' }),
        [], // sin deltas para órdenes rechazadas
      );
    });

    it('FILLED: SELL cuando las acciones son suficientes', async () => {
      mockRepository.getPositionQuantity.mockResolvedValue(ENOUGH_SHARES);

      await SUT.execute(new CreateOrderCommand(1, 34, 'SELL', 'MARKET', 10));

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FILLED',
          side: 'SELL',
          price: expect.objectContaining({ value: MARKET_PRICE }),
        }),
        expect.arrayContaining([
          expect.objectContaining({ instrumentId: 34, delta: -10 }),
          expect.objectContaining({ instrumentId: ARS_INSTRUMENT_ID, delta: 10 * MARKET_PRICE }),
        ]),
      );
    });

    it('REJECTED: SELL cuando las acciones son insuficientes', async () => {
      mockRepository.getPositionQuantity.mockResolvedValue(5); // tiene 5, quiere vender 10

      await SUT.execute(new CreateOrderCommand(1, 34, 'SELL', 'MARKET', 10));

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'REJECTED' }),
        [],
      );
    });

    it('usa el precio de mercado ignorando size cuando se envía amount', async () => {
      // amount: 8858 / 885.8 = floor(10) acciones
      await SUT.execute(new CreateOrderCommand(1, 34, 'BUY', 'MARKET', undefined, 8858));

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          size: expect.objectContaining({ value: 10 }),
          price: expect.objectContaining({ value: MARKET_PRICE }),
        }),
        expect.any(Array),
      );
    });

    it('FILLED: CASH_IN siempre se ejecuta', async () => {
      await SUT.execute(new CreateOrderCommand(1, ARS_INSTRUMENT_ID, 'CASH_IN', 'MARKET', 50000));

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FILLED', side: 'CASH_IN' }),
        expect.arrayContaining([
          expect.objectContaining({ instrumentId: ARS_INSTRUMENT_ID, delta: 50000 }),
        ]),
      );
    });
  });

  // ─── LIMIT orders ─────────────────────────────────────────────────────────

  describe('LIMIT orders', () => {
    it('NEW: BUY LIMIT cuando el saldo es suficiente', async () => {
      await SUT.execute(new CreateOrderCommand(1, 34, 'BUY', 'LIMIT', 10, undefined, 800));

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'NEW',
          type: 'LIMIT',
          price: expect.objectContaining({ value: 800 }),
        }),
        [], // LIMIT no actualiza posiciones hasta que se ejecute
      );
    });

    it('REJECTED: BUY LIMIT cuando el saldo es insuficiente', async () => {
      mockRepository.getPositionQuantity.mockResolvedValue(100); // solo 100 ARS, necesita 8000

      await SUT.execute(new CreateOrderCommand(1, 34, 'BUY', 'LIMIT', 10, undefined, 800));

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'REJECTED' }),
        [],
      );
    });
  });

  // ─── Validaciones ─────────────────────────────────────────────────────────

  describe('validaciones', () => {
    it('error: MARKET con precio enviado', async () => {
      await expect(
        SUT.execute(new CreateOrderCommand(1, 34, 'BUY', 'MARKET', 10, undefined, 800)),
      ).rejects.toThrow(InvalidArgument);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('error: LIMIT sin precio', async () => {
      await expect(
        SUT.execute(new CreateOrderCommand(1, 34, 'BUY', 'LIMIT', 10)),
      ).rejects.toThrow(InvalidArgument);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('error: sin size ni amount', async () => {
      await expect(
        SUT.execute(new CreateOrderCommand(1, 34, 'BUY', 'MARKET')),
      ).rejects.toThrow(InvalidArgument);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('error: sin precio de mercado disponible', async () => {
      mockRepository.getLatestMarketPrice.mockResolvedValue(null);

      await expect(
        SUT.execute(new CreateOrderCommand(1, 34, 'BUY', 'MARKET', 10)),
      ).rejects.toThrow(InvalidArgument);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('error: userId inexistente lanza NotFound', async () => {
      mockRepository.userExists.mockResolvedValue(false);

      await expect(
        SUT.execute(new CreateOrderCommand(999, 34, 'BUY', 'MARKET', 10)),
      ).rejects.toThrow(NotFound);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('error: instrumentId inexistente lanza NotFound', async () => {
      mockRepository.instrumentExists.mockResolvedValue(false);

      await expect(
        SUT.execute(new CreateOrderCommand(1, 999, 'BUY', 'MARKET', 10)),
      ).rejects.toThrow(NotFound);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
