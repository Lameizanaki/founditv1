const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const readEnv = (value: string | undefined, fallback: string) => {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }

  return stripTrailingSlash(normalized);
};

export const appConfig = {
  apiBaseUrl: readEnv(process.env.NEXT_PUBLIC_API_BASE_URL, "http://localhost:8085"),
  isGoogleAuthEnabled: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
  webSocketUrl: readEnv(process.env.NEXT_PUBLIC_WS_BASE_URL, "http://localhost:8085/ws"),
};
