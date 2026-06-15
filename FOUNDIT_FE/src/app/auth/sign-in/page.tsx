import { SignInClient } from "@/components/auth/sign-in-client";

interface SignInPageProps {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = Array.isArray(params.next) ? params.next[0] : params.next ?? null;

  return <SignInClient nextPath={nextPath} />;
}
