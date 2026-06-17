"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { apiRequest } from "@/lib/api";
import {
  isSessionExpired,
  parseSessionFromToken,
  readStoredToken,
  writeStoredToken,
  clearStoredToken,
} from "@/lib/auth";
import { appConfig } from "@/lib/config";
import type {
  AuthSession,
  AuthStatus,
  LoginResponse,
  RegisterResponse,
  SignInPayload,
  SignUpPayload,
} from "@/types/auth";

interface AuthContextValue {
  isGoogleAuthEnabled: boolean;
  status: AuthStatus;
  session: AuthSession | null;
  signIn: (payload: SignInPayload) => Promise<AuthSession>;
  signUp: (payload: SignUpPayload) => Promise<RegisterResponse>;
  acceptGoogleToken: (token: string) => AuthSession;
  signOut: () => void;
  continueWithGoogle: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const tokenListeners = new Set<() => void>();

const notifyTokenListeners = () => {
  tokenListeners.forEach((listener) => listener());
};

const subscribeToTokenStore = (listener: () => void) => {
  tokenListeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === "foundit.auth.token") {
      listener();
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    tokenListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

const subscribeToHydration = () => () => undefined;

const getValidSession = (token: string | null) => {
  if (!token) {
    return null;
  }

  const session = parseSessionFromToken(token);
  if (!session || isSessionExpired(session)) {
    return null;
  }

  return session;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const token = useSyncExternalStore(
    subscribeToTokenStore,
    readStoredToken,
    () => null,
  );

  const session = getValidSession(token);
  const status: AuthStatus = !isHydrated
    ? "loading"
    : session
      ? "authenticated"
      : "unauthenticated";

  const signIn = async (payload: SignInPayload) => {
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
    });

    const nextSession = parseSessionFromToken(response.token);
    if (!nextSession) {
      throw new Error("The server returned an unreadable session token.");
    }

    writeStoredToken(response.token);
    notifyTokenListeners();
    return nextSession;
  };

  const signUp = async (payload: SignUpPayload) =>
    apiRequest<RegisterResponse>("/auth/register", {
      method: "POST",
      body: {
        username: payload.username,
        email: payload.email,
        password: payload.password,
        role: payload.role,
      },
    });

  const acceptGoogleToken = (token: string) => {
    const nextSession = parseSessionFromToken(token);
    if (!nextSession) {
      throw new Error("Google login returned an invalid token.");
    }

    writeStoredToken(token);
    notifyTokenListeners();
    return nextSession;
  };

  const signOut = () => {
    clearStoredToken();
    notifyTokenListeners();
  };

  const continueWithGoogle = () => {
    if (!appConfig.isGoogleAuthEnabled) {
      throw new Error("Google sign-in is not configured for this environment.");
    }
    window.location.href = `${appConfig.apiBaseUrl}/oauth2/authorization/google`;
  };

  const value: AuthContextValue = {
    isGoogleAuthEnabled: appConfig.isGoogleAuthEnabled,
    status,
    session,
    signIn,
    signUp,
    acceptGoogleToken,
    signOut,
    continueWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
};
