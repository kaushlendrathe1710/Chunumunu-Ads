import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import { queryClient } from './api/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useAppDispatch } from './store';
import { setUser } from './store/slices/authSlice';
import { fetchCurrentUser } from '@/api/authApi';
import { ToastContainer } from 'react-toastify';
import React, { Suspense } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

import Auth from './pages/Auth';
import VerifyOtp from './pages/VerifyOtp';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import Wallet from './pages/Wallet';
import Teams from './pages/Teams';
import ManageTeams from './pages/ManageTeams';
import TeamSettings from './pages/TeamSettings';
import TeamCampaigns from './pages/TeamCampaigns';
import TeamAds from './pages/TeamAds';
import TeamAnalytics from './pages/TeamAnalytics';
import CampaignAnalytics from './pages/CampaignAnalytics';
import AdAnalytics from './pages/AdAnalytics';
import Profile from './pages/Profile';

import ProtectedRoute from './components/common/ProtectedRoute';
import { useTheme } from './hooks/useTheme';

function Wrapper() {
  const { currentTheme } = useTheme();
  const dispatch = useAppDispatch();
  useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const user = await fetchCurrentUser();
      if (user) {
        dispatch(
          setUser({
            id: user.id,
            email: user.email,
            username: user.username,
            avatar: user.avatar || null,
            bio: (user as any).bio ?? null,
            isVerified: user.isVerified ?? null,
            role: user.role || 'user',
            // Fill required fields expected by shared User type with sensible defaults
            videostreamproId: (user as any).videostreamproId ?? 0,
            authProvider: (user as any).authProvider ?? 'local',
            createdAt: user.createdAt ? new Date(user.createdAt) : null,
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
          })
        );
      }
      return user;
    },
    staleTime: 60_000,
  });

  return (
    <>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_APP_GOOGLE_CLIENT_ID}>
        <Suspense
          fallback={
            <div className="flex size-10 h-[50%] animate-spin items-center justify-center border-t-primary"></div>
          }
        >
          <Switch>
            <Route path="/auth" component={Auth} />
            <Route path="/verify-otp/:email?" component={VerifyOtp} />
            <ProtectedRoute path="/" component={Home} />
            <ProtectedRoute path="/teams" component={Teams} />
            <ProtectedRoute path="/manage-teams" component={ManageTeams} />
            <ProtectedRoute path="/wallet" component={Wallet} />
            <ProtectedRoute path="/team/settings" component={TeamSettings} />
            <ProtectedRoute path="/team/campaigns" component={TeamCampaigns} />
            <ProtectedRoute path="/team/ads" component={TeamAds} />
            <ProtectedRoute path="/team/analytics" component={TeamAnalytics} />
            <ProtectedRoute
              path="/team/campaigns/:campaignId/analytics"
              component={CampaignAnalytics}
            />
            <ProtectedRoute
              path="/team/campaigns/:campaignId/ads/:adId/analytics"
              component={AdAnalytics}
            />
            <ProtectedRoute path="/profile" component={Profile} />
            <Route path="*" component={NotFound} />
          </Switch>
        </Suspense>
        <ToastContainer theme={currentTheme} />
      </GoogleOAuthProvider>
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Wrapper />
      </QueryClientProvider>
    </Provider>
  );
}
