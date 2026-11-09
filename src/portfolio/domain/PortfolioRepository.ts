import { Portfolio } from './Portfolio';

export abstract class PortfolioRepository {
  abstract userExists(userId: number): Promise<boolean>;
  abstract getByUserId(userId: number): Promise<Portfolio>;
}
