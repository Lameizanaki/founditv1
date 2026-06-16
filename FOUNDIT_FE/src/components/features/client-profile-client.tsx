"use client";

import { useApiQuery } from "@/hooks/use-api-query";
import { asRecord, formatDate, formatMoney, normalizeStatus, toNumber, toText } from "@/lib/data-utils";
import type { PaymentTransactionResponse } from "@/types/payment";

export function ClientProfileClient() {
  const profile = useApiQuery<unknown>({ endpoint: "/client/me", initialData: {} });
  const history = useApiQuery<unknown[]>({
    endpoint: "/client/project-history",
    initialData: [],
  });
  const transactions = useApiQuery<PaymentTransactionResponse[]>({
    endpoint: "/payment/my-transactions",
    initialData: [],
  });

  const record = asRecord(profile.data);
  const stats = {
    spent: transactions.data
      .filter((transaction) => normalizeStatus(transaction.status).includes("paid"))
      .reduce<number>((sum, transaction) => sum + toNumber(transaction.amount, 0), 0),
    active: history.data.filter((item) =>
      toText(asRecord(item).status).toLowerCase().includes("progress"),
    ).length,
    completed: history.data.filter((item) =>
      toText(asRecord(item).status).toLowerCase().includes("complete"),
    ).length,
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 md:px-6 lg:px-10">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-[30px] font-semibold text-slate-900">My Profile</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Review your client account details, project activity, and spending summary.
        </p>
      </div>

      {profile.error || history.error || transactions.error ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {profile.error || history.error || transactions.error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="px-8 py-8">
              <div className="flex flex-col items-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-xl font-semibold text-slate-500 shadow-sm">
                  {toText(record.fullName ?? record.clientName ?? record.username, "C")
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  ["Full Name", toText(record.fullName ?? record.clientName, "Client")],
                  ["Company", toText(record.company, "Not set")],
                  ["Location", toText(record.location ?? record.workLocation, "Not set")],
                  ["Email", toText(record.email ?? record.clientEmail, "Not set")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Project Statistics</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Total Spent", value: formatMoney(stats.spent), hint: "Tracked spend" },
                { label: "Active", value: String(stats.active), hint: "Current work" },
                { label: "Completed", value: String(stats.completed), hint: "Delivered" },
                { label: "History", value: String(history.data.length), hint: "All entries" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{stat.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">About</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Your business summary</h2>
            <p className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
              {toText(record.about ?? record.bio, "No business summary has been added yet.")}
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Contact Information</h2>
            <div className="mt-4 space-y-3">
              {[
                ["Email", toText(record.email ?? record.clientEmail, "Not set")],
                ["Phone", toText(record.phone, "Not set")],
                ["Website", toText(record.website, "Not set")],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Availability</h2>
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-700">
                {toText(record.availability, "Not specified")}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Project History</h2>
              <span className="text-sm text-slate-500">{history.data.length} entries</span>
            </div>

            <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
              {history.isLoading ? (
                <p className="text-sm text-slate-500">Loading project history...</p>
              ) : history.data.length ? (
                history.data.map((item, index) => {
                  const entry = asRecord(item);
                  return (
                    <article
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-slate-900">
                            {toText(entry.title ?? entry.projectTitle ?? entry.gigTitle, "Project")}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {toText(entry.freelancerName ?? entry.relatedUser, "Freelancer")}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                            {toText(entry.description ?? entry.requirements, "No description available.")}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                            {toText(entry.status, "Unknown")}
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {formatDate(entry.createdAt ?? entry.updatedAt, "No date")}
                          </p>
                          <p className="mt-3 text-sm font-semibold text-slate-900">
                            {formatMoney(entry.agreedPrice ?? entry.projectAgreedPrice)}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-900">No project history yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Completed and active projects will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

