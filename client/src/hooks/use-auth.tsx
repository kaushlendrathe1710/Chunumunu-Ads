import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

// Directly export the hook from the context to avoid Fast Refresh issues
export const useAuth = useAuthContext;

export function useRequireAuth() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, isLoading]);

  return { user, isAuthenticated, isLoading };
}

export function useRedirectAuthenticated() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only attempt redirection when we have confirmed authentication status and are not loading
    if (!isLoading) {
      if (isAuthenticated) {
        console.log('Redirecting authenticated user:', user);

        // Add a small delay to ensure state updates have propagated
        setTimeout(() => {
          console.log('Redirecting user to /');
          setLocation('/');
        }, 100);
      }
    }
  }, [isAuthenticated, isLoading, user]);

  return { user, isAuthenticated, isLoading };
}
