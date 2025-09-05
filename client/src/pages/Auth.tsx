import { useEffect } from 'react';
import { setAuthToken } from '@/api/queryClient';
import { useRedirectAuthenticated } from '@/hooks/use-auth';
import EmailAuthForm from '@/components/auth/EmailAuthForm';
import GoogleSignIn from '@/components/auth/GoogleSignIn';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'wouter';
import logo from '@client/public/logo.svg';
import { useAuth } from '@/hooks/use-auth';

export default function Auth() {
  const { isAuthenticated, isLoading } = useRedirectAuthenticated();

  const [location, setLocation] = useLocation();

  // Set document title
  useEffect(() => {
    document.title = 'Sign in - ChunuMunu';
    return () => {
      document.title = 'ChunuMunu';
    };
  }, []);

  // Don't check localStorage here - let useRedirectAuthenticated handle all redirects
  // This prevents conflicting redirect logic that causes infinite loops

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-primary dark:border-gray-800"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-4 w-full max-w-md bg-white dark:bg-gray-800">
        <CardContent className="px-8 pb-8 pt-6">
          <div className="mb-6 flex flex-col items-center text-center">
            {/* <i className="ri-video-fill text-primary text-4xl"></i> */}
            <img src={logo} alt="Logo" className="h-10 w-10" />
            <h1 className="mt-2 text-2xl font-bold">Sign in to ChunuMunu</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Choose your sign-in method</p>
          </div>

          <div className="space-y-4">
            <GoogleSignIn />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
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
