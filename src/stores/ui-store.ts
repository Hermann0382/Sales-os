/**
 * UI Store - Zustand store for UI state management
 * Manages notifications, modals, sidebar, and general UI state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Modal types
export interface Modal {
  id: string;
  type: string;
  props?: Record<string, unknown>;
}

interface UIStore {
  // Sidebar state
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;

  // Notifications
  notifications: Notification[];

  // Modals
  modals: Modal[];
  activeModalId: string | null;

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;

  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebarCollapse: () => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Modal actions
  openModal: (type: string, props?: Record<string, unknown>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  // Loading actions
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Reset
  reset: () => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      isSidebarOpen: true,
      isSidebarCollapsed: false,
      notifications: [],
      modals: [],
      activeModalId: null,
      globalLoading: false,
      loadingMessage: null,

      // Sidebar actions
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

      toggleSidebarCollapse: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

      // Notification actions
      addNotification: (notification) => {
        const id = crypto.randomUUID();
        const duration = notification.duration ?? 5000;

        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id },
          ],
        }));

        // Auto-remove after duration
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, duration);
        }

        return id;
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      // Modal actions
      openModal: (type, props) => {
        const id = crypto.randomUUID();
        set((state) => ({
          modals: [...state.modals, { id, type, props }],
          activeModalId: id,
        }));
        return id;
      },

      closeModal: (id) =>
        set((state) => {
          const remainingModals = state.modals.filter((m) => m.id !== id);
          return {
            modals: remainingModals,
            activeModalId:
              remainingModals.length > 0
                ? remainingModals[remainingModals.length - 1].id
                : null,
          };
        }),

      closeAllModals: () =>
        set({
          modals: [],
          activeModalId: null,
        }),

      // Loading actions
      setGlobalLoading: (loading, message) =>
        set({
          globalLoading: loading,
          loadingMessage: message || null,
        }),

      // Reset
      reset: () =>
        set({
          isSidebarOpen: true,
          isSidebarCollapsed: false,
          notifications: [],
          modals: [],
          activeModalId: null,
          globalLoading: false,
          loadingMessage: null,
        }),
    }),
    { name: 'UIStore' }
  )
);

// Helper hooks for common patterns
export const useNotifications = () => {
  const { addNotification, removeNotification, clearNotifications } =
    useUIStore();

  return {
    success: (title: string, message?: string) =>
      addNotification({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      addNotification({ type: 'error', title, message, duration: 0 }),
    warning: (title: string, message?: string) =>
      addNotification({ type: 'warning', title, message }),
    info: (title: string, message?: string) =>
      addNotification({ type: 'info', title, message }),
    remove: removeNotification,
    clear: clearNotifications,
  };
};
