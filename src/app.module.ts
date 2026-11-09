import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PostgresTypeormClient } from './shared/infrastructure/persistence/typeorm/PostgresTypeormClient';
import { InstrumentModule } from './instrument/infrastructure/instrument.module';
import { OrderModule } from './order/infrastructure/order.module';
import { PortfolioModule } from './portfolio/infrastructure/portfolio.module';
import { TelemetryModule } from './shared/infrastructure/telemetry/telemetry.module';
import { AllExceptionsFilter } from './shared/infrastructure/all-exceptions.filter';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [TelemetryModule, InstrumentModule, OrderModule, PortfolioModule, PostgresTypeormClient.create()],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}
