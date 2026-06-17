import { GoogleCallbackClient } from "@/components/auth/google-callback-client";

interface GoogleCallbackPageProps {
  searchParams: Promise<{
    setupRole?: string | string[];
    token?: string | string[];
  }>;
}

export default async function GoogleCallbackPage({
  searchParams,
}: GoogleCallbackPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token ?? null;
  const setupRoleParam = Array.isArray(params.setupRole) ? params.setupRole[0] : params.setupRole ?? null;
  const setupRole = setupRoleParam === "true" || setupRoleParam === "1";

  return <GoogleCallbackClient setupRole={setupRole} token={token} />;
}
