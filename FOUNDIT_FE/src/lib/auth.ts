import { AuthSession, type AppRole, type JwtClaims } from "@/types/auth";

const TOKEN_STORAGE_KEY = "foundit.auth.token";

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return window.atob(padded);
  }

  return Buffer.from(padded, "base64").toString("binary");
};

const decodeUnicode = (value: string) =>
  decodeURIComponent(
    value
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join(""),
  );

export const parseJwtClaims = (token: string): JwtClaims | null => {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(decodeUnicode(decodeBase64Url(payload))) as JwtClaims;
  } catch {
    return null;
  }
};

export const getAuthorities = (claims: JwtClaims | null): string[] => {
  if (!claims?.authorities || !Array.isArray(claims.authorities)) {
    return [];
  }

  return claims.authorities.filter((value): value is string => typeof value === "string");
};

export const deriveRoleFromAuthorities = (authorities: string[]): AppRole | null => {
  if (authorities.includes("ROLE_ADMIN")) {
    return "ADMIN";
  }

  if (authorities.includes("ROLE_FREELANCER")) {
    return "FREELANCER";
  }

  if (authorities.includes("ROLE_CLIENT")) {
    return "CLIENT";
  }

  return null;
};

export const parseSessionFromToken = (token: string): AuthSession | null => {
  const claims = parseJwtClaims(token);
  if (!claims) {
    return null;
  }

  const authorities = getAuthorities(claims);

  return {
    token,
    user: {
      email: typeof claims.sub === "string" ? claims.sub : null,
      role: deriveRoleFromAuthorities(authorities),
      authorities,
      expiresAt: typeof claims.exp === "number" ? claims.exp : null,
    },
  };
};

export const isSessionExpired = (session: AuthSession | null) => {
  if (!session?.user.expiresAt) {
    return false;
  }

  return session.user.expiresAt * 1000 <= Date.now();
};

export const readStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const writeStoredToken = (token: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearStoredToken = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const getDefaultRouteForRole = (role: AppRole | null) => {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "FREELANCER":
      return "/freelancer/dashboard";
    case "CLIENT":
      return "/client/dashboard";
    default:
      return "/";
  }
};

export const roleLabel = (role: AppRole | null) => {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "FREELANCER":
      return "Freelancer";
    case "CLIENT":
      return "Client";
    default:
      return "Guest";
  }
};

export const hasRequiredRole = (
  currentRole: AppRole | null,
  requiredRole: AppRole | AppRole[],
) => {
  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return currentRole !== null && allowed.includes(currentRole);
};
