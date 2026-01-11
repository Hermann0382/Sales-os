/**
 * User domain types
 * ENT-002: Sales agent, manager, or admin user
 */

import { BaseEntity, Language, UserRole } from './common';

export interface User extends BaseEntity {
  organizationId: string;
  email: string;
  name: string | null;
  role: UserRole;
  languagePreference: Language;
  clerkId: string | null;
}

export interface CreateUserInput {
  organizationId: string;
  email: string;
  name?: string;
  role?: UserRole;
  languagePreference?: Language;
  clerkId?: string;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  languagePreference?: Language;
}

// User session context
export interface UserSession {
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
  name: string | null;
  languagePreference: Language;
}

// Permission checks
export interface UserPermissions {
  canManageCalls: boolean;
  canViewAnalytics: boolean;
  canManageTeam: boolean;
  canConfigureSystem: boolean;
  canEditMilestones: boolean;
  canEditObjections: boolean;
  canEditPrompts: boolean;
}

export function getRolePermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'admin':
      return {
        canManageCalls: true,
        canViewAnalytics: true,
        canManageTeam: true,
        canConfigureSystem: true,
        canEditMilestones: true,
        canEditObjections: true,
        canEditPrompts: true,
      };
    case 'manager':
      return {
        canManageCalls: true,
        canViewAnalytics: true,
        canManageTeam: true,
        canConfigureSystem: false,
        canEditMilestones: false,
        canEditObjections: false,
        canEditPrompts: false,
      };
    case 'agent':
    default:
      return {
        canManageCalls: true,
        canViewAnalytics: false,
        canManageTeam: false,
        canConfigureSystem: false,
        canEditMilestones: false,
        canEditObjections: false,
        canEditPrompts: false,
      };
  }
}
