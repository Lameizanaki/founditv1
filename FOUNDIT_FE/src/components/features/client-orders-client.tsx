"use client";

import Link from "next/link";
import { useState } from "react";
import { useApiQuery } from "@/hooks/use-api-query";
import { asRecord, formatMoney, normalizeStatus, toNumber, toText } from "@/lib/data-utils";
import type { PaymentTransactionResponse } from "@/types/payment";

const statusLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const statusClass = (value: string) => {
  const status = normalizeStatus(value);
  if (status.includes("accept") || status.includes("progress")) {
    return "bg-[#eff6ff] text-[#2563eb]";
  }
  if (status.includes("complete")) {
    return "bg-[#dcfce7] text-[#16a34a]";
  }
  if (status.includes("reject") || status.includes("cancel")) {
    return "bg-[#fee2e2] text-[#ef4444]";
  }
  return "bg-[#fef3c7] text-[#d97706]";
};

const paymentStatusLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const paymentStatusClass = (value: string) => {
  const status = normalizeStatus(value);
  if (status.includes("paid")) {
    return "bg-[#dcfce7] text-[#16a34a]";
  }
  if (status.includes("submitted")) {
    return "bg-[#fef3c7] text-[#d97706]";
  }
  if (status.includes("cancel") || status.includes("fail")) {
    return "bg-[#fee2e2] text-[#ef4444]";
  }
  return "bg-[#eef2ff] text-[#2563eb]";
};

