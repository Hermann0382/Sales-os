/**
 * useAuth Hook - Clerk authentication wrapper
 * Provides unified interface for authentication operations
 */

import { useCallback, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';

import { useUserStore } from '@/stores';
import { Language, UserRole, UserSession } from '@/lib/types';

interface UseAuthReturn {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserSession | null;
  error: string | null;

  // Clerk state
  clerkUserId: string | null;
  clerkUser: ReturnType<typeof useUser>['user'];

  // Actions
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateLanguage: (language: Language) => void;

  // Checks
  isAdmin: boolean;
  isManager: boolean;
  isAgent: boolean;
}

export function useAuth(): UseAuthReturn {
  const { isLoaded, isSignedIn, userId, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();

  const {
    session,
    isAuthenticated,
    isLoading,
    error,
    setSession,
    clearSession,
    updateLanguagePreference,
    isAdmin,
    isManager,
    isAgent,
    setLoading,
    setError,
  } = useUserStore();

  // Sync Clerk user with our store by fetching from database
  useEffect(() => {
    if (!isLoaded || !userLoaded) {
      setLoading(true);
      return;
    }

    if (isSignedIn && clerkUser) {
      // Fetch user from our database (creates if not exists)
      setLoading(true);
      fetch('/api/users/me')
        .then((res) => res.json())
        .then((result) => {
          if (result.data) {
            const userSession: UserSession = {
              userId: result.data.id,
              organizationId: result.data.organizationId,
              role: result.data.role as UserRole,
              email: result.data.email,
              name: result.data.name,
              languagePreference: 'EN',
            };
            setSession(userSession);
          } else {
            setError('Failed to load user');
          }
        })
        .catch((err) => {
          console.error('Failed to fetch user:', err);
          setError('Failed to load user');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
      clearSession();
    }
  }, [isLoaded, userLoaded, isSignedIn, clerkUser, userId, setSession, clearSession, setLoading, setError]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await clerkSignOut();
      clearSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  }, [clerkSignOut, clearSession, setLoading, setError]);

  // Refresh session from server
  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      // In production, this would refetch user data from your API
      // const response = await fetch('/api/auth/me');
      // const userData = await response.json();
      // setSession(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh session');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Update language preference
  const updateLanguage = useCallback(
    (language: Language) => {
      updateLanguagePreference(language);
      // In production, this would also update the user's preference in the database
    },
    [updateLanguagePreference]
  );

  return {
    isAuthenticated: isAuthenticated && !!isSignedIn,
    isLoading: isLoading || !isLoaded || !userLoaded,
    user: session,
    error,
    clerkUserId: userId ?? null,
    clerkUser,
    signOut,
    refreshSession,
    updateLanguage,
    isAdmin: isAdmin(),
    isManager: isManager(),
    isAgent: isAgent(),
  };
}
