export type InstrumentType = 'ACCIONES' | 'MONEDA';

export class Instrument {
  constructor(
    readonly id: number,
    readonly ticker: string,
    readonly name: string,
    readonly type: InstrumentType,
    readonly lastPrice: number | null,
    readonly dailyReturn: number | null,
  ) {}

  static fromPrimitives(data: {
    id: number;
    ticker: string;
    name: string;
    type: string;
    lastPrice?: number | null;
    dailyReturn?: number | null;
  }): Instrument {
    return new Instrument(
      data.id,
      data.ticker,
      data.name,
      data.type as InstrumentType,
      data.lastPrice ?? null,
      data.dailyReturn ?? null,
    );
  }

  toPrimitives() {
    return {
      id: this.id,
      ticker: this.ticker,
      name: this.name,
      type: this.type,
      lastPrice: this.lastPrice,
      dailyReturn: this.dailyReturn,
    };
  }
}
