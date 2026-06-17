"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Check,
  ClipboardList,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { getDefaultRouteForRole } from "@/lib/auth";
import type { AppRole } from "@/types/auth";

interface GoogleCallbackClientProps {
  setupRole: boolean;
  token: string | null;
}

interface ChooseRoleResponse {
  message: string;
  role: AppRole;
  token: string;
}

const redirectToWorkspace = (role: AppRole | null) => {
  window.location.replace(getDefaultRouteForRole(role));
};

const roleCards: Array<{
  description: string;
  icon: LucideIcon;
  label: string;
  role: Exclude<AppRole, "ADMIN">;
}> = [
  {
    role: "CLIENT",
    label: "Client",
    icon: BriefcaseBusiness,
    description: "Browse gigs, hire freelancers, review deliveries, and manage payments.",
  },
  {
    role: "FREELANCER",
    label: "Freelancer",
    icon: UserRound,
    description: "Publish services, receive requests, deliver projects, and confirm payments.",
  },
];

export function GoogleCallbackClient({
  setupRole,
  token,
}: GoogleCallbackClientProps) {
  const router = useRouter();
  const { acceptGoogleToken, signOut } = useAuth();
  const [error, setError] = useState<string | null>(
    token ? null : "Google sign-in did not return a valid session token.",
  );
  const [isHydrating, setIsHydrating] = useState(Boolean(token));
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Exclude<AppRole, "ADMIN">>(
    "CLIENT",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    try {
      const session = acceptGoogleToken(token);

      if (!setupRole && session.user.role) {
        redirectToWorkspace(session.user.role);
        return;
      }

      queueMicrotask(() => {
        setIsHydrating(false);
      });
    } catch (acceptError) {
      queueMicrotask(() => {
        setError(toErrorMessage(acceptError));
        setIsHydrating(false);
      });
    }
  }, [acceptGoogleToken, router, setupRole, token]);

  const submitRole = async () => {
    if (!token) {
      setError("Your Google session is missing. Please try signing in again.");
      return;
    }

    setError(null);
    setIsSubmittingRole(true);

    try {
      const response = await apiRequest<ChooseRoleResponse>("/role/update-role", {
        method: "PUT",
        token,
        body: { role: selectedRole },
      });

      signOut();
      window.location.replace(
        `/auth/sign-in?googleSetup=1&role=${encodeURIComponent(
          response.role ?? selectedRole,
        )}`,
      );
    } catch (submitError) {
      setError(toErrorMessage(submitError));
      setIsSubmittingRole(false);
    }
  };

  if (isHydrating) {
    return (
      <section className="flex min-h-[420px] items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <h1 className="text-2xl font-semibold text-slate-900">
            Completing Google sign-in
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            We are preparing your session and checking if your account needs a role.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-120px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            Google Account Setup
          </span>

          <h1 className="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl">
            Choose how you want to use FoundIt
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Your Google account is connected. Pick the role that matches your first login.
            After saving the role, we will send you back to sign in once more.
          </p>

          {error ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {roleCards.map((roleCard) => {
              const Icon = roleCard.icon;
              const isActive = selectedRole === roleCard.role;

              return (
                <button
                  key={roleCard.role}
                  className={`rounded-xl border p-5 text-left transition ${
                    isActive
                      ? "border-green-500 bg-green-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  disabled={isSubmittingRole}
                  onClick={() => setSelectedRole(roleCard.role)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-green-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        isActive
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-slate-300 text-transparent"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-semibold text-slate-900">
                    {roleCard.label}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {roleCard.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex h-12 items-center justify-center rounded-xl bg-green-600 px-5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmittingRole}
              onClick={() => void submitRole()}
              type="button"
            >
              {isSubmittingRole
                ? "Saving role..."
                : `Continue as ${selectedRole === "CLIENT" ? "Client" : "Freelancer"}`}
            </button>
            <button
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmittingRole}
              onClick={() => router.replace("/auth/sign-in")}
              type="button"
            >
              Back to sign in
            </button>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Secure login</p>
              <p className="text-base font-semibold text-slate-900">Google connected</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex gap-3">
              <ClipboardList className="mt-1 h-5 w-5 text-green-700" />
              <div>
                <p className="font-semibold text-slate-900">Pick one role</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  This decides which dashboard opens first.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Check className="mt-1 h-5 w-5 text-green-700" />
              <div>
                <p className="font-semibold text-slate-900">Save and sign in</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  After saving, sign in again with Google to enter the correct workspace.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
