import React from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Permission } from '@shared/types';

interface PermissionGateProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission } = useTeam();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RoleGateProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const { userRole } = useTeam();

  if (userRole && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
