import React from 'react';
import { Route, useLocation } from 'wouter';
import { useAuth } from '@client/src/contexts/AuthContext';
import DashboardLayout from '../layout/DashboardLayout';

type ProtectedRouteProps = {
  path: string;
  component?: React.ComponentType<any>;
};

// Renders a route only when the user is authenticated.
// If not authenticated, redirects to /auth.
const ProtectedRoute = ({ path, component: Component }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        // Show spinner while loading AND the user is not authenticated yet.
        if (isLoading && !isAuthenticated) {
          return <div className="flex size-10 h-[50%] animate-spin items-center justify-center" />;
        }

        return (
          <DashboardLayout>
            <Guard isAuth={!!isAuthenticated} component={Component} />
          </DashboardLayout>
        );
      }}
    </Route>
  );
};

const Guard = ({
  isAuth,
  component: Component,
}: {
  isAuth: boolean;
  component?: React.ComponentType<any>;
}) => {
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isAuth) setLocation('/auth');
  }, [isAuth, setLocation]);

  if (!isAuth) return null;
  return Component ? <Component /> : null;
};

export default ProtectedRoute;
