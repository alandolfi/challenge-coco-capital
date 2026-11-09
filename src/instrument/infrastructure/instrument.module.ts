import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SearchInstrumentsHandler } from '../application/search-instruments/SearchInstrumentsHandler';
import { InstrumentRepository } from '../domain/InstrumentRepository';
import { InstrumentController } from './instrument.controller';
import { TypeOrmInstrumentRepository } from './persistence/TypeOrmInstrumentRepository';

@Module({
  imports: [CqrsModule],
  controllers: [InstrumentController],
  providers: [
    { provide: InstrumentRepository, useClass: TypeOrmInstrumentRepository },
    SearchInstrumentsHandler,
  ],
})
export class InstrumentModule {}
