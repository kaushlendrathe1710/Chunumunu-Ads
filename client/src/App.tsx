import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import { queryClient } from './api/queryClient';
import { ToastContainer } from 'react-toastify';
import React, { Suspense } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

const Auth = React.lazy(() => import('./pages/Auth'));
const VerifyOtp = React.lazy(() => import('./pages/VerifyOtp'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Home = React.lazy(() => import('./pages/Home'));
const Wallet = React.lazy(() => import('./pages/Wallet'));
import ProtectedRoute from './components/common/ProtectedRoute';

import { AuthProvider } from './contexts/AuthContext';
import { TeamProvider } from './contexts/TeamContext';
const TeamMembers = React.lazy(() => import('./pages/TeamMembers'));
const TeamCampaigns = React.lazy(() => import('./pages/TeamCampaigns'));
const TeamAds = React.lazy(() => import('./pages/TeamAds'));
const TeamAnalytics = React.lazy(() => import('./pages/TeamAnalytics'));

function App() {
  return (
    <Provider store={store}>
      <GoogleOAuthProvider clientId="681506937135-ojr4q8i7ebhgq7s1tfnfpoq1g72j34rk.apps.googleusercontent.com">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TeamProvider>
              <Suspense
                fallback={
                  <div className="flex size-10 h-[50%] animate-spin items-center justify-center border-t-primary"></div>
                }
              >
                <Switch>
                  <Route path="/auth" component={Auth} />
                  <Route path="/verify-otp/:email?" component={VerifyOtp} />
                  <ProtectedRoute path="/" component={Home} />
                  <ProtectedRoute path="/wallet" component={Wallet} />
                  <ProtectedRoute path="/team/members" component={TeamMembers} />
                  <ProtectedRoute path="/team/campaigns" component={TeamCampaigns} />
                  <ProtectedRoute path="/team/ads" component={TeamAds} />
                  <ProtectedRoute path="/team/analytics" component={TeamAnalytics} />
                  <Route path="*" component={NotFound} />
                </Switch>
              </Suspense>
            </TeamProvider>
          </AuthProvider>
          <ToastContainer />
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </Provider>
  );
}

export default App;
