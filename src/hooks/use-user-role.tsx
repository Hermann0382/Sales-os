/**
 * useUserRole Hook - Role-based permission checks
 * Provides convenient permission checking utilities
 */

import React, { useMemo } from 'react';

import { useUserStore } from '@/stores';
import { UserPermissions, UserRole } from '@/lib/types';

interface UseUserRoleReturn {
  // Current role
  role: UserRole | null;

  // Role checks
  isAdmin: boolean;
  isManager: boolean;
  isAgent: boolean;
  isManagerOrAbove: boolean;

  // Permission checks
  permissions: UserPermissions | null;
  hasPermission: (permission: keyof UserPermissions) => boolean;

  // Specific permission checks
  canManageCalls: boolean;
  canViewAnalytics: boolean;
  canManageTeam: boolean;
  canConfigureSystem: boolean;
  canEditMilestones: boolean;
  canEditObjections: boolean;
  canEditPrompts: boolean;

  // Route access checks
  canAccessAgentRoutes: boolean;
  canAccessManagerRoutes: boolean;
  canAccessAdminRoutes: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { session, permissions, hasPermission } = useUserStore();

  const role = session?.role || null;

  // Role checks
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isAgent = role === 'agent';
  const isManagerOrAbove = isAdmin || isManager;

  // Specific permissions
  const derivedPermissions = useMemo(() => {
    if (!permissions) {
      return {
        canManageCalls: false,
        canViewAnalytics: false,
        canManageTeam: false,
        canConfigureSystem: false,
        canEditMilestones: false,
        canEditObjections: false,
        canEditPrompts: false,
      };
    }

    return {
      canManageCalls: permissions.canManageCalls,
      canViewAnalytics: permissions.canViewAnalytics,
      canManageTeam: permissions.canManageTeam,
      canConfigureSystem: permissions.canConfigureSystem,
      canEditMilestones: permissions.canEditMilestones,
      canEditObjections: permissions.canEditObjections,
      canEditPrompts: permissions.canEditPrompts,
    };
  }, [permissions]);

  // Route access
  const routeAccess = useMemo(() => {
    return {
      canAccessAgentRoutes: isAdmin || isManager || isAgent,
      canAccessManagerRoutes: isAdmin || isManager,
      canAccessAdminRoutes: isAdmin,
    };
  }, [isAdmin, isManager, isAgent]);

  return {
    role,
    isAdmin,
    isManager,
    isAgent,
    isManagerOrAbove,
    permissions,
    hasPermission,
    ...derivedPermissions,
    ...routeAccess,
  };
}

/**
 * Higher-order component for role-based access control
 */
export function withRoleCheck<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: UserRole[]
): React.FC<P> {
  return function RoleCheckedComponent(props: P) {
    const { role } = useUserRole();

    if (!role || !allowedRoles.includes(role)) {
      return null; // Or redirect, or show access denied
    }

    return <WrappedComponent {...props} />;
  };
}
