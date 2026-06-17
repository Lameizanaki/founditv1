"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { buildImageSource, getInitials, toNumber, toText } from "@/lib/data-utils";

type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  rating?: number | null;
  location?: string | null;
  profilePictureData?: unknown;
  profilePictureType?: string | null;
};

type AdminUserPage = {
  content: AdminUser[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type Stats = {
  active: number;
  suspended: number;
  pending: number;
};

const initialPage: AdminUserPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 20,
};

export function AdminUsersClient() {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const [stats, setStats] = useState<Stats>({ active: 0, suspended: 0, pending: 0 });
  const [page, setPage] = useState<AdminUserPage>(initialPage);
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: "0",
        size: "50",
      });

      if (role !== "ALL") {
        params.set("role", role);
      }
      if (status !== "ALL") {
        params.set("status", status);
      }
      if (keyword.trim()) {
        params.set("keyword", keyword.trim());
      }

      const [nextStats, nextPage] = await Promise.all([
        apiRequest<Stats>("/admin/stats", { token }),
        apiRequest<AdminUserPage>(`/admin/users?${params.toString()}`, { token }),
      ]);

      setStats(nextStats);
      setPage(nextPage);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role, status]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-8 md:px-6 lg:px-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold text-slate-900">Users</h1>
            <p className="mt-2 text-[15px] text-slate-500">
              Review accounts, filter by role or status, and open detailed moderation pages.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-600"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search username or email"
              value={keyword}
            />
            <div className="relative">
              <select
                className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-600 md:w-36"
                onChange={(event) => setRole(event.target.value)}
                value={role}
              >
                <option value="ALL">All roles</option>
                <option value="CLIENT">Client</option>
                <option value="FREELANCER">Freelancer</option>
                <option value="ADMIN">Admin</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            <div className="relative">
              <select
                className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-600 md:w-40"
                onChange={(event) => setStatus(event.target.value)}
                value={status}
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-950"
              onClick={() => void loadUsers()}
              type="button"
            >
              {isLoading ? "Loading..." : "Apply"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["Active", stats.active, "bg-emerald-50 text-green-600"],
          ["Pending", stats.pending, "bg-amber-50 text-yellow-600"],
          ["Suspended", stats.suspended, "bg-red-50 text-red-600"],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`inline-flex rounded-xl px-3 py-2 text-sm font-semibold ${tone}`}>{label}</div>
            <p className="mt-5 text-3xl font-semibold text-slate-900">{toNumber(value)}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">User Directory</h2>
            <p className="text-sm text-slate-500">{page.totalElements} results</p>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Rating</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {page.content.map((user) => {
                const avatar = buildImageSource({
                  data: user.profilePictureData,
                  contentType: user.profilePictureType,
                  fallback: "",
                });
                return (
                  <tr key={user.id} className="border-t border-slate-200">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt={user.username} className="h-full w-full object-cover" src={avatar} />
                          ) : (
                            getInitials(user.username)
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{toText(user.username, "Unknown user")}</p>
                          <p className="text-xs text-slate-500">{toText(user.email, "No email")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {toText(user.role, "Unknown")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.status === "ACTIVE"
                            ? "bg-green-100 text-green-600"
                            : user.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-600"
                        }`}
                      >
                        {toText(user.status, "Unknown")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{toText(user.location, "Not set")}</td>
                    <td className="px-5 py-4 text-slate-700">
                      {user.rating != null ? Number(user.rating).toFixed(1) : "N/A"}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                        href={`/admin/users/${user.id}`}
                      >
                        View Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && page.content.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-500" colSpan={6}>
                    No users matched the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
