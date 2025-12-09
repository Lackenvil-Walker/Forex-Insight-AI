import React from 'react';
import { useAuth as useAuthHook } from '@/hooks/useAuth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return useAuthHook();
}