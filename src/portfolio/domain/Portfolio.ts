import { Position } from './Position';

export class Portfolio {
  constructor(
    readonly userId: number,
    readonly availableCash: number,
    readonly positions: Position[],
  ) {}

  get totalValue(): number {
    const stocksValue = this.positions.reduce((sum, p) => sum + p.marketValue, 0);
    return parseFloat((this.availableCash + stocksValue).toFixed(2));
  }

  toPrimitives() {
    return {
      totalValue: this.totalValue,
      availableCash: this.availableCash,
      positions: this.positions.map((p) => p.toPrimitives()),
    };
  }
}
