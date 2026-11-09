import { Global, Module } from '@nestjs/common';
import { LoggingInterceptor } from './LoggingInterceptor';
import { TelemetryService } from './TelemetryService';

/**
 * TelemetryModule — módulo global que provee TelemetryService y LoggingInterceptor
 * a toda la aplicación sin necesidad de importarlo en cada módulo.
 */
@Global()
@Module({
  providers: [TelemetryService, LoggingInterceptor],
  exports: [TelemetryService, LoggingInterceptor],
})
export class TelemetryModule {}
