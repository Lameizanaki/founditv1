"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/providers/auth-provider";
import { useChatNotifications } from "@/components/providers/chat-notification-provider";
import { roleLabel } from "@/lib/auth";
import type { AppRole } from "@/types/auth";

export interface DashboardNavItem {
  href: string;
  label: string;
  note: string;
}

const matchesNavItem = (pathname: string, href: string) => {
  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true;
  }

  if (href.endsWith("/chat")) {
    const scopePrefix = href.slice(0, -"/chat".length);
    return pathname.startsWith(`${scopePrefix}/`) && pathname.endsWith("/chat");
  }

  return false;
};

const roleAccentMap: Record<AppRole, string> = {
  CLIENT: "text-[#2563eb]",
  FREELANCER: "text-[#2563eb]",
  ADMIN: "text-[#2563eb]",
};

export function DashboardShell({
  role,
  navItems,
  children,
}: {
  role: AppRole;
  title: string;
  description: string;
  navItems: DashboardNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { unreadCount } = useChatNotifications();

  return (
    <AuthGuard requiredRole={role}>
      <div className="min-h-screen w-full bg-[#f6f7f9]">
        <header className="sticky top-0 z-50 border-b border-b-gray-300 bg-white">
          <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-6 py-4 lg:px-10">
            <div className="flex items-center gap-8">
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

              <nav className="hidden items-center gap-2 lg:flex">
                {navItems.map((item) => {
                  const isActive = matchesNavItem(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      className={
                        isActive
                          ? `inline-flex items-center gap-2 rounded-xl bg-[#eef2ff] px-4 py-3 text-[15px] font-medium ${roleAccentMap[role]}`
                          : "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-medium text-[#4b5563] transition hover:bg-[#f9fafb]"
                      }
                      href={item.href}
                    >
                      <span className="relative inline-flex items-center gap-2">
                        {item.label}
                        {item.href.endsWith("/chat") && unreadCount > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-[15px] font-semibold leading-5 text-[#111827]">
                  {session?.user.email ?? "Unknown user"}
                </p>
                <p className="text-sm leading-5 text-[#6b7280]">{roleLabel(role)}</p>
              </div>

              <button
                className="rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-[#374151] transition hover:border-gray-200 hover:bg-[#f9fafb]"
                onClick={() => router.push("/")}
                type="button"
              >
                Home
              </button>
              <button
                className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0b1220]"
                onClick={() => {
                  signOut();
                  router.push("/");
                }}
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="mt-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
