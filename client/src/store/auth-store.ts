import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  API_URL,
  type AuthResponse,
  type AuthUser,
  parseApiError,
} from "../lib/api";

const AUTH_REQUEST_TIMEOUT_MS = 10_000;

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput extends LoginInput {
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  initialized: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  acceptToken: (token: string) => Promise<void>;
  initialize: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      initialized: false,
      async login(input) {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const session = (await response.json()) as AuthResponse;
        setAuthenticatedSession(set, session);
      },
      async register(input) {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const session = (await response.json()) as AuthResponse;
        setAuthenticatedSession(set, session);
      },
      async acceptToken(token) {
        const response = await fetchWithTimeout(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const body = (await response.json()) as { user: AuthUser };
        set({
          user: body.user,
          token,
          isAuthenticated: true,
          initialized: true,
        });
      },
      async initialize() {
        const { token } = get();

        try {
          if (token) {
            try {
              await get().acceptToken(token);
              return;
            } catch {
              // Fall through to refresh-cookie recovery.
            }
          }

          const refreshed = await get().refreshSession();

          if (!refreshed) {
            setLoggedOutSession(set);
          }
        } catch {
          // A failed startup request must still finish initialization;
          // otherwise the router remains trapped on its loading screen.
          setLoggedOutSession(set);
        }
      },
      async refreshSession() {
        try {
          const response = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (!response.ok) {
            return false;
          }

          const session = (await response.json()) as AuthResponse;
          setAuthenticatedSession(set, session);
          return true;
        } catch {
          return false;
        }
      },
      async logout() {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
          });
        } finally {
          setLoggedOutSession(set);
        }
      },
    }),
    {
      name: "devmind-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

function setAuthenticatedSession(
  set: (
    partial:
      | AuthState
      | Partial<AuthState>
      | ((state: AuthState) => AuthState | Partial<AuthState>),
    replace?: false,
  ) => void,
  session: AuthResponse,
) {
  set({
    user: session.user,
    token: session.accessToken,
    isAuthenticated: true,
    initialized: true,
  });
}

function setLoggedOutSession(
  set: (
    partial:
      | AuthState
      | Partial<AuthState>
      | ((state: AuthState) => AuthState | Partial<AuthState>),
    replace?: false,
  ) => void,
) {
  set({
    user: null,
    token: null,
    isAuthenticated: false,
    initialized: true,
  });
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = AUTH_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}
