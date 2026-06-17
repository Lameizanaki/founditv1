"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleIcon } from "@/components/auth/google-icon";
import { useAuth } from "@/components/providers/auth-provider";
import { getDefaultRouteForRole } from "@/lib/auth";
import { toErrorMessage } from "@/lib/api";

export function SignInClient({
  googleSetupComplete,
  nextPath,
}: {
  googleSetupComplete: boolean;
  nextPath: string | null;
}) {
  const router = useRouter();
  const { continueWithGoogle, isGoogleAuthEnabled, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await signIn({ email, password });
      router.push(nextPath || getDefaultRouteForRole(session.user.role));
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleContinue = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await continueWithGoogle();
    } catch (submitError) {
      setError(toErrorMessage(submitError));
      setIsGoogleLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-8 md:px-10 lg:px-16">
      <div className="mx-auto w-full">
        <div className="mb-3 flex justify-center">
          <div className="flex h-16 w-32 items-center">
            <Image
              alt="FOUNDIT"
              className="h-full w-full object-contain"
              height={64}
              priority
              src="/assets/images/logo.png"
              width={128}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-slate-50 lg:grid-cols-2">
          <div className="flex items-center justify-center px-4 py-6 sm:px-8 md:px-12 lg:px-14">
            <div className="w-full max-w-2xl">
              <h2 className="mb-2 text-[42px] font-bold leading-tight text-gray-900">
                Welcome back
              </h2>
              <p className="mb-8 text-[18px] text-gray-500">Sign in to continue</p>

              {googleSetupComplete ? (
                <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium leading-6 text-green-800">
                  Your Google account is ready. Continue with Google once more to enter your dashboard with the role you selected.
                </div>
              ) : null}

              {isGoogleAuthEnabled ? (
                <div className="space-y-3">
                  <button
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    disabled={isSubmitting || isGoogleLoading}
                    onClick={() => void handleGoogleContinue()}
                    type="button"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center">
                      <GoogleIcon />
                    </span>
                    <span>{isGoogleLoading ? "Redirecting..." : "Continue with Google"}</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Google sign-in is unavailable in this deployment. Use email and password instead.
                </div>
              )}

              {isGoogleAuthEnabled ? (
                <div className="my-7 flex items-center gap-4">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-sm text-gray-400">or use email</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
              ) : (
                <div className="my-7 flex items-center gap-4">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-sm text-gray-400">email sign in</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
              )}

              <form className="space-y-5" onSubmit={onSubmit}>
                {error ? (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {error}
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-600" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-transparent bg-slate-100 px-4 text-sm outline-none placeholder:text-gray-400 focus:border-green-600 focus:bg-white"
                    id="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                    disabled={isSubmitting || isGoogleLoading}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-600" htmlFor="password">
                    Password
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-transparent bg-slate-100 px-4 pr-12 text-sm outline-none placeholder:text-gray-400 focus:border-green-600 focus:bg-white"
                    id="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    type="password"
                    value={password}
                    disabled={isSubmitting || isGoogleLoading}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    disabled={isSubmitting || isGoogleLoading}
                  />
                  <label className="text-sm text-gray-700" htmlFor="rememberMe">
                    Remember me
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    className="h-12 w-full rounded-xl bg-green-600 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isSubmitting || isGoogleLoading}
                    type="submit"
                  >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                  </button>
                </div>

                <p className="pt-2 text-center text-sm text-gray-500">
                  New here?{" "}
                  <Link className="font-medium text-blue-500 hover:underline" href="/auth/sign-up">
                    Create account
                  </Link>
                </p>
              </form>
            </div>
          </div>

          <div className="hidden lg:flex lg:border-l lg:border-gray-200">
            <div className="flex w-full items-center justify-center p-8">
              <div className="flex h-full w-full items-center justify-center bg-transparent">
                <div className="flex h-full w-full items-center justify-center">
                  <Image
                    alt="Mobile login illustration"
                    className="h-[min(72vh,760px)] w-full max-w-[760px] object-contain"
                    height={900}
                    src="/assets/images/auth-mobile-login.svg"
                    width={900}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
