import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, Mail, Shield } from 'lucide-react';
import { useLocation } from 'wouter';

interface SSOLoginProps {
  isLoading?: boolean;
}

export function SSOLogin({ isLoading = false }: SSOLoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [, setLocation] = useLocation();

  const VIDEOSTREAMPRO_URL = import.meta.env.VITE_VIDEOSTREAMPRO_URL || 'http://localhost:5000';

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const apiKey = import.meta.env.VITE_VIDEOSTREAMPRO_API_KEY!; // In production, get from env

      // Call VideoStreamPro directly with API key in body, query, and header
      const response = await fetch(`${VIDEOSTREAMPRO_URL}/api/auth/send-otp?apiKey=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          email,
          apiKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'OTP sent successfully to your email');

        // Store email for verify page
        localStorage.setItem('verifyEmail', email);

        // Redirect to verify OTP page immediately
        setLocation(`/verify-otp?email=${encodeURIComponent(email)}`);
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
      console.error('Send OTP error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Sign in with VideoStreamPro</h2>
        <p className="mt-2 text-muted-foreground">
          Enter your email to receive a verification code
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <form onSubmit={handleSendOTP} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              disabled={loading || isLoading}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading || isLoading || !email}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending OTP...
            </>
          ) : (
            'Send Verification Code'
          )}
        </Button>
      </form>
    </div>
  );
}
