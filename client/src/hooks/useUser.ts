import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  name: string | null;
  oddsName: string | null;
  setName: (name: string) => void;
  clear: () => void;
}

export const useUser = create<UserState>()(
  persist(
    (set) => ({
      name: null,
      oddsName: null,
      setName: (name: string) => set({ name, oddsName: name }),
      clear: () => set({ name: null, oddsName: null }),
    }),
    { name: "socialboule-user" }
  )
);
