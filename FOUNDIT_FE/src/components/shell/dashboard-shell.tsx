"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BriefcaseBusiness,
  ClipboardList,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  CLIENT: "text-green-700",
  FREELANCER: "text-green-700",
  ADMIN: "text-blue-700",
};

const navIconMap: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  "Find Freelancers": Users,
  "Browse Gigs": Search,
  "My Orders": ClipboardList,
  "My Work": BriefcaseBusiness,
  "My Services": BriefcaseBusiness,
  "Incoming Requests": ClipboardList,
  Chat: MessageSquare,
  Reports: ShieldCheck,
  Settings,
  Users,
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
  const { session } = useAuth();
  const { unreadCount } = useChatNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <AuthGuard requiredRole={role}>
      <div className="min-h-screen w-full bg-slate-50">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
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
                  const Icon = navIconMap[item.label] ?? LayoutDashboard;
                  return (
                    <Link
                      key={item.href}
                      className={
                        isActive
                          ? `inline-flex items-center gap-2 rounded-xl bg-green-50 px-3.5 py-2.5 text-sm font-semibold ${roleAccentMap[role]}`
                          : "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                      }
                      href={item.href}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="relative inline-flex items-center gap-2">
                        {item.label}
                        {item.href.endsWith("/chat") && unreadCount > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
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
                <p className="text-[15px] font-semibold leading-5 text-slate-900">
                  {session?.user.email ?? "Unknown user"}
                </p>
                <p className="text-sm leading-5 text-slate-500">{roleLabel(role)}</p>
              </div>

              <button
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
                onClick={() => setIsMenuOpen((value) => !value)}
                type="button"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {isMenuOpen ? (
            <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
              <div className="mx-auto grid w-full max-w-[1600px] gap-2 sm:grid-cols-2">
                {navItems.map((item) => {
                  const isActive = matchesNavItem(pathname, item.href);
                  const Icon = navIconMap[item.label] ?? LayoutDashboard;

                  return (
                    <Link
                      key={item.href}
                      className={
                        isActive
                          ? `inline-flex items-center gap-2 rounded-xl bg-green-50 px-3.5 py-2.5 text-sm font-semibold ${roleAccentMap[role]}`
                          : "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      }
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="relative inline-flex items-center gap-2">
                        {item.label}
                        {item.href.endsWith("/chat") && unreadCount > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </header>

        <main className="mt-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
