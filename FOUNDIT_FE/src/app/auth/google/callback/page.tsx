import { GoogleCallbackClient } from "@/components/auth/google-callback-client";

interface GoogleCallbackPageProps {
  searchParams: Promise<{
    token?: string | string[];
  }>;
}

export default async function GoogleCallbackPage({
  searchParams,
}: GoogleCallbackPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token ?? null;

  return <GoogleCallbackClient token={token} />;
}
