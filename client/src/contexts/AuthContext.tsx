import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient, getAuthToken, setAuthToken } from '@/api/queryClient';
import { useLocation } from 'wouter';
import { toast } from 'react-toastify';
import { User } from '@shared/types';

// Define this interface to match the expected API response structure
interface AuthResponse {
  user: User;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
  logoutMutation: any; // Add this property for Admin component
}

// Using imported utility functions from queryClient.ts for token management

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [, setLocation] = useLocation();

  // Try to get initial authentication state from localStorage
  const getInitialAuthState = (): boolean => {
    try {
      return !!(localStorage.getItem('current_user') && localStorage.getItem('auth_token'));
    } catch (e) {
      return false;
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getInitialAuthState());

  const {
    data: userData,
    isLoading,
    refetch,
  } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/me'],
    retry: 1, // Reduce retry count for faster experience
    refetchOnWindowFocus: false, // Don't refetch when window gets focus for faster login experience
    refetchOnMount: true,
    refetchOnReconnect: false, // Don't refetch on reconnect for faster login
    staleTime: 1000 * 60 * 30, // Cache valid for 30 minutes
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    throwOnError: false,
    refetchInterval: 1000 * 60 * 30, // Refresh every 30 minutes to keep session alive
  });

  // Refresh auth state when component mounts
  useEffect(() => {
    // Always attempt to fetch user data on mount, regardless of token
    // This allows session cookie authentication to work even if localStorage was cleared
    refetch();
  }, [refetch]);

  // Handle successful auth state
  useEffect(() => {
    if (userData?.user) {
      localStorage.setItem('current_user', JSON.stringify(userData.user));
      setIsAuthenticated(true);
    }
  }, [userData]);

  // Handle auth error - but don't clear localStorage immediately after login
  useEffect(() => {
    const handleError = () => {
      // Only clear state if we have no user data AND we're not loading AND there's no token
      const hasToken = !!localStorage.getItem('auth_token');
      if (!userData?.user && !isLoading && !hasToken) {
        localStorage.removeItem('current_user');
        setIsAuthenticated(false);
      }
    };

    // Check on initial load and whenever loading/userData changes
    handleError();
  }, [userData, isLoading]);

  // Use data from server if available, otherwise try localStorage
  const getUser = (): User | null => {
    if (userData?.user) {
      return userData.user;
    }

    try {
      const storedUser = localStorage.getItem('current_user');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (e) {
      // Invalid JSON in localStorage
      localStorage.removeItem('current_user');
    }

    return null;
  };

  const user = getUser();

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest('POST', '/api/auth/send-otp', { email });
    },
    onSuccess: () => {
      toast.success('OTP has been sent to your email');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to send OTP');
    },
  });

  // Verify OTP mutation - optimized for speed
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const response = await apiRequest('POST', '/api/auth/verify-otp', {
        email,
        code,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Store user in local storage for backup redirection mechanism
      localStorage.setItem('current_user', JSON.stringify(data.user));

      // Store the JWT token for authentication
      if (data.token) {
        setAuthToken(data.token);
      }

      // Immediately update the user data in the query cache - this avoids a refetch
      queryClient.setQueryData(['/api/auth/me'], { user: data.user });
      setIsAuthenticated(true);

      // Skip the refetch since we already have the data
      // refetch(); - removed for performance

      // Don't show the toast until after redirection for better UX
      const showSuccessToast = () => {
        toast.success("You've been successfully logged in");
      };

      // Programmatically redirect based on user role
      if (data.user.isAdmin) {
        setLocation('/admin');
        // The toast will be shown on the admin page after navigation
        setTimeout(showSuccessToast, 500);
      } else {
        setLocation('/');
        // The toast will be shown on the dashboard after navigation
        setTimeout(showSuccessToast, 500);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to verify OTP');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout', {});
    },
    onSuccess: () => {
      // Remove user and token from local storage
      localStorage.removeItem('current_user');
      setAuthToken(null);

      setIsAuthenticated(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      // Redirect to the home page using wouter
      setLocation('/');

      toast.success("You've been successfully logged out");
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to logout');
    },
  });

  const sendOtp = async (email: string) => {
    await sendOtpMutation.mutateAsync(email);
  };

  const verifyOtp = async (email: string, code: string) => {
    await verifyOtpMutation.mutateAsync({ email, code });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const updateUser = (newUser: User) => {
    try {
      localStorage.setItem('current_user', JSON.stringify(newUser));
      queryClient.setQueryData(['/api/auth/me'], { user: newUser });
    } catch (error) {
      console.error('Failed to update user in context:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || sendOtpMutation.isPending || verifyOtpMutation.isPending,
        sendOtp,
        verifyOtp,
        logout,
        isAuthenticated,
        logoutMutation, // Add the logoutMutation for Admin component
        updateUser, // Add the updateUser function to context
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
