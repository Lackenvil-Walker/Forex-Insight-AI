import React from 'react';
import { useAuth as useAuthHook } from '@/hooks/useAuth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  const authData = useAuthHook();
  
  const user = authData.user ? {
    ...authData.user,
    name: `${authData.user.firstName || ''} ${authData.user.lastName || ''}`.trim() || 'User',
  } : null;
  
  return {
    ...authData,
    user,
    isAdmin: authData.isAdmin,
    isGuest: authData.isGuest,
    login: authData.login,
    logout: authData.logout,
  };
}