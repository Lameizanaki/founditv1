"use client";

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
  if (normalized.includes("accept") || normalized.includes("progress")) {
    return "bg-[#dcfce7] text-[#16a34a]";
  }
  if (normalized.includes("reject") || normalized.includes("cancel")) {
    return "bg-[#fee2e2] text-[#ef4444]";
  }
  return "bg-[#fef3c7] text-[#d97706]";
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
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 md:px-6 lg:px-10">
      <div className="mb-6">
        <h1 className="text-[34px] font-semibold leading-none text-[#111827]">Incoming Requests</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
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
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 text-sm text-[#6b7280]">
            Loading requests...
          </div>
        ) : items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#111827]">{item.title}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-[#6b7280]">
                    <span>{item.client}</span>
                    <span>{formatMoney(item.budget)}</span>
                    <span>Due {item.deadline}</span>
                    <span>Requested {item.createdAt}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    className="rounded-xl bg-[#16a34a] px-4 py-2.5 text-sm font-semibold text-white opacity-70"
                    disabled
                    type="button"
                  >
                    Accept
                  </button>
                  <button
                    className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] opacity-70"
                    disabled
                    type="button"
                  >
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-white p-10 text-center text-sm text-[#6b7280]">
            No incoming requests yet.
          </div>
        )}
      </div>
    </div>
  );
}

