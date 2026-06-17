"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { toErrorMessage } from "@/lib/api";
import type { AppRole } from "@/types/auth";

const roles: Array<Exclude<AppRole, "ADMIN">> = ["CLIENT", "FREELANCER"];

export default function SignUpPage() {
  const router = useRouter();
  const { continueWithGoogle, isGoogleAuthEnabled, signUp } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "CLIENT" as Exclude<AppRole, "ADMIN">,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    setIsSubmitting(true);
    try {
      await signUp(form);
      setSuccess("Account created. You can sign in with the new credentials now.");
      router.push("/auth/sign-in");
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleContinue = async () => {
    setError(null);
    setSuccess(null);
    setIsGoogleLoading(true);
    try {
      await continueWithGoogle();
    } catch (submitError) {
      setError(toErrorMessage(submitError));
      setIsGoogleLoading(false);
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex items-start justify-center px-2 pt-8 md:px-6 lg:px-4 xl:px-8">
            <div className="w-full max-w-2xl">
              <h1 className="text-[42px] font-bold leading-tight text-[#1b1b1b]">
                Create an account
              </h1>
              <p className="mt-2 text-[18px] text-[#7b7b7b]">Sign Up With FoundIT</p>

              {isGoogleAuthEnabled ? (
                <>
                  <div className="mt-8 space-y-3">
                    <button
                      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#e3e3e3] bg-white text-[14px] font-medium text-[#222] transition hover:bg-gray-50"
                      disabled={isSubmitting || isGoogleLoading}
                      onClick={() => void handleGoogleContinue()}
                      type="button"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] font-bold text-[#4285F4]">
                        G
                      </span>
                      <span>{isGoogleLoading ? "Redirecting..." : "Continue with Google"}</span>
                    </button>
                  </div>

                  <div className="my-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-[#e5e5e5]" />
                    <span className="text-[13px] text-[#8a8a8a]">or use email</span>
                    <div className="h-px flex-1 bg-[#e5e5e5]" />
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-8 rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-[14px] text-[#1d4ed8]">
                    Google sign-up is unavailable in this deployment. Create your account with email instead.
                  </div>
                  <div className="my-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-[#e5e5e5]" />
                    <span className="text-[13px] text-[#8a8a8a]">email sign up</span>
                    <div className="h-px flex-1 bg-[#e5e5e5]" />
                  </div>
                </>
              )}

              <form className="space-y-4" onSubmit={onSubmit}>
                {error ? (
                  <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[14px] text-[#991b1b]">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[14px] text-[#166534]">
                    {success}
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-[14px] font-medium text-[#6f6f6f]" htmlFor="fullName">
                    Full name
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f1f1f3] px-4 text-[14px] text-[#222] outline-none placeholder:text-[#9ca3af] focus:border-[#11a63a] focus:bg-white"
                    id="fullName"
                    onChange={(event) => updateField("username", event.target.value)}
                    placeholder="Your name"
                    required
                    type="text"
                    value={form.username}
                    disabled={isSubmitting || isGoogleLoading}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-medium text-[#6f6f6f]" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f1f1f3] px-4 text-[14px] text-[#222] outline-none placeholder:text-[#9ca3af] focus:border-[#11a63a] focus:bg-white"
                    id="email"
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={form.email}
                    disabled={isSubmitting || isGoogleLoading}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-medium text-[#6f6f6f]" htmlFor="role">
                    Role
                  </label>
                  <select
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f1f1f3] px-4 text-[14px] text-[#222] outline-none focus:border-[#11a63a] focus:bg-white"
                    id="role"
                    onChange={(event) => updateField("role", event.target.value)}
                    value={form.role}
                    disabled={isSubmitting || isGoogleLoading}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-medium text-[#6f6f6f]" htmlFor="password">
                    Password
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f1f1f3] px-4 text-[14px] text-[#222] outline-none placeholder:text-[#9ca3af] focus:border-[#11a63a] focus:bg-white"
                    id="password"
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder="Enter your password"
                    required
                    type="password"
                    value={form.password}
                    disabled={isSubmitting || isGoogleLoading}
                  />
                </div>

                <div className="pt-2">
                  <button
                    className="mx-auto block h-12 w-full rounded-xl bg-[#08b239] text-[15px] font-semibold text-white transition hover:bg-[#069d32] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting || isGoogleLoading}
                    type="submit"
                  >
                    {isSubmitting ? "Signing up..." : "Sign up"}
                  </button>
                </div>

                <p className="text-center text-[14px] text-[#8a8a8a]">
                  Already have an account?
                  <Link className="ml-1 text-[#2563eb] hover:underline" href="/auth/sign-in">
                    Sign in
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
