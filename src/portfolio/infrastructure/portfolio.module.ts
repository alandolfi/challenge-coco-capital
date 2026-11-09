import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GetPortfolioHandler } from '../application/get-portfolio/GetPortfolioHandler';
import { PortfolioRepository } from '../domain/PortfolioRepository';
import { PortfolioController } from './portfolio.controller';
import { TypeOrmPortfolioRepository } from './persistence/TypeOrmPortfolioRepository';

@Module({
  imports: [CqrsModule],
  controllers: [PortfolioController],
  providers: [
    { provide: PortfolioRepository, useClass: TypeOrmPortfolioRepository },
    GetPortfolioHandler,
  ],
})
export class PortfolioModule {}
