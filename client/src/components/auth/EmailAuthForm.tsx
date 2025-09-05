import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-toastify';
import { useLocation } from 'wouter';
import { Button } from '../ui/button';

export default function EmailAuthForm() {
  const [email, setEmail] = useState('');
  const [, setLocation] = useLocation();
  const { sendOtp, isLoading } = useAuth();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      // Store email in localStorage to access it on the verify page
      localStorage.setItem('auth_email', email);

      // Send OTP
      const res = await sendOtp(email);

      // Redirect to verification page
      setLocation(`/verify-otp/${encodeURIComponent(email)}`);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      // @ts-ignore
      toast.error(error?.message || 'Failed to send OTP. Please try again.');
    }
  };

  return (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3EA6FF] dark:border-gray-700 dark:bg-gray-900"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <Button
        type="submit"
        className="w-full rounded-lg bg-[#3EA6FF] py-2 font-medium text-white disabled:opacity-50"
        disabled={isLoading || !email}
      >
        {isLoading ? 'Sending...' : 'Continue'}
      </Button>
    </form>
  );
}
