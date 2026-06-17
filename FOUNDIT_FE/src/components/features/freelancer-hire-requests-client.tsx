"use client";

import Link from "next/link";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  asRecord,
  formatDate,
  formatMoney,
  normalizeStatus,
  toNumber,
  toText,
} from "@/lib/data-utils";

const badgeClass = (status: string) => {
  const normalized = normalizeStatus(status);
  if (normalized.includes("complete")) {
    return "bg-green-100 text-green-600";
  }
  if (normalized.includes("accept") || normalized.includes("progress")) {
    return "bg-green-100 text-green-600";
  }
  if (normalized.includes("reject") || normalized.includes("cancel")) {
    return "bg-red-100 text-red-500";
  }
  return "bg-amber-100 text-amber-600";
};

export function FreelancerHireRequestsClient() {
  const requests = useApiQuery<unknown[]>({
    endpoint: "/freelancer/view-hire-request",
    initialData: [],
  });

  const items = requests.data.map((entry, index) => {
    const record = asRecord(entry);
    return {
      id: toText(record.id ?? index + 1),
      title: toText(record.gigTitle, `Request ${index + 1}`),
      client: toText(record.clientName, "Client"),
      budget: toNumber(record.projectAgreedPrice ?? record.agreedPrice, 0),
      deadline: formatDate(record.deadline, "No deadline"),
      status: toText(record.projectStatus ?? record.status, "Pending"),
      createdAt: formatDate(record.createdAt, "Unknown"),
      requirements: toText(record.requirements, "No requirement message yet."),
      requirementFileName: toText(record.requirementFileName, ""),
      projectId: toNumber(record.projectId, 0) || null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 md:px-6 lg:px-10">
      <div className="mb-6">
        <h1 className="text-[34px] font-semibold leading-none text-slate-900">Incoming Requests</h1>
        <p className="mt-2 text-sm text-slate-500">
          Review and respond to client requests for your services.
        </p>
      </div>

      {requests.error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {requests.error}
        </div>
      ) : null}

      <div className="space-y-4">
        {requests.isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            Loading requests...
          </div>
        ) : items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                    <span>{item.client}</span>
                    <span>{formatMoney(item.budget)}</span>
                    <span>Due {item.deadline}</span>
                    <span>Requested {item.createdAt}</span>
                  </div>
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Requirements
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.requirements}</p>
                    {item.requirementFileName ? (
                      <p className="mt-2 text-xs font-medium text-blue-600">
                        Attachment included: {item.requirementFileName}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    href={item.projectId ? "/freelancer/chat" : "/freelancer/chat"}
                  >
                    Review in Chat
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No incoming requests yet.
          </div>
        )}
      </div>
    </div>
  );
}

