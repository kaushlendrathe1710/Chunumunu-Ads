import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useState, useEffect } from 'react';
import { useRedirectAuthenticated } from '@/hooks/useAuth';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'react-toastify';
import logo from '@client/public/logo.svg';
import { Button } from '@/components/ui/button';

export default function VerifyOtp() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ email?: string }>('/verify-otp/:email?');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(600); // 10 minutes
  const [email, setEmail] = useState<string>('');
  const { verifyOtp, sendOtp, isLoading, isAuthenticated } = useAuth();
  const { isLoading: authLoading, isAuthenticated: isAlreadyAuth } = useRedirectAuthenticated();

  useEffect(() => {
    // Try to get email from route params first, then localStorage
    const emailFromParams = params?.email ? decodeURIComponent(params.email) : null;
    const emailFromStorage = localStorage.getItem('auth_email');

    if (emailFromParams) {
      setEmail(emailFromParams);
      localStorage.setItem('auth_email', emailFromParams);
    } else if (emailFromStorage) {
      setEmail(emailFromStorage);
    } else {
      // If no email found, redirect to login
      setLocation('/auth');
      toast.error('Session Expired. Please sign in again.');
    }
  }, [params, setLocation, toast]);

  // Set document title
  useEffect(() => {
    document.title = 'Verify OTP - ChunuMunu';
    return () => {
      document.title = 'ChunuMunu';
    };
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Format countdown time as MM:SS
  const formatCountdown = () => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code sent to your email');
      return;
    }

    try {
      await verifyOtp(email, otp);

      // Clean up
      localStorage.removeItem('auth_email');

      // Force redirect based on user role since the hook might not trigger in time
      // We'll check in 300ms if redirection happened
      setTimeout(() => {
        const currentUser = JSON.parse(localStorage.getItem('current_user') || 'null');
        if (currentUser) {
          setLocation('/');
        }
      }, 300);
    } catch (error) {
      console.error('Failed to verify OTP:', error);
    }
  };

  const handleResendOtp = async () => {
    try {
      await sendOtp(email);

      // Reset countdown
      setCountdown(600);

      toast.success('A new verification code has been sent to your email');
    } catch (error) {
      console.error('Failed to resend OTP:', error);
    }
  };

  const handleChangeEmail = () => {
    localStorage.removeItem('auth_email');
    setLocation('/auth');
  };

  if (authLoading || isAlreadyAuth) {
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
            <h1 className="mt-2 text-2xl font-bold">Verify your email</h1>
            <p className="mt-1 text-muted-foreground">We've sent a 6-digit code to {email}</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="flex justify-center">
              <OtpInput value={otp} onChange={setOtp} />
            </div>

            <div className="flex justify-between text-sm">
              <Button
                variant="link"
                className="text-primary"
                onClick={handleResendOtp}
                disabled={countdown > 0 || isLoading}
              >
                {countdown > 0 ? `Resend in ${formatCountdown()}` : 'Resend code'}
              </Button>
              <p>{countdown > 0 ? `Valid for ${formatCountdown()}` : 'Expired'}</p>
            </div>

            <Button
              type="submit"
              className="w-full rounded-lg bg-primary py-2 font-medium text-foreground disabled:opacity-50"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleChangeEmail}
              disabled={isLoading}
            >
              Change email
            </Button>
          </form>

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

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function OtpInput({ value, onChange }: OtpInputProps) {
  return (
    <InputOTP maxLength={6} value={value} onChange={onChange} pattern="[0-9]*">
      <InputOTPGroup>
        <InputOTPSlot index={0} className="size-12" />
        <InputOTPSlot index={1} className="size-12" />
        <InputOTPSeparator />
        <InputOTPSlot index={2} className="size-12" />
        <InputOTPSlot index={3} className="size-12" />
        <InputOTPSeparator />
        <InputOTPSlot index={4} className="size-12" />
        <InputOTPSlot index={5} className="size-12" />
      </InputOTPGroup>
    </InputOTP>
  );
}
