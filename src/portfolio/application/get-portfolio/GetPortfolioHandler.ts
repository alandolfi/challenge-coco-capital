import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFound } from 'src/shared/domain/exceptions/NotFound';
import { PortfolioRepository } from 'src/portfolio/domain/PortfolioRepository';
import { GetPortfolioQuery } from './GetPortfolioQuery';

@QueryHandler(GetPortfolioQuery)
export class GetPortfolioHandler implements IQueryHandler<GetPortfolioQuery> {
  constructor(private readonly repository: PortfolioRepository) {}

  async execute(query: GetPortfolioQuery): Promise<Record<string, unknown>> {
    if (!(await this.repository.userExists(query.userId))) {
      throw new NotFound('Usuario', query.userId);
    }
    const portfolio = await this.repository.getByUserId(query.userId);
    return portfolio.toPrimitives();
  }
}
