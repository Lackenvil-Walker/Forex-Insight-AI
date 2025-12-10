import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

const GUEST_USER_ID = "guest-user";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const isGuest = user?.id === GUEST_USER_ID;
  const isAuthenticated = !!user && !isGuest;
  const isAdmin = user?.role === 'admin';

  return {
    user,
    isLoading,
    isAuthenticated,
    isGuest,
    isAdmin,
    login: () => window.location.href = '/api/login',
    logout: () => window.location.href = '/api/logout',
  };
}
