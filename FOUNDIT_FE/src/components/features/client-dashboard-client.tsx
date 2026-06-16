"use client";

import Link from "next/link";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  asRecord,
  buildImageSource,
  formatMoney,
  getInitials,
  normalizeStatus,
  toNumber,
  toText,
} from "@/lib/data-utils";
import { normalizeBackendEkycStatus } from "@/lib/ekyc";
import type { PaymentTransactionResponse } from "@/types/payment";

const orderStatusClass = (status: string) => {
  const normalized = normalizeStatus(status);
  if (normalized.includes("progress") || normalized.includes("accept")) {
    return "bg-[#eff6ff] text-[#2563eb]";
  }
  if (normalized.includes("complete")) {
    return "bg-[#dcfce7] text-[#16a34a]";
  }
  if (normalized.includes("reject") || normalized.includes("cancel")) {
    return "bg-[#fee2e2] text-[#ef4444]";
  }
  return "bg-[#fef3c7] text-[#d97706]";
};

export function ClientDashboardClient() {
  const profile = useApiQuery<unknown>({
    endpoint: "/client/me",
    initialData: {},
  });
  const orders = useApiQuery<unknown[]>({
    endpoint: "/client/hire-requests",
    initialData: [],
  });
  const history = useApiQuery<unknown[]>({
    endpoint: "/client/project-history",
    initialData: [],
  });
  const transactions = useApiQuery<PaymentTransactionResponse[]>({
    endpoint: "/payment/my-transactions",
    initialData: [],
  });
  const freelancers = useApiQuery<unknown[]>({
    endpoint: "/freelancer/active",
    initialData: [],
  });
  const ekyc = useApiQuery<unknown | null>({
    endpoint: "/ekyc/current",
    initialData: null,
  });

  const activeOrders = orders.data
    .map((entry, index) => {
      const record = asRecord(entry);
      return {
        id: toText(record.projectId ?? record.id ?? index + 1),
        title: toText(record.gigTitle, "Untitled project"),
        freelancerName: toText(record.freelancerName ?? record.freelancerId, "Freelancer"),
        dueDate: toText(record.deadline, "No deadline"),
        price: toNumber(record.projectAgreedPrice ?? record.agreedPrice, 0),
        status: toText(record.projectStatus ?? record.status, "Pending"),
      };
    })
    .slice(0, 5);

  const freelancerCards = freelancers.data.slice(0, 6).map((entry, index) => {
    const record = asRecord(entry);
    return {
      id: toText(record.id ?? record.profileId ?? record.freelancerId ?? index + 1),
      name: toText(record.freelancerName, `Freelancer ${index + 1}`),
      job: toText(record.freelancerJob, "Available freelancer"),
      rating: toNumber(record.rating, 0),
      location: toText(record.workLocation, "Remote"),
      avatar: buildImageSource({
        data: record.profilePictureData,
        contentType: record.profilePictureType,
        url: record.profilePictureUrl,
      }),
      price: toNumber(
        Array.isArray(record.activeService) ? asRecord(record.activeService[0]).price : 0,
        0,
      ),
    };
  });

  const totalProjects = history.data.length;
  const completedProjects = history.data.filter((entry) =>
    normalizeStatus(asRecord(entry).status).includes("complete"),
  ).length;
  const totalSpent = transactions.data
    .filter((transaction) => normalizeStatus(transaction.status).includes("paid"))
    .reduce<number>((sum, transaction) => sum + toNumber(transaction.amount, 0), 0);
  const profileRecord = asRecord(profile.data);
  const ekycStatus = normalizeBackendEkycStatus(asRecord(ekyc.data).status);
  const isVerified = ekycStatus === "verified";
  const loadError = profile.error || orders.error || history.error || freelancers.error || transactions.error;
  const isLoading =
    profile.isLoading || orders.isLoading || history.isLoading || freelancers.isLoading || transactions.isLoading;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 md:px-6 lg:px-10">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[30px] font-semibold leading-none text-[#111827] md:text-[18px]">
              Client Dashboard
            </h1>
            <p className="mt-2 text-sm text-[#6b7280]">
              Manage your projects, hire freelancers, and track your orders in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isVerified ? (
              <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#dcfce7] px-4 py-3 text-sm font-semibold text-[#166534]">
                Verified
              </span>
            ) : (
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-sm font-medium text-[#2563eb] transition hover:bg-[#f9fafb]"
                href="/client/ekyc"
              >
                Verify Identity
              </Link>
            )}
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
              href="/client/browse-freelancers"
            >
              Find Freelancers
            </Link>
          </div>
        </div>
      </section>

      {loadError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <section className="mt-6">
        <h2 className="text-xl font-semibold text-[#111827]">Client Overview</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active Orders", value: activeOrders.length, note: `${activeOrders.length} active projects`, tone: "bg-[#eff6ff] text-[#2563eb]" },
            { label: "Total Projects", value: totalProjects, note: `${profileRecord.email ? "Connected" : "Profile pending"}`, tone: "bg-[#faf5ff] text-[#a855f7]" },
            { label: "Total Spent", value: formatMoney(totalSpent), note: "Across all tracked work", tone: "bg-[#fffbeb] text-[#eab308]" },
            { label: "Completed", value: completedProjects, note: `${completedProjects} finished`, tone: "bg-[#f0fdf4] text-[#22c55e]" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#e5e7eb] bg-white p-5 transition hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>•</div>
                <span className="text-3xl font-semibold text-[#111827]">{card.value}</span>
              </div>
              <p className="mt-4 text-sm font-medium text-[#111827]">{card.label}</p>
              <p className="mt-1 text-xs text-[#6b7280]">{card.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[28px] font-semibold leading-none text-[#111827] md:text-[18px]">
              Active Orders
            </h2>
            <Link className="inline-flex items-center gap-1 text-sm font-medium text-[#2563eb] transition hover:text-[#1d4ed8]" href="/client/my-orders">
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 text-sm text-[#6b7280]">
                Loading active orders...
              </div>
            ) : activeOrders.length ? (
              activeOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-5 transition hover:shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#111827]">{order.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
                        <span>{order.freelancerName}</span>
                        <span>Due {order.dueDate}</span>
                        <span>{formatMoney(order.price)}</span>
                      </div>
                    </div>

                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${orderStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link
                      className="inline-flex items-center justify-center rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                      href="/client/my-orders"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-white p-10 text-center">
                <h3 className="text-lg font-semibold text-[#111827]">No active orders</h3>
                <p className="mt-2 text-sm text-[#6b7280]">Accepted and in-progress projects will appear here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#111827]">Freelancers For You</h2>
              <Link className="text-sm font-medium text-[#2563eb] transition hover:text-[#1d4ed8]" href="/client/browse-freelancers">
                Browse all
              </Link>
            </div>
            <p className="mb-4 text-sm text-[#6b7280]">
              Browse active freelancers that match your next project.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {freelancerCards.map((card) => (
                <Link
                  key={card.id}
                  className="block rounded-2xl border border-[#e5e7eb] bg-white p-4 transition hover:border-[#bfdbfe] hover:shadow-sm"
                  href="/client/browse-freelancers"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#e5e7eb] bg-[#eff6ff] text-sm font-semibold text-[#2563eb]">
                      {card.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={card.name} className="h-full w-full object-cover" src={card.avatar} />
                      ) : (
                        getInitials(card.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[#111827]">{card.name}</h3>
                      <p className="mt-1 truncate text-xs text-[#6b7280]">{card.job}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6b7280]">
                        <span className="rounded-full bg-[#f8fafc] px-2 py-1 font-medium text-[#111827]">
                          {card.rating.toFixed(1)}
                        </span>
                        <span>{card.location}</span>
                        <span>{card.price ? `$${card.price}+` : "View portfolio"}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
