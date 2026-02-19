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

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

export function formatUserError(error: unknown): string {
  const message = messageFromError(error);
  const lower = message.toLowerCase();

  if (lower.includes('config file not found') || lower.includes('enoent')) {
    return (
      'Not configured yet.\n' +
      'Run: mailgoat config init\n' +
      'This creates ~/.mailgoat/config.json with your Postal credentials.'
    );
  }

  if (lower.includes('econnrefused')) {
    return (
      'Cannot connect to Postal server.\n' +
      'Check that:\n' +
      '- The server is running\n' +
      '- The server URL in config is correct\n' +
      '- Firewalls/proxies allow the connection'
    );
  }

  if (lower.includes('enotfound')) {
    return (
      'DNS lookup failed for the Postal server hostname.\n' +
      'Check the server URL and DNS resolution, then try again.'
    );
  }

  if (
    lower.includes('etimedout') ||
    lower.includes('econnaborted') ||
    lower.includes('timed out')
  ) {
    return (
      'Request timed out after 30s.\n' +
      'Check your network connection and server responsiveness.\n' +
      'Try: mailgoat health'
    );
  }

  if (
    lower.includes('401') ||
    lower.includes('unauthorized') ||
    lower.includes('invalid api key') ||
    lower.includes('authentication failed')
  ) {
    return 'Invalid API key.\nRun: mailgoat config init';
  }

  if (lower.includes('403') || lower.includes('forbidden')) {
    return (
      'Access forbidden by Postal.\n' + 'Your API key does not have permission for this operation.'
    );
  }

  if (lower.includes('404') || lower.includes('not found') || lower.includes('message not found')) {
    return 'Requested resource was not found.\nCheck IDs/paths and try again.';
  }

  if (lower.includes('500') || lower.includes('internal server error')) {
    return (
      'Postal server encountered an internal error.\n' +
      'Try again in a few minutes or run: mailgoat health'
    );
  }

  if (lower.includes('no response from postal server') || lower.includes('network')) {
    return (
      'Network error while contacting Postal.\n' + 'Check connectivity and server URL, then retry.'
    );
  }

  return message;
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
