import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { InvalidArgument } from '../domain/exceptions/InvalidArgument';
import { NotFound } from '../domain/exceptions/NotFound';
import { TelemetryService } from './telemetry/TelemetryService';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly telemetry: TelemetryService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ url: string; method: string }>();

    const { status, message } = this.resolve(exception);

    if (status >= 500) {
      this.telemetry.noticeError(exception instanceof Error ? exception : new Error(String(exception)), {
        url: request.url,
        method: request.method,
        statusCode: status,
      });
    }

    httpAdapter.reply(
      ctx.getResponse(),
      {
        statusCode: status,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }

  private resolve(exception: unknown): { status: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && 'message' in response
          ? (response as { message: string | string[] }).message
          : exception.message;
      return { status: exception.getStatus(), message };
    }

    if (exception instanceof NotFound) {
      return { status: HttpStatus.NOT_FOUND, message: exception.message };
    }

    if (exception instanceof InvalidArgument) {
      return { status: HttpStatus.BAD_REQUEST, message: exception.message };
    }

    if (exception instanceof Error) {
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: exception.message };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
