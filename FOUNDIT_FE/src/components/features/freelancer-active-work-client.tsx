"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest, toErrorMessage } from "@/lib/api";
import {
  asRecord,
  formatDate,
  formatMoney,
  normalizeStatus,
  toNumber,
  toText,
} from "@/lib/data-utils";

const filterCount = (items: unknown[], target: string) =>
  items.filter((entry) => normalizeStatus(asRecord(entry).status).includes(target)).length;

export function FreelancerActiveWorkClient() {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const projects = useApiQuery<unknown[]>({
    endpoint: "/freelancer/view-project",
    initialData: [],
  });
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const cards = projects.data.map((entry, index) => {
    const record = asRecord(entry);
    const status = toText(record.status, "In Progress");
    const normalizedStatus = normalizeStatus(status);
    return {
      id: toText(record.id ?? index + 1),
      roomId: toText(record.roomId),
      title: toText(record.projectTitle ?? record.gigTitle, `Project ${index + 1}`),
      client: toText(record.clientName, "Client"),
      email: toText(record.clientEmail),
      company: toText(record.clientCompany),
      location: toText(record.clientLocation, "Remote"),
      dueDate: formatDate(record.deadline, "No deadline"),
      amount: toNumber(record.agreedPrice, 0),
      status,
      canMarkDelivered: ["in_progress", "revision_requested"].includes(normalizedStatus),
    };
  });

  const handleMarkDelivered = async (projectId: string) => {
    if (!token || !projectId || busyProjectId) {
      return;
    }

    setBusyProjectId(projectId);
    setActionError(null);

    try {
      await apiRequest(`/freelancer/project/${projectId}/deliver`, {
        method: "POST",
        token,
      });
      projects.refresh();
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setBusyProjectId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
      <div className="mb-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6b7280] transition hover:text-[#111827]"
          href="/freelancer/dashboard"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#111827]">Active Work</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Projects that are already agreed with clients and ready to work on.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "All Projects", value: cards.length },
          { label: "In Progress", value: filterCount(projects.data, "in_progress") },
          { label: "Delivered", value: filterCount(projects.data, "delivered") },
          { label: "Completed", value: filterCount(projects.data, "completed") },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#dcfce7] text-[#16a34a]">
              •
            </div>
            <div className="text-[34px] font-bold leading-none text-[#111827]">{stat.value}</div>
            <div className="mt-2 text-[15px] font-medium text-[#374151]">{stat.label}</div>
          </div>
        ))}
      </div>

      {projects.error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {projects.error}
        </div>
      ) : null}

      {actionError ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {projects.isLoading ? (
        <div className="mt-5 rounded-2xl border border-[#e5e7eb] bg-white px-5 py-10 text-center text-sm text-[#6b7280]">
          Loading your work...
        </div>
      ) : null}

      {!projects.isLoading && !cards.length ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d1d5db] bg-white px-5 py-10 text-center text-sm text-[#6b7280]">
          No active work found.
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {cards.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[16px] font-semibold text-[#111827]">{item.title}</h3>
                  <span className="inline-flex rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-medium text-[#2563eb]">
                    {item.status}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6b7280]">
                  <span className="font-medium text-[#16a34a]">{item.client}</span>
                  {item.company ? <span>{item.company}</span> : null}
                  <span>{item.location}</span>
                  {item.email ? <span>{item.email}</span> : null}
                  <span>Due {item.dueDate}</span>
                  <span>{formatMoney(item.amount)}</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                {item.canMarkDelivered ? (
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#0b1220] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busyProjectId === item.id}
                    onClick={() => void handleMarkDelivered(item.id)}
                    type="button"
                  >
                    {busyProjectId === item.id ? "Marking..." : "Mark as Delivered"}
                  </button>
                ) : null}
                {item.roomId ? (
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d]"
                    href={`/freelancer/${item.roomId}/chat`}
                  >
                    Message
                  </Link>
                ) : (
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white opacity-70"
                    disabled
                    type="button"
                  >
                    Chat Pending
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
