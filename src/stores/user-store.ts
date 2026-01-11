/**
 * User Store - Zustand store for user session and authentication state
 * Manages user context, permissions, and preferences
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import {
  Language,
  UserPermissions,
  UserRole,
  UserSession,
  getRolePermissions,
} from '@/lib/types';

interface UserStore {
  // State
  session: UserSession | null;
  permissions: UserPermissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSession: (session: UserSession) => void;
  clearSession: () => void;
  updateLanguagePreference: (language: Language) => void;

  // Permission checks
  hasPermission: (permission: keyof UserPermissions) => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isAgent: () => boolean;

  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        session: null,
        permissions: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Actions
        setSession: (session) => {
          const permissions = getRolePermissions(session.role);
          set({
            session,
            permissions,
            isAuthenticated: true,
            error: null,
          });
        },

        clearSession: () => {
          set({
            session: null,
            permissions: null,
            isAuthenticated: false,
          });
        },

        updateLanguagePreference: (language) => {
          const { session } = get();
          if (session) {
            set({
              session: {
                ...session,
                languagePreference: language,
              },
            });
          }
        },

        // Permission checks
        hasPermission: (permission) => {
          const { permissions } = get();
          return permissions ? permissions[permission] : false;
        },

        isAdmin: () => {
          const { session } = get();
          return session?.role === 'admin';
        },

        isManager: () => {
          const { session } = get();
          return session?.role === 'manager' || session?.role === 'admin';
        },

        isAgent: () => {
          const { session } = get();
          return session?.role === 'agent';
        },

        // State management
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'callos-user-store',
        partialize: (state) => ({
          session: state.session,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'UserStore' }
  )
);
