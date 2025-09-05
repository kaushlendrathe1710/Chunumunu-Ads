import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { ToastContainer } from 'react-toastify';
import React, { Suspense } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

const Auth = React.lazy(() => import('./pages/Auth'));
const VerifyOtp = React.lazy(() => import('./pages/VerifyOtp'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Home = React.lazy(() => import('./pages/Home'));
import ProtectedRoute from './components/common/ProtectedRoute';

import { AuthProvider } from './contexts/AuthContext';
import Upload from './pages/Upload';
import Ads from './pages/Ads';

function App() {
  return (
    <GoogleOAuthProvider clientId="681506937135-ojr4q8i7ebhgq7s1tfnfpoq1g72j34rk.apps.googleusercontent.com">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="flex size-10 h-[50%] animate-spin items-center justify-center border-t-primary"></div>
            }
          >
            <Switch>
              <Route path="/auth" component={Auth} />
              <Route path="/verify-otp/:email?" component={VerifyOtp} />
              <ProtectedRoute path="/" component={Home} />
              <ProtectedRoute path="/upload" component={Upload} />
              <ProtectedRoute path="/ads" component={Ads} />
              <Route path="*" component={NotFound} />
            </Switch>
          </Suspense>
        </AuthProvider>
        <ToastContainer />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
