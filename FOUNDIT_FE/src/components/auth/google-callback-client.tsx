"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  label: string;
  role: Exclude<AppRole, "ADMIN">;
}> = [
  {
    role: "CLIENT",
    label: "Client",
    description: "Browse gigs, hire freelancers, review deliveries, and manage payments.",
  },
  {
    role: "FREELANCER",
    label: "Freelancer",
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
      <section className="flex min-h-screen items-center justify-center bg-[#f8f8f8] px-6 py-10">
        <div className="w-full max-w-xl rounded-[28px] border border-[#e5e7eb] bg-white px-8 py-12 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-[#dbeafe] border-t-[#2563eb]" />
          <h1 className="text-2xl font-semibold text-[#0f172a]">
            Completing Google sign-in
          </h1>
          <p className="mt-3 text-sm text-[#64748b]">
            We&apos;re preparing your session and checking whether you need to finish account setup.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f8f8f8] px-6 py-8 md:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1760px] items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-[#e5e7eb] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)] lg:grid-cols-[1.4fr_0.6fr]">
          <div className="px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
            <span className="inline-flex rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#2563eb]">
              Google Account Setup
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-[-0.04em] text-[#111827]">
              Choose how you want to use FoundIt
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#6b7280]">
              Your Google account is connected. Pick the role that matches your first login.
              After saving the role, we&apos;ll send you back to sign in so the next Google login opens the correct workspace cleanly.
            </p>

            {error ? (
              <div className="mt-6 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#dc2626]">
                {error}
              </div>
            ) : null}

            <div className="mt-8 grid gap-4">
              {roleCards.map((roleCard) => {
                const isActive = selectedRole === roleCard.role;

                return (
                  <button
                    key={roleCard.role}
                    className={`rounded-[24px] border px-5 py-5 text-left transition ${
                      isActive
                        ? "border-[#16a34a] bg-[#f0fdf4] shadow-[0_12px_40px_rgba(34,197,94,0.14)]"
                        : "border-[#e5e7eb] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
                    }`}
                    disabled={isSubmittingRole}
                    onClick={() => setSelectedRole(roleCard.role)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-[#111827]">
                          {roleCard.label}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                          {roleCard.description}
                        </p>
                      </div>
                      <span
                        className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          isActive
                            ? "border-[#16a34a] bg-[#16a34a] text-white"
                            : "border-[#cbd5e1] bg-white text-[#94a3b8]"
                        }`}
                      >
                        {isActive ? "✓" : ""}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#08b239] px-6 text-sm font-semibold text-white transition hover:bg-[#069d32] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmittingRole}
                onClick={() => void submitRole()}
                type="button"
              >
                {isSubmittingRole ? "Saving role..." : `Continue as ${selectedRole === "CLIENT" ? "Client" : "Freelancer"}`}
              </button>
              <button
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d1d5db] px-6 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmittingRole}
                onClick={() => router.replace("/auth/sign-in")}
                type="button"
              >
                Back to sign in
              </button>
            </div>
          </div>

          <aside className="border-t border-[#e5e7eb] bg-[radial-gradient(circle_at_top,#eff6ff,transparent_56%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-10 sm:px-10 lg:border-l lg:border-t-0 lg:px-12">
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_60px_rgba(37,99,235,0.08)] backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111827] text-sm font-bold text-white">
                  G
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#64748b]">
                    Secure Login
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#111827]">
                    Google authentication complete
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-[#111827]">Client account</p>
                  <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                    Best if you mainly browse gigs, place orders, submit requirements, and manage payments.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-[#111827]">Freelancer account</p>
                  <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                    Best if you want to publish services, accept requests, deliver work, and manage your public profile.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-4 text-sm leading-6 text-[#1d4ed8]">
                  You can continue with email sign-in later. This step only decides which dashboard and account records we create first.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
