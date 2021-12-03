import pino from 'pino';

export type Logger = Pick<pino.Logger, 'info' | 'warn' | 'error' | 'debug'>;

export function getDefaultLogger(): Logger {
  return pino();
}
