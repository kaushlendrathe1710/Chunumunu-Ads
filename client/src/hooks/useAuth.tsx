import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchMe,
  sendOtp as sendOtpAction,
  verifyOtp as verifyOtpAction,
  logout as logoutAction,
  setUser as setUserAction,
  updateUser as updateUserAction,
} from '@/store/slices/authSlice';
import { useLocation } from 'wouter';
import { toast } from 'react-toastify';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, error } = useAppSelector((state) => state.auth);
  const [, setLocation] = useLocation();

  // Fetch user on mount if we have a token but no user
  useEffect(() => {
    const hasToken = !!localStorage.getItem('auth_token');
    if (hasToken && !user && !loading) {
      dispatch(fetchMe());
    }
  }, [dispatch, user, loading]);

  const sendOtp = async (email: string) => {
    try {
      await dispatch(sendOtpAction(email)).unwrap();
      toast.success('OTP has been sent to your email');
    } catch (error: any) {
      toast.error(error || 'Failed to send OTP');
      throw error;
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const result = await dispatch(verifyOtpAction({ email, code })).unwrap();

      // Show success toast after a delay for better UX
      const showSuccessToast = () => {
        toast.success("You've been successfully logged in");
      };

      // Redirect based on user role
      if (result.user?.isAdmin) {
        setLocation('/admin');
        setTimeout(showSuccessToast, 500);
      } else {
        setLocation('/');
        setTimeout(showSuccessToast, 500);
      }
    } catch (error: any) {
      toast.error(error || 'Failed to verify OTP');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await dispatch(logoutAction()).unwrap();
      setLocation('/');
      toast.success("You've been successfully logged out");
    } catch (error: any) {
      // Even if logout fails, we still navigate away
      setLocation('/');
      toast.error(error || 'Failed to logout');
    }
  };

  const updateUser = (updatedUser: any) => {
    // If we don't have a user yet (fresh login flow), set the full user
    if (!user) {
      dispatch(setUserAction(updatedUser));
    } else {
      // Otherwise merge updates into existing user
      dispatch(updateUserAction(updatedUser));
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading: loading,
    error,
    sendOtp,
    verifyOtp,
    logout,
    updateUser,
    logoutMutation: { mutate: logout, isPending: loading }, // For backward compatibility
  };
};

export function useRequireAuth() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, isLoading, setLocation]);

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
  }, [isAuthenticated, isLoading, user, setLocation]);

  return { user, isAuthenticated, isLoading };
}
