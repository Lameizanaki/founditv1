export type AppRole = "CLIENT" | "FREELANCER" | "ADMIN";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface JwtClaims {
  sub?: string;
  exp?: number;
  iss?: string;
  authorities?: unknown;
}

export interface SessionUser {
  email: string | null;
  role: AppRole | null;
  authorities: string[];
  expiresAt: number | null;
}

export interface AuthSession {
  token: string;
  user: SessionUser;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  username: string;
  email: string;
  password: string;
  role: AppRole;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterResponse {
  email: string;
  username: string;
  Role: AppRole;
}
