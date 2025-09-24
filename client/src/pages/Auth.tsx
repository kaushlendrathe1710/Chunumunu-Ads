import { useEffect } from 'react';
import { useRedirectAuthenticated } from '@/hooks/useAuth';
import { SSOLogin } from '@/components/auth/SSOLogin';
import { Card, CardContent } from '@/components/ui/card';
import logo from '@client/public/logo.svg';

export default function Auth() {
  const { isAuthenticated, isLoading } = useRedirectAuthenticated();

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* App Logo and Title */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logo} alt="Logo" className="h-16 w-16" />
          <h1 className="mt-4 text-3xl font-bold">ChunuMunu Ads</h1>
          <p className="mt-2 text-muted-foreground">
            Streamlined advertising platform
          </p>
        </div>

        {/* Auth Card */}
        <Card className="bg-card shadow-lg">
          <CardContent className="p-8">
            <SSOLogin isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Terms */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to ChunuMunu's{' '}
            <a href="#" className="underline hover:text-primary">Terms of Service</a>{' '}
            and{' '}
            <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
