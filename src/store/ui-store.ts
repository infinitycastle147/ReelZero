import { create } from "zustand";

type Notification = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};

type UIStoreState = {
  isSidebarOpen: boolean;
  activeModal: string | null;
  notifications: Notification[];
};

type UIStoreActions = {
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
};

export const useUIStore = create<UIStoreState & UIStoreActions>()((set) => ({
  isSidebarOpen: false,
  activeModal: null,
  notifications: [],

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  openModal: (id) => set({ activeModal: id }),

  closeModal: () => set({ activeModal: null }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