export function ClientOrdersClient() {
  const hireRequests = useApiQuery<unknown[]>({
    endpoint: "/client/hire-requests",
    initialData: [],
  });
  const projects = useApiQuery<unknown[]>({
    endpoint: "/client/projects",
    initialData: [],
  });
  const transactions = useApiQuery<PaymentTransactionResponse[]>({
    endpoint: "/payment/my-transactions",
    initialData: [],
  });
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const transactionByProjectId = new Map<number, PaymentTransactionResponse>();
  for (const transaction of transactions.data) {
    const projectId = toNumber(transaction.projectId, 0);
    if (!projectId || transactionByProjectId.has(projectId)) {
      continue;
    }
    transactionByProjectId.set(projectId, transaction);
  }

  const orders = hireRequests.data.map((entry, index) => {
    const record = asRecord(entry);
    const projectId = toNumber(record.projectId, 0);
    const matchedTransaction = projectId ? transactionByProjectId.get(projectId) ?? null : null;
    return {
      id: toText(record.projectId ?? record.id ?? index + 1),
      gigId: toText(record.gigId),
      projectId,
      roomId: toText(record.roomId),
      title: toText(record.gigTitle, "Untitled project"),
      freelancerName: toText(record.freelancerName ?? record.freelancerId, "Freelancer"),
      dueDate: toText(record.deadline, "No deadline"),
      price: toNumber(record.projectAgreedPrice ?? record.agreedPrice, 0),
      status: normalizeStatus(record.projectStatus ?? record.status ?? "pending"),
      category: toText(record.category, "General"),
      paymentStatus: matchedTransaction?.status ?? "",
      paymentTranId: matchedTransaction?.tranId ?? "",
      paymentSubmittedAt: matchedTransaction?.submittedAt ?? matchedTransaction?.createdAt ?? "",
    };
  });

  const filteredOrders = orders.filter((order) => {
    const matchesFilter = filter === "all" || order.status.includes(filter);
    const safeSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !safeSearch ||
      order.title.toLowerCase().includes(safeSearch) ||
      order.freelancerName.toLowerCase().includes(safeSearch) ||
      order.category.toLowerCase().includes(safeSearch);

    return matchesFilter && matchesSearch;
  });

  const paidTransactions = transactions.data.filter(
    (transaction) => normalizeStatus(transaction.status).includes("paid"),
  );
  const submittedTransactions = transactions.data.filter(
    (transaction) => normalizeStatus(transaction.status).includes("submitted"),
  );

  const totalSpent = paidTransactions.reduce<number>(
    (sum, transaction) =>
      sum + toNumber(transaction.amount, 0),
    0,
  );

  return (
    <div className="mx-auto max-w-full bg-[#f8fafc] px-8 pt-12">
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold text-[#111827]">My Orders</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Track all your hired projects and freelancer engagements.
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
          href="/client/browse-gigs"
        >
          Browse Gigs
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Orders", value: orders.length, note: "All time" },
          { label: "Active", value: orders.filter((order) => order.status.includes("progress")).length, note: "Currently running" },
          { label: "Completed", value: orders.filter((order) => order.status.includes("complete")).length, note: "Successfully delivered" },
          {
            label: "Total Spent",
            value: formatMoney(totalSpent),
            note: `${submittedTransactions.length} awaiting seller confirmation`,
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#2563eb]">
              •
            </div>
            <p className="mt-5 text-3xl font-semibold text-[#111827]">{card.value}</p>
            <p className="mt-1 text-sm font-medium text-[#111827]">{card.label}</p>
            <p className="mt-1 text-xs text-[#9ca3af]">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <input
          className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#2563eb] lg:max-w-xl"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by title, freelancer, or category..."
          value={searchTerm}
        />

        <div className="flex flex-wrap gap-2">
          {["all", "pending", "accepted", "rejected", "completed", "cancelled", "progress"].map((value) => (
            <button
              key={value}
              className={
                filter === value
                  ? "rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white transition"
                  : "rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-[#4b5563] transition hover:bg-[#f9fafb]"
              }
              onClick={() => setFilter(value)}
              type="button"
            >
              {statusLabel(value)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {hireRequests.error || projects.error || transactions.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {hireRequests.error || projects.error || transactions.error}
          </div>
        ) : hireRequests.isLoading || projects.isLoading || transactions.isLoading ? (
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 text-sm text-[#6b7280]">
            Loading your orders...
          </div>
        ) : filteredOrders.length ? (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-[#e5e7eb] bg-white p-5 transition hover:shadow-sm"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#111827]">{order.title}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
                    <span>{order.freelancerName}</span>
                    <span>Due {order.dueDate}</span>
                    <span>{formatMoney(order.price)}</span>
                    <span className="rounded-md bg-[#f3f4f6] px-2 py-1 text-[10px] font-medium text-[#6b7280]">
                      {order.category}
                    </span>
                  </div>

                  {order.paymentStatus ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-3 py-1 font-medium ${paymentStatusClass(order.paymentStatus)}`}>
                        Payment {paymentStatusLabel(order.paymentStatus)}
                      </span>
                      {order.paymentTranId ? (
                        <span className="text-[#6b7280]">Transaction {order.paymentTranId}</span>
                      ) : null}
                      {order.paymentSubmittedAt ? (
                        <span className="text-[#6b7280]">Updated {order.paymentSubmittedAt}</span>
                      ) : null}
                    </div>
                  ) : order.status.includes("complete") ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Work is completed. Submit your manual payment proof to move this order to paid.
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col gap-3 xl:w-[190px]">
                  {order.projectId ? (
                    <Link
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
                      href={`/client/my-orders/${order.projectId}`}
                    >
                      View Details
                    </Link>
                  ) : null}

                  {order.gigId && order.projectId && order.status.includes("complete") ? (
                    <Link
                      className={
                        order.paymentStatus
                          ? "inline-flex items-center justify-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
                          : "inline-flex items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#15803d]"
                      }
                      href={`/client/browse-gigs/gig/${order.gigId}/confirm-order?mode=pay&projectId=${order.projectId}${order.roomId ? `&roomId=${order.roomId}` : ""}`}
                    >
                      {order.paymentStatus
                        ? normalizeStatus(order.paymentStatus).includes("paid")
                          ? "View Payment"
                          : "Check Payment"
                        : "Submit Payment"}
                    </Link>
                  ) : null}

                  {order.roomId ? (
                    <Link
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                      href={`/client/${order.roomId}/chat`}
                    >
                      Open Chat
                    </Link>
                  ) : (
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white opacity-70"
                      disabled
                      type="button"
                    >
                      Chat Pending
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-white p-10 text-center">
            <h3 className="text-lg font-semibold text-[#111827]">No orders found</h3>
            <p className="mt-2 text-sm text-[#6b7280]">
              Try changing the filter or searching with another keyword.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
