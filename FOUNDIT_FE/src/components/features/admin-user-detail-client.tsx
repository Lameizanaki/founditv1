"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { asArray, buildImageSource, formatDate, formatMoney, getInitials, toText } from "@/lib/data-utils";

type ActivityItem = {
  id: number;
  title: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  createdAt: string | null;
  relatedUser: string | null;
};

type AdminUserDetail = {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  country: string | null;
  about: string | null;
  description: string | null;
  jobTitle: string | null;
  yearExperience: number | null;
  skills: string[];
  rating: number | null;
  profilePictureData?: unknown;
  profilePictureType?: string | null;
  gigCount: number;
  projectCount: number;
  hireRequestCount: number;
  totalEarned: number;
  totalSpent: number;
  ekycStatus: string | null;
  ekycFailureReason: string | null;
  recentGigs: ActivityItem[];
  recentProjects: ActivityItem[];
  recentHireRequests: ActivityItem[];
  recentPayments: ActivityItem[];
};

type DetailTab = "Overview" | "Freelancer" | "Client" | "Activity Log" | "Financial";

export function AdminUserDetailClient({ userId }: { userId: number }) {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [selectedTab, setSelectedTab] = useState<DetailTab>("Overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const nextUser = await apiRequest<AdminUserDetail>(`/admin/users/${userId}`, { token });
      setUser(nextUser);
      setSelectedTab("Overview");
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
      void loadDetail();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  const updateStatus = async (status: "ACTIVE" | "PENDING" | "SUSPENDED") => {
    if (!token) return;
    setIsUpdating(true);
    setError(null);
    setMessage(null);

    try {
      const action = status === "ACTIVE" ? "activate" : status === "PENDING" ? "pending" : "suspend";
      await apiRequest(`/admin/users/${userId}/${action}`, { method: "PUT", token });
      setUser((current) => (current ? { ...current, status } : current));
      setMessage(`User status changed to ${status}.`);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsUpdating(false);
    }
  };

  const visibleTabs = useMemo<DetailTab[]>(() => {
    if (!user) return ["Overview"];
    if (user.role === "FREELANCER") {
      return ["Overview", "Freelancer", "Activity Log", "Financial"];
    }
    if (user.role === "CLIENT") {
      return ["Overview", "Client", "Activity Log", "Financial"];
    }
    return ["Overview", "Activity Log"];
  }, [user]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 md:px-6 lg:px-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading user detail...
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 md:px-6 lg:px-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error || "User detail could not be loaded."}
        </div>
      </div>
    );
  }

  const avatar = buildImageSource({
    data: user.profilePictureData,
    contentType: user.profilePictureType,
    fallback: "",
  });

  const renderActivities = (items: ActivityItem[], badgeTone: string) =>
    asArray(items).length ? (
      items.map((entry) => {
        const item = entry as ActivityItem;
        return (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{toText(item.title, "Untitled activity")}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {toText(item.relatedUser, "No related user")} - {formatDate(item.createdAt)}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${badgeTone}`}>
                {toText(item.status, "UNKNOWN")}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-green-600">{formatMoney(item.amount)}</p>
          </div>
        );
      })
    ) : (
      <p className="text-sm text-slate-500">No records found.</p>
    );

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 md:px-6 lg:px-10">
      <Link
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-black"
        href="/admin/users"
      >
        Back to Users
      </Link>

      {message ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {message}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={user.username} className="h-full w-full object-cover" src={avatar} />
              ) : (
                getInitials(user.username)
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-semibold leading-tight text-slate-900">{user.username}</h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  {user.role}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    user.status === "ACTIVE"
                      ? "bg-green-100 text-green-600"
                      : user.status === "PENDING"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-600"
                  }`}
                >
                  {user.status}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">{user.email}</p>
              <p className="mt-2 text-sm text-slate-500">{toText(user.country, "Location not set")}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-60"
              disabled={isUpdating}
              onClick={() => void updateStatus("ACTIVE")}
              type="button"
            >
              Activate
            </button>
            <button
              className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
              disabled={isUpdating}
              onClick={() => void updateStatus("PENDING")}
              type="button"
            >
              Pending
            </button>
            <button
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              disabled={isUpdating}
              onClick={() => void updateStatus("SUSPENDED")}
              type="button"
            >
              Suspend
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Earned</p>
          <h3 className="mt-4 text-[24px] font-semibold text-slate-900">{formatMoney(user.totalEarned)}</h3>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Spent</p>
          <h3 className="mt-4 text-[24px] font-semibold text-slate-900">{formatMoney(user.totalSpent)}</h3>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Projects</p>
          <h3 className="mt-4 text-[24px] font-semibold text-slate-900">{user.projectCount}</h3>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">E-KYC Status</p>
          <h3 className="mt-4 text-[18px] font-semibold text-slate-900">{toText(user.ekycStatus, "Not submitted")}</h3>
        </div>
      </div>

      <div className="mt-4">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              className={selectedTab === tab ? "rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm" : "rounded-md px-4 py-2 text-sm font-medium text-slate-700 transition"}
              onClick={() => setSelectedTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {selectedTab === "Overview" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Account Information</h2>
            <div className="mt-5 space-y-4 text-sm">
              {[
                ["User ID", String(user.id)],
                ["Email", user.email],
                ["Role", user.role],
                ["Status", user.status],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
            <p className="mt-5 text-sm leading-7 text-slate-500">
              {toText(user.about || user.description, "No profile summary provided.")}
            </p>
          </section>
        </div>
      ) : null}

      {selectedTab === "Freelancer" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Freelancer Details</h2>
            <div className="mt-5 space-y-4 text-sm">
              {[
                ["Job Title", toText(user.jobTitle, "Not set")],
                ["Experience", `${user.yearExperience ?? 0} years`],
                ["Rating", user.rating != null ? String(user.rating) : "0"],
                ["Gigs", String(user.gigCount)],
                ["Hire Requests", String(user.hireRequestCount)],
                ["Total Earned", formatMoney(user.totalEarned)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {user.skills.length ? (
                user.skills.map((skill) => (
                  <span key={skill} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No skills added.</span>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 xl:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Recent Gigs</h2>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {renderActivities(user.recentGigs, "bg-blue-50 text-indigo-700")}
            </div>
          </section>
        </div>
      ) : null}

      {selectedTab === "Client" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Client Activity</h2>
            <div className="mt-5 space-y-4 text-sm">
              {[
                ["Projects", String(user.projectCount)],
                ["Hire Requests", String(user.hireRequestCount)],
                ["Total Spent", formatMoney(user.totalSpent)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Client Profile</h2>
            <p className="mt-5 text-sm leading-7 text-slate-500">
              {toText(user.about || user.description, "No client summary provided.")}
            </p>
          </section>
        </div>
      ) : null}

      {selectedTab === "Activity Log" ? (
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Activity</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Recent Projects</h3>
              <div className="mt-3 space-y-3">
                {renderActivities(user.recentProjects, "bg-blue-50 text-indigo-700")}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Recent Hire Requests</h3>
              <div className="mt-3 space-y-3">
                {renderActivities(user.recentHireRequests, "bg-amber-100 text-amber-700")}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {selectedTab === "Financial" ? (
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Financial Summary</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Paid Freelancer Earnings</p>
              <p className="mt-2 text-xl font-semibold text-green-600">{formatMoney(user.totalEarned)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Paid Client Spending</p>
              <p className="mt-2 text-xl font-semibold text-blue-600">{formatMoney(user.totalSpent)}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {renderActivities(user.recentPayments, "bg-blue-50 text-indigo-700")}
          </div>
        </section>
      ) : null}

      {user.ekycFailureReason ? (
        <section className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-5">
          <h2 className="text-lg font-semibold text-orange-800">E-KYC Failure Reason</h2>
          <p className="mt-3 text-sm leading-6 text-orange-800">{user.ekycFailureReason}</p>
        </section>
      ) : null}
    </div>
  );
}
