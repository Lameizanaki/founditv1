import { SignInClient } from "@/components/auth/sign-in-client";

interface SignInPageProps {
  searchParams: Promise<{
    googleSetup?: string | string[];
    next?: string | string[];
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const googleSetupParam = Array.isArray(params.googleSetup)
    ? params.googleSetup[0]
    : params.googleSetup ?? null;
  const googleSetupComplete =
    googleSetupParam === "1" || googleSetupParam === "true";
  const nextPath = Array.isArray(params.next) ? params.next[0] : params.next ?? null;

  return (
    <SignInClient
      googleSetupComplete={googleSetupComplete}
      nextPath={nextPath}
    />
  );
}
