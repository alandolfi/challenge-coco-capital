import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InstrumentRepository } from 'src/instrument/domain/InstrumentRepository';
import { SearchInstrumentsQuery } from './SearchInstrumentsQuery';

@QueryHandler(SearchInstrumentsQuery)
export class SearchInstrumentsHandler implements IQueryHandler<SearchInstrumentsQuery> {
  constructor(private readonly repository: InstrumentRepository) {}

  async execute(query: SearchInstrumentsQuery): Promise<Record<string, unknown>[]> {
    const instruments = await this.repository.search(query.search);
    return instruments.map((instrument) => instrument.toPrimitives());
  }
}
