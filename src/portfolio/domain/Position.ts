export class Position {
  constructor(
    readonly instrumentId: number,
    readonly ticker: string,
    readonly name: string,
    readonly quantity: number,
    readonly lastPrice: number,
    readonly marketValue: number,
    readonly dailyReturn: number,
  ) {}

  static fromPrimitives(data: {
    instrumentId: number;
    ticker: string;
    name: string;
    quantity: number;
    lastPrice: number;
    marketValue: number;
    dailyReturn: number;
  }): Position {
    return new Position(
      data.instrumentId,
      data.ticker,
      data.name,
      data.quantity,
      data.lastPrice,
      data.marketValue,
      data.dailyReturn,
    );
  }

  toPrimitives() {
    return {
      instrumentId: this.instrumentId,
      ticker: this.ticker,
      name: this.name,
      quantity: this.quantity,
      lastPrice: this.lastPrice,
      marketValue: this.marketValue,
      dailyReturn: this.dailyReturn,
    };
  }
}
