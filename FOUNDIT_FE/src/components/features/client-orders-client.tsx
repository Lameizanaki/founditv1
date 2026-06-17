"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ClipboardList, CreditCard, LoaderCircle } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";
import { asRecord, formatMoney, normalizeStatus, toNumber, toText } from "@/lib/data-utils";
import type { PaymentTransactionResponse } from "@/types/payment";

const statusLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const statusClass = (value: string) => {
  const status = normalizeStatus(value);
  if (status.includes("accept") || status.includes("progress")) {
    return "bg-blue-50 text-blue-600";
  }
  if (status.includes("complete")) {
    return "bg-green-100 text-green-600";
  }
  if (status.includes("reject") || status.includes("cancel")) {
    return "bg-red-100 text-red-500";
  }
  return "bg-amber-100 text-amber-600";
};

const paymentStatusLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const paymentStatusClass = (value: string) => {
  const status = normalizeStatus(value);
  if (status.includes("paid")) {
    return "bg-green-100 text-green-600";
  }
  if (status.includes("submitted")) {
    return "bg-amber-100 text-amber-600";
  }
  if (status.includes("cancel") || status.includes("fail")) {
    return "bg-red-100 text-red-500";
  }
  return "bg-blue-50 text-blue-600";
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
    <div className="mx-auto max-w-full bg-slate-50 px-8 pt-12">
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold text-slate-900">My Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track all your hired projects and freelancer engagements.
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
          href="/client/browse-gigs"
        >
          Browse Gigs
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Orders", value: orders.length, note: "All time", icon: ClipboardList },
          { label: "Active", value: orders.filter((order) => order.status.includes("progress")).length, note: "Currently running", icon: LoaderCircle },
          { label: "Completed", value: orders.filter((order) => order.status.includes("complete")).length, note: "Successfully delivered", icon: CheckCircle2 },
          {
            label: "Total Spent",
            value: formatMoney(totalSpent),
            note: `${submittedTransactions.length} awaiting seller confirmation`,
            icon: CreditCard,
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-5 text-3xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{card.label}</p>
            <p className="mt-1 text-xs text-slate-400">{card.note}</p>
          </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <input
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 lg:max-w-xl"
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
                  ? "rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition"
                  : "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading your orders...
          </div>
        ) : filteredOrders.length ? (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{order.title}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{order.freelancerName}</span>
                    <span>Due {order.dueDate}</span>
                    <span>{formatMoney(order.price)}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
                      {order.category}
                    </span>
                  </div>

                  {order.paymentStatus ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-3 py-1 font-medium ${paymentStatusClass(order.paymentStatus)}`}>
                        Payment {paymentStatusLabel(order.paymentStatus)}
                      </span>
                      {order.paymentTranId ? (
                        <span className="text-slate-500">Transaction {order.paymentTranId}</span>
                      ) : null}
                      {order.paymentSubmittedAt ? (
                        <span className="text-slate-500">Updated {order.paymentSubmittedAt}</span>
                      ) : null}
                    </div>
                  ) : order.status.includes("deliver") ? (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                      The freelancer has delivered the work. Review it in chat, then approve delivery to continue to payment.
                    </div>
                  ) : order.status.includes("complete") ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Delivery approved. Submit your payment proof now to finish the order.
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col gap-3 xl:w-[190px]">
                  {order.projectId ? (
                    <Link
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      href={`/client/my-orders/${order.projectId}`}
                    >
                      View Details
                    </Link>
                  ) : null}

                  {order.gigId && order.projectId && order.status.includes("complete") ? (
                    <Link
                      className={
                        order.paymentStatus
                          ? "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          : "inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
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
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                      href={`/client/${order.roomId}/chat`}
                    >
                      Open Chat
                    </Link>
                  ) : (
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white opacity-70"
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
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No orders found</h3>
            <p className="mt-2 text-sm text-slate-500">
              Try changing the filter or searching with another keyword.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
