"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiFileRequest, apiRequest, toErrorMessage } from "@/lib/api";
import { asRecord, buildImageSource, formatMoney, normalizeStatus, toNumber, toText } from "@/lib/data-utils";
import { useApiQuery } from "@/hooks/use-api-query";
import type { ConversationResponse } from "@/types/chat";
import type { ManualPaymentSubmitResponse, PaymentTransactionResponse } from "@/types/payment";

const buildSuccessHref = ({
  gigId,
  mode,
  orderId,
  freelancerId,
  roomId,
  requestId,
  projectId,
}: {
  gigId: string;
  mode: "request" | "pay";
  orderId: string;
  freelancerId?: number | null;
  roomId?: number | null;
  requestId?: number | null;
  projectId?: number | null;
}) => {
  const params = new URLSearchParams({
    mode,
    orderId,
  });

  if (freelancerId) {
    params.set("freelancerId", String(freelancerId));
  }

  if (roomId) {
    params.set("roomId", String(roomId));
  }

  if (requestId) {
    params.set("requestId", String(requestId));
  }

  if (projectId) {
    params.set("projectId", String(projectId));
  }

  return `/client/browse-gigs/gig/${gigId}/confirm-order/success-order?${params.toString()}`;
};

const generateOrderId = () => `${Date.now()}`;

