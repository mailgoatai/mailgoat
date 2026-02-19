export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: ApiError;
};
