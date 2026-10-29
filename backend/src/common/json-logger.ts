import type { LoggerService } from '@nestjs/common';

type NivelLog = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

interface EntradaLog {
  time: string;
  level: NivelLog;
  context?: string;
  message: unknown;
  trace?: string;
}

/**
 * Logger que escribe una línea JSON por evento a stdout.
 * Se activa en producción para que App Runner / CloudWatch pueda parsear los logs.
 */
export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.escribir('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.escribir('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.escribir('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.escribir('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.escribir('verbose', message, context);
  }

  fatal(message: unknown, context?: string): void {
    this.escribir('fatal', message, context);
  }

  private escribir(
    level: NivelLog,
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const entrada: EntradaLog = {
      time: new Date().toISOString(),
      level,
      context,
      message: this.normalizar(message),
      trace,
    };

    process.stdout.write(`${JSON.stringify(entrada)}\n`);
  }

  private normalizar(message: unknown): unknown {
    if (message instanceof Error) {
      return { name: message.name, message: message.message, stack: message.stack };
    }

    return message;
  }
}
