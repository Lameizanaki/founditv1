"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getDefaultRouteForRole } from "@/lib/auth";
import { toErrorMessage } from "@/lib/api";

export function SignInClient({ nextPath }: { nextPath: string | null }) {
  const router = useRouter();
  const { continueWithGoogle, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const session = await signIn({ email, password });
          router.push(nextPath || getDefaultRouteForRole(session.user.role));
        } catch (submitError) {
          setError(toErrorMessage(submitError));
        }
      })();
    });
  };

  return (
    <section className="min-h-screen bg-[#f8f8f8] px-6 py-8 md:px-10 lg:px-16">
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

        <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-[#f8f8f8] lg:grid-cols-2">
          <div className="flex items-center justify-center px-4 py-6 sm:px-8 md:px-12 lg:px-14">
            <div className="w-full max-w-2xl">
              <h2 className="mb-2 text-[42px] font-bold leading-tight text-gray-900">
                Welcome back
              </h2>
              <p className="mb-8 text-[18px] text-gray-500">Sign in to continue</p>

              <div className="space-y-3">
                <button
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={continueWithGoogle}
                  type="button"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] font-bold text-[#4285F4]">
                    G
                  </span>
                  <span>Continue with Google</span>
                </button>
              </div>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-sm text-gray-400">or use email</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <form className="space-y-5" onSubmit={onSubmit}>
                {error ? (
                  <div className="mb-5 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#dc2626]">
                    {error}
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-600" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f1f1f3] px-4 text-sm outline-none placeholder:text-gray-400 focus:border-[#16a34a] focus:bg-white"
                    id="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-600" htmlFor="password">
                    Password
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f1f1f3] px-4 pr-12 text-sm outline-none placeholder:text-gray-400 focus:border-[#16a34a] focus:bg-white"
                    id="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    type="password"
                    value={password}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                  />
                  <label className="text-sm text-gray-700" htmlFor="rememberMe">
                    Remember me
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    className="h-12 w-full rounded-xl bg-[#08b239] text-sm font-semibold text-white transition hover:bg-[#069d32] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isPending}
                    type="submit"
                  >
                    {isPending ? "Signing in..." : "Sign in"}
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
                <div className="text-center text-gray-400">
                  <Image
                    alt="auth"
                    className="h-full w-full object-contain"
                    height={900}
                    src="/assets/images/auth.png"
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
