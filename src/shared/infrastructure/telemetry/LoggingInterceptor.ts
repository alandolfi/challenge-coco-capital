import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { TelemetryService } from './TelemetryService';

/**
 * LoggingInterceptor — intercepta todos los requests HTTP.
 *
 * Registra método, ruta, status y duración en:
 * - Logger de NestJS (stdout / logs del contenedor)
 * - New Relic como custom event `HttpRequest` (si está configurado)
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly telemetry: TelemetryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          this.logger.log(`${method} ${url} ${res.statusCode} — ${duration}ms`);
          this.telemetry.recordEvent('HttpRequest', {
            method,
            url,
            statusCode: res.statusCode,
            durationMs: duration,
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - start;
          this.logger.error(`${method} ${url} ERROR — ${duration}ms: ${error.message}`);
          this.telemetry.noticeError(error, { method, url, durationMs: duration });
        },
      }),
    );
  }
}