export function ClientConfirmOrderClient({ gigId }: { gigId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const token = session?.token ?? null;

  const modeParam = searchParams.get("mode");
  const requestIdParam = toNumber(searchParams.get("requestId"), 0) || null;
  const projectIdParam = toNumber(searchParams.get("projectId"), 0) || null;
  const roomIdParam = toNumber(searchParams.get("roomId"), 0) || null;

  const gig = useApiQuery<unknown>({
    endpoint: `/freelancer/client/gigs/${gigId}`,
    requireAuth: false,
    initialData: {},
  });
  const hireRequests = useApiQuery<unknown[]>({
    endpoint: "/client/hire-requests",
    initialData: [],
  });
  const transactions = useApiQuery<PaymentTransactionResponse[]>({
    endpoint: "/payment/my-transactions",
    initialData: [],
  });

  const [requestMessage, setRequestMessage] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [sellerQrImageUrl, setSellerQrImageUrl] = useState("");
  const [sellerQrError, setSellerQrError] = useState("");
  const [isLoadingSellerQr, setIsLoadingSellerQr] = useState(false);
  const [localPaymentStatus, setLocalPaymentStatus] = useState<"idle" | "submitted" | "paid" | "failed">(
    "idle",
  );
  const [localPaymentTranId, setLocalPaymentTranId] = useState("");
  const [localPaidAt, setLocalPaidAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qrObjectUrlRef = useRef("");
  const pollTimerRef = useRef<number | null>(null);

  const gigRecord = asRecord(gig.data);
  const gigPrice = toNumber(gigRecord.price, 0);
  const serviceFee = Math.round(gigPrice * 0.05);
  const image = buildImageSource({
    data: gigRecord.gigMainImageData,
    contentType: gigRecord.gigMainImageContentType,
    url: gigRecord.gigMainImageUrl,
  });
  const freelancerId = toNumber(gigRecord.freelancerId, 0) || null;

  const matchedRequest = useMemo(() => {
    const records = hireRequests.data
      .map((entry) => asRecord(entry))
      .sort((left, right) => {
        const leftId = toNumber(left.projectId ?? left.id, 0);
        const rightId = toNumber(right.projectId ?? right.id, 0);
        return rightId - leftId;
      });

    if (requestIdParam) {
      return records.find((record) => toNumber(record.id, 0) === requestIdParam) ?? null;
    }

    if (projectIdParam) {
      return records.find((record) => toNumber(record.projectId, 0) === projectIdParam) ?? null;
    }

    const relatedRecords = records.filter((record) => toNumber(record.gigId, 0) === Number(gigId));

    return (
      relatedRecords.find((record) => {
        const requestStatus = normalizeStatus(record.status);
        const projectStatus = normalizeStatus(record.projectStatus);
        const projectId = toNumber(record.projectId, 0) || null;
        const isPaid = projectId
          ? transactions.data.some(
              (transaction) =>
                transaction.projectId === projectId &&
                String(transaction.status ?? "").toUpperCase() === "PAID",
            )
          : false;

        if (projectId) {
          if (isPaid) {
            return false;
          }

          if (["in_progress", "revision_requested", "delivered"].includes(projectStatus)) {
            return true;
          }

          if (projectStatus === "completed" && !isPaid) {
            return true;
          }

          return false;
        }

        if (["pending", "accepted"].includes(requestStatus)) {
          return true;
        }

        return false;
      }) ?? null
    );
  }, [gigId, hireRequests.data, projectIdParam, requestIdParam, transactions.data]);

  const resolvedProjectId = projectIdParam || toNumber(matchedRequest?.projectId, 0) || null;
  const resolvedRequestId = requestIdParam || toNumber(matchedRequest?.id, 0) || null;
  const requestStatus = normalizeStatus(matchedRequest?.status);

  const matchedSubmittedTransaction =
    transactions.data.find(
      (transaction) =>
        transaction.projectId === resolvedProjectId && transaction.status === "PAYMENT_SUBMITTED",
    ) ?? null;
  const matchedPaidTransaction =
    transactions.data.find(
      (transaction) => transaction.projectId === resolvedProjectId && transaction.status === "PAID",
    ) ?? null;

  const effectiveMode: "request" | "pay" =
    modeParam === "pay" || resolvedProjectId ? "pay" : "request";
  const paymentLocked = effectiveMode === "pay" && !resolvedProjectId;
  const paymentStatus =
    matchedPaidTransaction
      ? "paid"
      : matchedSubmittedTransaction
        ? "submitted"
        : localPaymentStatus;
  const paymentTranId =
    matchedPaidTransaction?.tranId ??
    matchedSubmittedTransaction?.tranId ??
    localPaymentTranId;
  const paidAt = matchedPaidTransaction?.paidAt ?? localPaidAt;

  useEffect(() => {
    if (!token) {
      return;
    }

    const qrEndpoint = resolvedProjectId
      ? `/payment/client/project/${resolvedProjectId}/seller-qr/image`
      : `/payment/client/gig/${gigId}/seller-qr/image`;

    const loadSellerQr = async () => {
      setIsLoadingSellerQr(true);
      setSellerQrError("");

      try {
        const blob = await apiFileRequest(qrEndpoint, { token });
        if (qrObjectUrlRef.current) {
          URL.revokeObjectURL(qrObjectUrlRef.current);
        }

        qrObjectUrlRef.current = blob.size > 0 ? URL.createObjectURL(blob) : "";
        setSellerQrImageUrl(qrObjectUrlRef.current);
        setSellerQrError(qrObjectUrlRef.current ? "" : "The seller has not uploaded a bank QR yet.");
      } catch {
        setSellerQrImageUrl("");
        setSellerQrError("The seller has not uploaded a bank QR yet.");
      } finally {
        setIsLoadingSellerQr(false);
      }
    };

    void loadSellerQr();

    return () => {
      if (qrObjectUrlRef.current) {
        URL.revokeObjectURL(qrObjectUrlRef.current);
        qrObjectUrlRef.current = "";
      }
    };
  }, [gigId, resolvedProjectId, token]);

  useEffect(() => {
    if (!token || !paymentTranId || paymentStatus !== "submitted") {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const transaction = await apiRequest<PaymentTransactionResponse>(
          `/payment/${paymentTranId}/status`,
          {
            token,
          },
        );

        if (transaction.status === "PAID") {
          setLocalPaymentStatus("paid");
          setLocalPaidAt(transaction.paidAt ?? null);
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          router.push(
            buildSuccessHref({
              freelancerId,
              gigId,
              mode: "pay",
              orderId: transaction.tranId ?? paymentTranId,
              roomId: roomIdParam,
              projectId: resolvedProjectId,
              requestId: resolvedRequestId,
            }),
          );
        }

        if (transaction.status === "FAILED" || transaction.status === "CANCELLED") {
          setLocalPaymentStatus("failed");
          setSubmitError("Payment was not confirmed. Please contact the seller.");
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      } catch {
        // Keep polling if the backend is temporarily unavailable.
      }
    };

    void poll();
    pollTimerRef.current = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [freelancerId, gigId, paymentStatus, paymentTranId, resolvedProjectId, resolvedRequestId, roomIdParam, router, token]);

  const continueToChat = async () => {
    if (roomIdParam) {
      router.push(`/client/${roomIdParam}/chat`);
      return;
    }

    if (!token || !freelancerId) {
      router.push("/client/chat");
      return;
    }

    try {
      const conversation = await apiRequest<ConversationResponse>("/api/chat/conversations", {
        body: {
          freelancerId,
          gigId: Number(gigId),
        },
        method: "POST",
        token,
      });
      router.push(`/client/${conversation.roomId}/chat`);
    } catch {
      router.push("/client/chat");
    }
  };

  const sendRequest = async () => {
    if (!token) {
      setSubmitError("Please sign in again before sending a request.");
      return;
    }

    if (!freelancerId) {
      setSubmitError("Freelancer data is missing for this gig.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const payload = new FormData();
      payload.append("gigId", gigId);
      payload.append("freelancerId", String(freelancerId));
      payload.append("message", requestMessage.trim());
      payload.append("requestMessage", requestMessage.trim());
      if (gigPrice > 0) {
        payload.append("agreedPrice", String(gigPrice));
      }

      const response = await apiRequest<Record<string, unknown>>("/client/hire-request", {
        body: payload,
        method: "POST",
        token,
      });

      router.push(
        buildSuccessHref({
          freelancerId,
          gigId,
          mode: "request",
          orderId: String(toNumber(response.id, 0) || generateOrderId()),
          roomId: roomIdParam,
          requestId: toNumber(response.id, 0) || null,
        }),
      );
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPaymentProof = async () => {
    if (!token || !resolvedProjectId) {
      setSubmitError("Project ID is missing. Reopen the payment page from chat.");
      return;
    }

    if (!paymentReference.trim() && !selectedProofFile) {
      setSubmitError("Upload a payment screenshot or enter a transaction reference.");
      return;
    }

    if (paymentLocked) {
      setSubmitError("Payment is locked until the project reaches the completed stage.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const payload = new FormData();
      if (paymentReference.trim()) {
        payload.append("reference", paymentReference.trim());
      }
      if (selectedProofFile) {
        payload.append("proof", selectedProofFile, selectedProofFile.name);
      }

      const response = await apiRequest<ManualPaymentSubmitResponse>(
        `/payment/client/project/${resolvedProjectId}/pay`,
        {
          body: payload,
          method: "POST",
          token,
        },
      );

      const tranId = response.tranId ?? response.tran_id ?? "";
      setLocalPaymentTranId(tranId);
      setLocalPaymentStatus(tranId ? "submitted" : "idle");

      if (roomIdParam && freelancerId) {
        try {
          await apiRequest(`/api/chat/rooms/${roomIdParam}/messages`, {
            body: {
              content: JSON.stringify({
                messageType: "formal_notice",
                projectId: resolvedProjectId,
                status: "PAYMENT_SUBMITTED",
                text: "Payment proof was submitted. Please review it and confirm once you receive the transfer.",
                tranId,
                type: "formal_notice",
              }),
              receiverId: freelancerId,
            },
            method: "POST",
            token,
          });
        } catch {
          // Payment proof was already submitted successfully; do not fail the flow on chat notice issues.
        }
      }
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const heading = effectiveMode === "pay" ? "Confirm Payment" : "Confirm Your Order";
  const helperText =
    effectiveMode === "pay"
      ? "Scan the seller QR, then submit your payment proof."
      : "Review your order details and send the request first.";

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <button
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        onClick={() => router.back()}
        type="button"
      >
        Back to Gig
      </button>

      <div className="mt-4">
        <h1 className="text-[34px] font-semibold leading-none text-slate-900">{heading}</h1>
        <p className="mt-2 text-sm text-slate-500">{helperText}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.9fr_0.9fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[18px] font-semibold text-slate-900">Service Details</h2>

            <div className="mt-4 flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={toText(gigRecord.serviceTitle, "Gig")} className="h-[72px] w-[72px] rounded-xl object-cover" src={image} />

              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-slate-900">
                  {toText(gigRecord.serviceTitle, "Untitled service")}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span>{toText(gigRecord.freelancerName, "Freelancer")}</span>
                  <span>{toNumber(gigRecord.rating, 0).toFixed(1)} rating</span>
                </div>
                <div className="mt-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-600">
                  Manual bank transfer
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[18px] font-semibold text-slate-900">Payment Method</h2>

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold text-slate-900">Manual bank transfer</p>
              <p className="mt-1 text-slate-500">
                Scan the seller&apos;s uploaded bank QR, then upload your screenshot or transaction reference.
                The seller confirms after checking their bank app.
              </p>
            </div>

            {isLoadingSellerQr ? (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                Loading seller bank QR...
              </div>
            ) : null}

            {effectiveMode === "pay" && sellerQrImageUrl ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Seller bank QR"
                  className="mx-auto max-h-72 w-full max-w-sm rounded-xl object-contain"
                  src={sellerQrImageUrl}
                />
                <p className="mt-3 text-center text-xs text-slate-500">
                  Scan this QR with your banking app, then submit the payment proof below.
                </p>
              </div>
            ) : null}

            {!sellerQrImageUrl && !isLoadingSellerQr ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                {matchedPaidTransaction
                  ? `This gig is already paid${paidAt ? ` on ${paidAt}` : ""}.`
                  : sellerQrError || "The seller has not uploaded a bank QR yet."}
              </div>
            ) : null}

            {effectiveMode === "pay" ? (
              <div className="mt-4 grid gap-3">
                <label className="text-sm font-semibold text-slate-900">Transaction reference</label>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600"
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="Enter bank transaction ID or note"
                  type="text"
                  value={paymentReference}
                />

                <label className="text-sm font-semibold text-slate-900">Payment screenshot</label>
                <input
                  accept="image/*,.pdf"
                  className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  onChange={(event) => setSelectedProofFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                {selectedProofFile ? (
                  <p className="text-xs text-slate-500">Selected: {selectedProofFile.name}</p>
                ) : null}
              </div>
            ) : null}

            {paymentLocked ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Payment opens after the freelancer delivers the work and you are ready to continue.
              </div>
            ) : null}

            {paymentTranId ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Transaction ID: <span className="font-medium text-slate-900">{paymentTranId}</span>
                {paymentStatus === "submitted" ? (
                  <span className="ml-2 font-medium text-amber-700">Waiting for seller confirmation</span>
                ) : null}
              </div>
            ) : null}
          </section>

          {effectiveMode === "request" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-[18px] font-semibold text-slate-900">Send Request to Freelancer</h2>
              <p className="mt-1 text-xs text-slate-500">
                Write a message to send along with your request.
              </p>

              <textarea
                className="mt-4 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600"
                onChange={(event) => setRequestMessage(event.target.value)}
                placeholder="Hello! I&apos;m interested in your service. Here&apos;s what I need..."
                value={requestMessage}
              />
            </section>
          ) : null}

          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => void continueToChat()}
            type="button"
          >
            Contact Freelancer
          </button>
        </div>

        <div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
            <h2 className="text-[18px] font-semibold text-slate-900">
              {effectiveMode === "pay" ? "Payment Summary" : "Order Summary"}
            </h2>

            {effectiveMode === "pay" && sellerQrImageUrl ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Seller bank QR" className="mx-auto max-h-64 w-full object-contain" src={sellerQrImageUrl} />
                <p className="mt-3 text-center text-xs text-slate-500">
                  {paymentStatus === "paid"
                    ? "Payment completed."
                    : "Scan this seller QR, then submit proof below."}
                </p>
              </div>
            ) : null}

            {submitError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Service Price</span>
                <span className="font-medium text-slate-900">{formatMoney(gigPrice)}</span>
              </div>
              {effectiveMode === "pay" ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Service Fee (5%)</span>
                  <span className="font-medium text-slate-900">{formatMoney(serviceFee)}</span>
                </div>
              ) : null}
            </div>

            <div className="my-5 border-t border-slate-200" />

            <div className="flex items-center justify-between">
              <span className="text-[16px] font-semibold text-slate-900">Total</span>
              <span className="text-[30px] font-bold leading-none text-green-600">
                {formatMoney(gigPrice + (effectiveMode === "pay" ? serviceFee : 0))}
              </span>
            </div>

            {transactions.error || hireRequests.error ? (
              <p className="mt-3 text-xs text-red-600">
                {transactions.error || hireRequests.error}
              </p>
            ) : null}

            {effectiveMode === "request" ? (
              <button
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                onClick={() => void sendRequest()}
                type="button"
              >
                {isSubmitting ? "Sending Request..." : "Send Request"}
              </button>
            ) : (
              <button
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting || paymentStatus === "submitted"}
                onClick={() => void submitPaymentProof()}
                type="button"
              >
                {isSubmitting
                  ? "Submitting Proof..."
                  : paymentStatus === "paid"
                    ? "Payment Confirmed"
                    : paymentStatus === "submitted"
                      ? "Waiting for Seller Confirmation"
                      : "Submit Payment Proof"}
              </button>
            )}

            <div className="mt-4 rounded-xl bg-blue-50 p-4">
              <p className="text-xs text-indigo-600">
                Manual payment means money moves outside the platform. FoundIt only tracks proof
                submission and seller confirmation.
              </p>
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery Time</span>
                <span className="font-medium text-slate-900">
                  {toNumber(gigRecord.deliveryDate, 0) ? `${toNumber(gigRecord.deliveryDate, 0)} days` : "Flexible"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Current Request</span>
                <span className="font-medium text-slate-900">
                  {requestStatus ? requestStatus.replace(/_/g, " ") : "Not sent"}
                </span>
              </div>
            </div>

            {matchedRequest && effectiveMode === "request" ? (
              <div className="mt-5 rounded-xl border border-emerald-100 bg-green-50 p-4 text-sm text-green-800">
                Request status: {requestStatus || "pending"}. Once the freelancer delivers the work,
                you can come back here and submit payment proof.
              </div>
            ) : null}

            {paymentStatus === "paid" ? (
              <Link
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-green-600 bg-white px-4 py-3 text-sm font-semibold text-green-600 transition hover:bg-green-50"
                href={buildSuccessHref({
                  freelancerId,
                  gigId,
                  mode: "pay",
                  orderId: paymentTranId || generateOrderId(),
                  roomId: roomIdParam,
                  projectId: resolvedProjectId,
                  requestId: resolvedRequestId,
                })}
              >
                View Payment Success
              </Link>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
