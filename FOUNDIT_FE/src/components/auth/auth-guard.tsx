"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getDefaultRouteForRole, hasRequiredRole } from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";
import type { AppRole } from "@/types/auth";

export function AuthGuard({
  requiredRole,
  children,
}: {
  requiredRole: AppRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, status } = useAuth();

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      router.replace(`/auth/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!hasRequiredRole(session?.user.role ?? null, requiredRole)) {
      router.replace(getDefaultRouteForRole(session?.user.role ?? null));
    }
  }, [pathname, requiredRole, router, session?.user.role, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white/95 px-8 py-6 text-sm text-slate-500 shadow-[0_18px_60px_rgba(67,38,18,0.12)] backdrop-blur">
          Restoring your session...
        </div>
      </div>
    );
  }

  if (
    status !== "authenticated" ||
    !hasRequiredRole(session?.user.role ?? null, requiredRole)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white/95 px-8 py-6 text-sm text-slate-500 shadow-[0_18px_60px_rgba(67,38,18,0.12)] backdrop-blur">
          Redirecting to the correct workspace...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
