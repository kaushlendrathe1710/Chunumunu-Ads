import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { setAuthToken } from '@/api/queryClient';
import { apiClient } from '@/api/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-toastify';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useLocation();
  const { updateUser } = useAuth();

  // Get email from URL params or localStorage  
  const email = (() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('email') || localStorage.getItem('sso_email') || '';
    }
    return '';
  })();

  const VIDEOSTREAMPRO_URL = import.meta.env.VITE_VIDEOSTREAMPRO_URL || 'http://localhost:5000';
  const API_KEY = import.meta.env.VITE_VIDEOSTREAMPRO_API_KEY!; // In production, this would be handled securely

  useEffect(() => {
    document.title = 'Verify OTP - ChunuMunu Ads';
    
    // If no email, redirect back to auth
    if (!email) {
      setLocation('/auth');
    }

    return () => {
      document.title = 'ChunuMunu Ads';
    };
  }, [email, setLocation]);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsVerifying(true);

    try {
      const API_KEY = import.meta.env.VITE_VIDEOSTREAMPRO_API_KEY;
      const BASE_URL = import.meta.env.VITE_VIDEOSTREAMPRO_BASE_URL;

      if (!API_KEY || !BASE_URL) {
        throw new Error('VideoStreamPro configuration missing');
      }

      // Step 1: Verify OTP with VideoStreamPro
      const otpResponse = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: otp,
          apiKey: API_KEY,
        }),
      });

      const otpData = await otpResponse.json();

      if (!otpData.success || !otpData.verificationToken) {
        throw new Error(otpData.message || 'Invalid OTP code');
      }

      // Step 2: Send the short-lived token to our server for verification
      const verifyResult = await apiClient.post('/auth/sso/verify-token', {
        verificationToken: otpData.verificationToken,
      });

      // Step 3: Store the JWT token and update user state
      if (verifyResult.data.token && verifyResult.data.user) {
        setAuthToken(verifyResult.data.token);
        localStorage.removeItem('sso_email'); // Clean up
        
        updateUser(verifyResult.data.user);
        toast.success('Successfully signed in!');
        
        // Redirect to dashboard
        setLocation('/');
      } else {
        throw new Error('Invalid response from server');
      }

    } catch (error: any) {
      console.error('Verify OTP error:', error);
      setError(error.message || 'Verification failed. Please try again.');
      toast.error(error.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError('');

    try {
      const response = await fetch(`${VIDEOSTREAMPRO_URL}/api/auth/send-otp?apiKey=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          email,
          apiKey: API_KEY,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('OTP resent successfully!');
        setOtp(''); // Clear current OTP
      } else {
        throw new Error(data.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      setError(error.message || 'Failed to resend OTP');
      toast.error(error.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToEmail = () => {
    localStorage.removeItem('sso_email');
    setLocation('/auth');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Enter Verification Code</CardTitle>
          <CardDescription>
            We've sent a 6-digit code to <span className="font-medium">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                value={otp}
                onChange={setOtp}
                maxLength={6}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSeparator />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSeparator />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={handleVerifyOtp}
              className="w-full"
              disabled={isVerifying || otp.length !== 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Sign In'
              )}
            </Button>

            <div className="flex flex-col space-y-2">
              <Button
                variant="outline"
                onClick={handleResendOtp}
                disabled={resendLoading || isVerifying}
                className="w-full"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  'Resend Code'
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={handleBackToEmail}
                disabled={isVerifying}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Email
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Didn't receive the code? Check your spam folder or try resending.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
