type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const sensitiveKeys = [
  'authorization',
  'cookie',
  'password',
  'passwordHash',
  'token',
  'jwt',
  'secret',
  'apiKey',
  'OPENAI_API_KEY',
];

export function sanitizeForLog(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(process.env.NODE_ENV === 'production' ? {} : { stack: value.stack }),
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForLog);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as LogContext).map(([key, entry]) => {
      const isSensitive = sensitiveKeys.some(
        (sensitiveKey) => sensitiveKey.toLowerCase() === key.toLowerCase(),
      );

      return [key, isSensitive ? '[REDACTED]' : sanitizeForLog(entry)];
    }),
  );
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  const sanitizedContext = sanitizeForLog(context) as LogContext;
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...sanitizedContext,
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
};
