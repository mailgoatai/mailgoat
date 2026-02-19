import type { ApiResponse } from '../../../lib/types';

export type SessionUser = {
  role: 'admin';
  sessionType: 'secure-cookie';
};

export type LoginResponse = ApiResponse<{ authenticated: boolean }>;

export type LogoutResponse = ApiResponse<{ loggedOut: boolean }>;

export type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: (silent?: boolean) => Promise<void>;
};
