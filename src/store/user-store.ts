import { create } from "zustand";

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type Subscription = {
  tier: string;
  creditsRemaining: number;
  creditsTotal: number;
};

type UserStoreState = {
  user: User | null;
  subscription: Subscription | null;
  isLoaded: boolean;
};

type UserStoreActions = {
  setUser: (user: User) => void;
  setSubscription: (subscription: Subscription) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserStoreState & UserStoreActions>()(
  (set) => ({
    user: null,
    subscription: null,
    isLoaded: false,

    setUser: (user) => set({ user, isLoaded: true }),

    setSubscription: (subscription) => set({ subscription }),

    clearUser: () => set({ user: null, subscription: null, isLoaded: false }),
  })
);
