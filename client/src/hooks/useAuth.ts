import { create } from "zustand";
import { persist } from "zustand/middleware";
import { auth, setToken, clearToken, type User } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,

      login: async (email, password) => {
        const response = await auth.login({ email, password });
        setToken(response.token);
        set({ user: response.user, token: response.token });
      },

      register: async (email, password, firstName, lastName) => {
        const response = await auth.register({
          email,
          password,
          firstName,
          lastName,
        });
        setToken(response.token);
        set({ user: response.user, token: response.token });
      },

      logout: () => {
        clearToken();
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          setToken(token);
          const user = await auth.getUser();
          set({ user, isLoading: false });
        } catch {
          clearToken();
          set({ user: null, token: null, isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
