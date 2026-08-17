import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const isBun = typeof process.versions.bun === 'string';

/**
 * VDOMake logger. Bun-safe: the pino worker `transport` (used for
 * pino-pretty) is unsupported under Bun, so pretty output is provided via a
 * `pino-pretty` destination stream instead, which both runtimes support.
 * Production logs are plain JSON with a service tag.
 */
export function createLogger(options: { level?: string; name?: string } = {}): pino.Logger {
  const level = options.level ?? process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug');

  if (isProd || isBun) {
    return pino({ level, name: options.name, base: { service: 'vdomake' } });
  }

  // Node dev: pipe through pino-pretty as a stream (not the worker transport).
  const pretty = require('pino-pretty') as (opts?: Record<string, unknown>) => import('node:stream').Writable;
  const stream = pretty({
    colorize: true,
    translateTime: 'HH:MM:ss',
    ignore: 'pid,hostname',
  });
  return pino({ level, name: options.name, base: { service: 'vdomake' } }, stream);
}

export const logger = createLogger();

export function childLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}
