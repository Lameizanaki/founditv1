"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { GoogleIcon } from "@/components/auth/google-icon";
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

        <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex items-start justify-center px-2 pt-8 md:px-6 lg:px-4 xl:px-8">
            <div className="w-full max-w-2xl">
              <h1 className="text-[42px] font-bold leading-tight text-slate-900">
                Create an account
              </h1>
              <p className="mt-2 text-[18px] text-slate-500">Sign Up With FoundIT</p>

              {isGoogleAuthEnabled ? (
                <>
                  <div className="mt-8 space-y-3">
                    <button
                      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-[14px] font-medium text-slate-900 transition hover:bg-gray-50"
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

                  <div className="my-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[13px] text-slate-400">or use email</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[14px] text-blue-700">
                    Google sign-up is unavailable in this deployment. Create your account with email instead.
                  </div>
                  <div className="my-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[13px] text-slate-400">email sign up</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                </>
              )}

              <form className="space-y-4" onSubmit={onSubmit}>
                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[14px] text-green-800">
                    {success}
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-[14px] font-medium text-slate-600" htmlFor="fullName">
                    Full name
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-transparent bg-slate-100 px-4 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-600 focus:bg-white"
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
                  <label className="mb-2 block text-[14px] font-medium text-slate-600" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-transparent bg-slate-100 px-4 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-600 focus:bg-white"
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
                  <label className="mb-2 block text-[14px] font-medium text-slate-600" htmlFor="role">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      className="h-12 w-full appearance-none rounded-xl border border-transparent bg-slate-100 px-4 pr-11 text-[14px] font-medium text-slate-900 outline-none transition focus:border-green-600 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
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
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-medium text-slate-600" htmlFor="password">
                    Password
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-transparent bg-slate-100 px-4 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-600 focus:bg-white"
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
                    className="mx-auto block h-12 w-full rounded-xl bg-green-600 text-[15px] font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting || isGoogleLoading}
                    type="submit"
                  >
                    {isSubmitting ? "Signing up..." : "Sign up"}
                  </button>
                </div>

                <p className="text-center text-[14px] text-slate-400">
                  Already have an account?
                  <Link className="ml-1 text-blue-600 hover:underline" href="/auth/sign-in">
                    Sign in
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
