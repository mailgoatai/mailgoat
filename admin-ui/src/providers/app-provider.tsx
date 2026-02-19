import type { ReactNode } from 'react';
import { AuthProvider } from './auth-provider';

export function AppProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
