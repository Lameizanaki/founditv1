"use client";

import Image from "next/image";
import Link from "next/link";
import { getDefaultRouteForRole } from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";

export function PublicHeader() {
  const { session, signOut, status } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-b-gray-300 bg-[#eef5f0]/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-6 py-4 lg:px-10">
        <Link className="flex h-16 w-32 items-center" href="/">
          <Image
            alt="FOUNDIT"
            className="h-full w-full object-contain"
            height={64}
            priority
            src="/assets/images/logo.png"
            width={128}
          />
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
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
                className="rounded-lg bg-[#16a34a] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803d]"
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
                className="rounded-lg bg-[#16a34a] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803d]"
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
