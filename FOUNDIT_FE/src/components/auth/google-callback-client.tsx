"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { getDefaultRouteForRole } from "@/lib/auth";

export function GoogleCallbackClient({ token }: { token: string | null }) {
  const router = useRouter();
  const { acceptGoogleToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setError("Google sign-in did not return a token.");
      });
      return;
    }

    try {
      const session = acceptGoogleToken(token);
      router.replace(getDefaultRouteForRole(session.user.role));
    } catch (callbackError) {
      queueMicrotask(() => {
        setError(
          callbackError instanceof Error
            ? callbackError.message
            : "Unable to finish Google sign-in.",
        );
      });
    }
  }, [acceptGoogleToken, router, token]);

  return (
    <section className="mx-auto max-w-2xl rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[0_18px_60px_rgba(67,38,18,0.12)] backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--warning)]">
        Google callback
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
        Finalizing your FoundIt session...
      </h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        The backend redirected here with a JWT. This page stores it locally and forwards
        you to the correct role dashboard.
      </p>
      {error ? (
        <div className="mt-6 rounded-[20px] border border-[#efc0b1] bg-[#fff1eb] px-4 py-3 text-left text-sm text-[#8f3a1d]">
          {error}
        </div>
      ) : (
        <div className="mt-6 rounded-[20px] border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-[var(--muted)]">
          Verifying token and redirecting...
        </div>
      )}
    </section>
  );
}
