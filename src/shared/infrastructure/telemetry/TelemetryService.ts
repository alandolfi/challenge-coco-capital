import { Injectable, Logger } from '@nestjs/common';

/**
 * TelemetryService — abstracción sobre New Relic.
 *
 * Centraliza toda interacción con el agente de APM. Si New Relic no está
 * configurado (sin LICENSE_KEY), los métodos son no-ops silenciosos, por lo
 * que la app funciona igual en entornos locales sin credenciales.
 */
@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly nr: any;

  constructor() {
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      try {
        this.nr = require('newrelic');
        this.logger.log('New Relic agent initialized');
      } catch {
        this.logger.warn('New Relic package not found — telemetry disabled');
      }
    } else {
      this.logger.warn('NEW_RELIC_LICENSE_KEY not set — telemetry disabled');
    }
  }

  /**
   * Registra un evento personalizado en New Relic Insights.
   * Ejemplo: recordEvent('OrderCreated', { userId: 1, side: 'BUY' })
   */
  recordEvent(eventType: string, attributes: Record<string, string | number | boolean>): void {
    this.nr?.recordCustomEvent(eventType, attributes);
  }

  /**
   * Agrega un atributo a la transacción HTTP actual.
   * Útil para enriquecer los traces con contexto de negocio.
   */
  addAttribute(key: string, value: string | number | boolean): void {
    this.nr?.addCustomAttribute(key, value);
  }

  /**
   * Reporta un error a New Relic con contexto adicional.
   */
  noticeError(error: Error, attributes?: Record<string, string | number>): void {
    if (this.nr) {
      this.nr.noticeError(error, attributes);
    } else {
      this.logger.error(error.message, error.stack);
    }
  }
}
