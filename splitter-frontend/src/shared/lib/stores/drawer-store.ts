// src/shared/lib/stores/drawer-store.ts
import { create } from "zustand";

interface DrawerStore {
  isOpen: boolean;
  /** Route queued to navigate to once the drawer finishes closing. */
  pendingRoute: string | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Close the drawer and queue navigation to run after the close animation. */
  navigateTo: (path: string) => void;
  clearPendingRoute: () => void;
}

export const useDrawerStore = create<DrawerStore>((set) => ({
  isOpen: false,
  pendingRoute: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  navigateTo: (path) => set({ pendingRoute: path, isOpen: false }),
  clearPendingRoute: () => set({ pendingRoute: null }),
}));
