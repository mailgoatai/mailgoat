export type MailGoatErrorType =
  | 'UsageError'
  | 'ConfigError'
  | 'NetworkError'
  | 'AuthError'
  | 'RateLimitError'
  | 'ServerError'
  | 'ApiError';

export class MailGoatError extends Error {
  constructor(
    message: string,
    public readonly type: MailGoatErrorType,
    public readonly exitCode: number,
    public readonly requestId?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'MailGoatError';
  }
}

export function inferExitCode(error: unknown, defaultCode: number = 1): number {
  if (error instanceof MailGoatError) {
    return error.exitCode;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('config') || msg.includes('api key') || msg.includes('fromaddress')) {
      return 2;
    }
    if (
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('connect') ||
      msg.includes('enotfound') ||
      msg.includes('econnrefused')
    ) {
      return 3;
    }
    if (msg.includes('postal') || msg.includes('authentication') || msg.includes('rate limit')) {
      return 4;
    }
  }

  return defaultCode;
}
