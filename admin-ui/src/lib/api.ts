import type { ApiResponse } from './types';
import type { LoginResponse, LogoutResponse } from '../features/auth/types/auth.types';
import type { StatusResponse } from '../features/dashboard/types/status.types';

type RequestInterceptor = (
  input: RequestInfo | URL,
  init: RequestInit
) => Promise<[RequestInfo | URL, RequestInit]>;
type ResponseInterceptor = (response: Response) => Promise<Response>;

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status: number, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

class ApiClient {
  private readonly requestInterceptors: RequestInterceptor[] = [];
  private readonly responseInterceptors: ResponseInterceptor[] = [];

  constructor() {
    this.addRequestInterceptor(async (input, init) => {
      return [input, { ...init, credentials: 'include' }];
    });

    this.addResponseInterceptor(async (response) => response);
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  async request<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
    let currentInput = input;
    let currentInit = init;

    for (const interceptor of this.requestInterceptors) {
      [currentInput, currentInit] = await interceptor(currentInput, currentInit);
    }

    const response = await fetch(currentInput, currentInit);

    let currentResponse = response;
    for (const interceptor of this.responseInterceptors) {
      currentResponse = await interceptor(currentResponse);
    }

    const payload = (await currentResponse.json().catch(() => ({
      ok: false,
      error: { code: 'PARSE_ERROR', message: 'Invalid JSON response' },
    }))) as ApiResponse<T>;

    if (!currentResponse.ok || !payload.ok) {
      throw new ApiClientError(
        payload.error?.message || 'Request failed',
        currentResponse.status,
        payload.error?.code || 'REQUEST_FAILED'
      );
    }

    if (!payload.data) {
      throw new ApiClientError('Response missing data', currentResponse.status, 'EMPTY_DATA');
    }

    return payload.data;
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

const client = new ApiClient();

export const api = {
  login: (password: string) => client.post<LoginResponse['data']>('/admin/login', { password }),
  logout: () => client.post<LogoutResponse['data']>('/admin/logout'),
  status: () => client.get<StatusResponse['data']>('/api/admin/status'),
};
