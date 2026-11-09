import { Instrument } from './Instrument';

export abstract class InstrumentRepository {
  abstract search(query: string): Promise<Instrument[]>;
}
