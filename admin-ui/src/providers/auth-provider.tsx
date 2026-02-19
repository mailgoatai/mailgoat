import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { api, ApiClientError } from '../lib/api';
import { AuthContext } from '../features/auth/context/auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async (silent = false) => {
    try {
      await api.status();
      setIsAuthenticated(true);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setIsAuthenticated(false);
      } else if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Session check failed');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (password: string) => {
    await api.login(password);
    setIsAuthenticated(true);
    toast.success('Logged in');
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setIsAuthenticated(false);
    toast.success('Logged out');
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, login, logout, refreshSession }),
    [isAuthenticated, isLoading, login, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
