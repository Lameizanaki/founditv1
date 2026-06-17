"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";
import { asRecord, formatDate, formatMoney, normalizeStatus, toNumber, toText } from "@/lib/data-utils";
import type { ConversationResponse } from "@/types/chat";
import type { PaymentTransactionResponse } from "@/types/payment";

type TimelineItem = {
  id: string;
  label: string;
  detail: string;
  date: string | null;
  tone: "neutral" | "good" | "warn";
};

const toneClass: Record<TimelineItem["tone"], string> = {
  good: "bg-green-100 text-green-600",
  neutral: "bg-blue-50 text-blue-600",
  warn: "bg-amber-100 text-amber-600",
};

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

export function ClientOrderDetailClient({ projectId }: { projectId: string }) {
  const numericProjectId = toNumber(projectId, 0);
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
  const conversations = useApiQuery<ConversationResponse[]>({
    endpoint: "/api/chat/conversations",
    initialData: [],
  });

  const hireRequest = useMemo(
    () =>
      hireRequests.data
        .map((entry) => asRecord(entry))
        .find((record) => toNumber(record.projectId, 0) === numericProjectId) ?? null,
    [hireRequests.data, numericProjectId],
  );

  const project = useMemo(
    () =>
      projects.data
        .map((entry) => asRecord(entry))
        .find((record) => toNumber(record.id, 0) === numericProjectId) ?? null,
    [numericProjectId, projects.data],
  );

  const transaction = useMemo(
    () =>
      transactions.data.find((entry) => toNumber(entry.projectId, 0) === numericProjectId) ?? null,
    [numericProjectId, transactions.data],
  );

  const conversation = useMemo(() => {
    return (
      conversations.data.find((entry) => entry.projectId === numericProjectId) ??
      (hireRequest
        ? conversations.data.find((entry) => entry.hireRequestId === toNumber(hireRequest.id, 0))
        : null) ??
      null
    );
  }, [conversations.data, hireRequest, numericProjectId]);

  const orderTitle =
    toText(project?.projectTitle, "") ||
    toText(project?.gigTitle, "") ||
    toText(hireRequest?.gigTitle, "") ||
    `Project #${numericProjectId}`;
  const freelancerName =
    toText(transaction?.freelancerName, "") ||
    toText(hireRequest?.freelancerName ?? hireRequest?.freelancerId, "Freelancer");
  const projectStatus = toText(project?.status ?? hireRequest?.projectStatus ?? hireRequest?.status, "pending");
  const paymentStatus = toText(transaction?.status, "");
  const confirmOrderHref = hireRequest?.gigId
    ? `/client/browse-gigs/gig/${hireRequest.gigId}/confirm-order?mode=pay&projectId=${numericProjectId}${
        conversation?.roomId ? `&roomId=${conversation.roomId}` : ""
      }`
    : null;

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    if (hireRequest) {
      items.push({
        date: toText(hireRequest.createdAt, "") || null,
        detail: `Request sent for ${toText(hireRequest.gigTitle, "this gig")}.`,
        id: "request-created",
        label: "Hire Request Created",
        tone: "neutral",
      });

      const requestStatus = normalizeStatus(toText(hireRequest.status, ""));
      if (requestStatus && requestStatus !== "pending") {
        items.push({
          date: toText(hireRequest.updatedAt, "") || null,
          detail: `Request status changed to ${requestStatus.replace(/_/g, " ")}.`,
          id: "request-status",
          label: "Hire Request Updated",
          tone: requestStatus.includes("reject") || requestStatus.includes("cancel") ? "warn" : "good",
        });
      }
    }

    if (project) {
      items.push({
        date: toText(project.createdAt, "") || null,
        detail: `Project moved to ${normalizeStatus(toText(project.status, "in_progress")).replace(/_/g, " ")}.`,
        id: "project-opened",
        label: "Project Started",
        tone: "good",
      });

      if (toText(project.deliveryMessage, "") || toText(project.deliveryFileName, "")) {
        items.push({
          date: toText(project.updatedAt ?? project.deliveryDate, "") || null,
          detail: toText(project.deliveryMessage, "") || "Delivery package uploaded for review.",
          id: "project-delivered",
          label: "Delivery Submitted",
          tone: "warn",
        });
      }

      if (toText(project.revisionMessage, "")) {
        items.push({
          date: toText(project.updatedAt, "") || null,
          detail: toText(project.revisionMessage, "Revision requested."),
          id: "project-revision",
          label: "Revision Requested",
          tone: "warn",
        });
      }
    }

    if (transaction?.submittedAt || transaction?.createdAt) {
      items.push({
        date: transaction.submittedAt ?? transaction.createdAt ?? null,
        detail: transaction.proofReference
          ? `Payment proof submitted with reference ${transaction.proofReference}.`
          : "Payment proof submitted for seller confirmation.",
        id: "payment-submitted",
        label: "Payment Submitted",
        tone: "warn",
      });
    }

    if (transaction?.paidAt) {
      items.push({
        date: transaction.paidAt,
        detail: "Seller confirmed the transfer from their bank app.",
        id: "payment-paid",
        label: "Payment Confirmed",
        tone: "good",
      });
    }

    return items;
  }, [hireRequest, project, transaction]);

  const isLoading =
    hireRequests.isLoading || projects.isLoading || transactions.isLoading || conversations.isLoading;
  const error =
    hireRequests.error || projects.error || transactions.error || conversations.error;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
      <Link className="inline-flex text-sm font-medium text-slate-500 transition hover:text-slate-900" href="/client/my-orders">
        Back to Orders
      </Link>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold text-slate-900">{orderTitle}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Track request, delivery, revision, and payment activity in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {conversation?.roomId ? (
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              href={`/client/${conversation.roomId}/chat`}
            >
              Open Chat
            </Link>
          ) : null}
          {confirmOrderHref ? (
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
              href={confirmOrderHref}
            >
              {paymentStatus ? "View Payment" : "Submit Payment"}
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading order detail...
        </div>
      ) : !hireRequest && !project ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Order not found</h2>
          <p className="mt-2 text-sm text-slate-500">
            This order is not available in your current account history.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
            <div className="mt-5 space-y-4">
              {timeline.length ? (
                timeline.map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-2xl border border-slate-100 p-4">
                    <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${toneClass[item.tone]}`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.date ? formatDate(item.date, "Recently") : "Time not recorded"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No timeline events are available yet.</p>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Freelancer</p>
                  <p className="mt-1 font-medium text-slate-900">{freelancerName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Project Status</p>
                  <p className="mt-1 font-medium text-slate-900">{projectStatus.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Deadline</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {formatDate(project?.deadline ?? hireRequest?.deadline, "No deadline")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Budget</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {formatMoney(
                      toNumber(project?.agreedPrice ?? hireRequest?.projectAgreedPrice ?? hireRequest?.agreedPrice, 0),
                    )}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Payment</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {transaction ? (
                  <>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusClass(paymentStatus)}`}>
                      {paymentStatus.replace(/_/g, " ")}
                    </span>
                    <p>Transaction ID: <span className="font-medium text-slate-900">{transaction.tranId || "Pending"}</span></p>
                    <p>Amount: <span className="font-medium text-slate-900">{formatMoney(toNumber(transaction.amount, 0))}</span></p>
                    {transaction.proofReference ? (
                      <p>Proof reference: <span className="font-medium text-slate-900">{transaction.proofReference}</span></p>
                    ) : null}
                    {transaction.submittedAt ? (
                      <p>Submitted: <span className="font-medium text-slate-900">{formatDate(transaction.submittedAt, "Recently")}</span></p>
                    ) : null}
                    {transaction.paidAt ? (
                      <p>Confirmed: <span className="font-medium text-slate-900">{formatDate(transaction.paidAt, "Recently")}</span></p>
                    ) : null}
                  </>
                ) : (
                  <p>No payment record yet. Payment becomes available after the delivery is approved.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Project Details</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>{toText(project?.requirements ?? hireRequest?.requirements, "No requirements saved yet.")}</p>
                {toText(project?.deliveryMessage, "") ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Delivery Note</p>
                    <p className="mt-1">{toText(project?.deliveryMessage, "")}</p>
                  </div>
                ) : null}
                {toText(project?.revisionMessage, "") ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Revision Note</p>
                    <p className="mt-1">{toText(project?.revisionMessage, "")}</p>
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
