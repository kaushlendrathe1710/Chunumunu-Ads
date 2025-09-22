import { useEffect } from 'react';
import { setAuthToken } from '@/api/queryClient';
import { useRedirectAuthenticated } from '@/hooks/useAuth';
import EmailAuthForm from '@/components/auth/EmailAuthForm';
import GoogleSignIn from '@/components/auth/GoogleSignIn';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'wouter';
import logo from '@client/public/logo.svg';
import { useAuth } from '@/hooks/useAuth';

export default function Auth() {
  const { isAuthenticated, isLoading } = useRedirectAuthenticated();

  const [location, setLocation] = useLocation();

  // Set document title
  useEffect(() => {
    document.title = 'Sign in - ChunuMunu Ads';
    return () => {
      document.title = 'ChunuMunu Ads';
    };
  }, []);

  // Don't check localStorage here - let useRedirectAuthenticated handle all redirects
  // This prevents conflicting redirect logic that causes infinite loops

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-border border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-4 w-full max-w-md bg-card">
        <CardContent className="px-8 pb-8 pt-6">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={logo} alt="Logo" className="h-10 w-10" />
            <h1 className="mt-2 text-2xl font-bold">Sign in to ChunuMunu Ads</h1>
            <p className="mt-1 text-muted-foreground">Choose your sign-in method</p>
          </div>

          <div className="space-y-4">
            <GoogleSignIn />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-gray-500 dark:text-gray-400">
                  Or continue with email
                </span>
              </div>
            </div>

            <EmailAuthForm />
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              By continuing, you agree to ChunuMunu's Terms of Service and Privacy Policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
