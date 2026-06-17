"use client";

import Image from "next/image";
import Link from "next/link";
import { getDefaultRouteForRole } from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";

export function PublicHeader() {
  const { session, signOut, status } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex h-14 w-28 items-center" href="/">
          <Image
            alt="FOUNDIT"
            className="h-full w-full object-contain"
            height={64}
            priority
            src="/assets/images/logo.png"
            width={128}
          />
        </Link>

        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 md:inline-flex"
            href="/browse-freelancers"
          >
            Freelancers
          </Link>
          <Link
            className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 md:inline-flex"
            href="/browse-gigs"
          >
            Gigs
          </Link>
          {status === "authenticated" && session ? (
            <>
              <Link
                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                href={getDefaultRouteForRole(session.user.role)}
              >
                Workspace
              </Link>
              <button
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                onClick={signOut}
                type="button"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                href="/auth/sign-in"
              >
                Login
              </Link>
              <Link
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                href="/auth/sign-up"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
