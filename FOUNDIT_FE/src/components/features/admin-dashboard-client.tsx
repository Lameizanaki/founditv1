"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { buildImageSource, formatMoney, toNumber, toText } from "@/lib/data-utils";

type PendingReview = {
  ekycId: number;
  registerId: number | null;
  username: string | null;
  email: string | null;
  role: string | null;
  fullName: string | null;
  phoneNumber: string | null;
  nationality: string | null;
  country: string | null;
  status: string | null;
  failureReason: string | null;
  documentId: string | null;
};

type EkycDetail = PendingReview & {
  dateOfBirth: string | null;
  gender: string | null;
  ocrVerified: boolean | null;
  faceVerified: boolean | null;
  frontIdData: unknown;
  frontIdType: string | null;
  backIdData: unknown;
  backIdType: string | null;
  liveFaceData: unknown;
  liveFaceType: string | null;
};

type DashboardData = {
  totalFreelancers: number;
  totalClients: number;
  totalUsers: number;
  totalRevenue: number;
  paidPaymentRecords: number;
  pendingRevenue: number;
  submittedPaymentRecords: number;
  pendingReviews: number;
  pendingReviewItems: PendingReview[];
};

const initialDashboard: DashboardData = {
  totalFreelancers: 0,
  totalClients: 0,
  totalUsers: 0,
  totalRevenue: 0,
  paidPaymentRecords: 0,
  pendingRevenue: 0,
  submittedPaymentRecords: 0,
  pendingReviews: 0,
  pendingReviewItems: [],
};

const toFlag = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
};

const summarizeFailureReason = (value: string | null) => {
  const text = toText(value, "").trim();
  if (!text) {
    return "Waiting for admin review";
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const liveFace = (parsed.live_face ?? {}) as Record<string, unknown>;
    const ocr = (parsed.ocr ?? parsed.document ?? {}) as Record<string, unknown>;
    const notes: string[] = [];

    if (toText(parsed.status, "").toLowerCase() === "failed") {
      notes.push("Automated verification needs manual review.");
    }

    const livenessPassed = toFlag(liveFace.liveness_passed);
    const livenessConfidence = toNumber(liveFace.liveness_confidence, 0);
    if (toFlag(liveFace.captured)) {
      notes.push(
        livenessPassed === false
          ? `Live face was captured but the liveness check did not pass${livenessConfidence ? ` (${livenessConfidence.toFixed(2)} confidence)` : ""}.`
          : livenessPassed === true
            ? `Live face capture passed${livenessConfidence ? ` (${livenessConfidence.toFixed(2)} confidence)` : ""}.`
            : "Live face was captured for manual review.",
      );
    }

    const ocrMatched = toFlag(ocr.matched ?? ocr.ocr_verified);
    if (ocrMatched === false) {
      notes.push("ID document details did not fully match the submitted profile.");
    } else if (ocrMatched === true) {
      notes.push("ID document details were extracted successfully.");
    }

    const message = toText(parsed.message, "");
    if (message) {
      notes.push(message);
    }

    return notes.join(" ") || "Automated verification details are available for admin review.";
  } catch {
    return text;
  }
};

export function AdminDashboardClient() {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const [dashboard, setDashboard] = useState<DashboardData>(initialDashboard);
  const [selectedReview, setSelectedReview] = useState<EkycDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadDashboard = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const nextDashboard = await apiRequest<DashboardData>("/admin/dashboard", { token });
      setDashboard(nextDashboard);
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
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openReview = async (ekycId: number) => {
    if (!token) return;
    setDetailLoadingId(ekycId);
    setError(null);

    try {
      const detail = await apiRequest<EkycDetail>(`/admin/ekyc/${ekycId}`, { token });
      setSelectedReview(detail);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setDetailLoadingId(null);
    }
  };

  const updateReview = async (ekycId: number, action: "approve" | "reject") => {
    if (!token) return;
    setActionLoadingId(ekycId);
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/admin/ekyc/${ekycId}/${action}`, {
        method: "PUT",
        token,
      });
      setDashboard((current) => ({
        ...current,
        pendingReviews: Math.max(0, current.pendingReviews - 1),
        pendingReviewItems: current.pendingReviewItems.filter((item) => item.ekycId !== ekycId),
      }));
      if (selectedReview?.ekycId === ekycId) {
        setSelectedReview(null);
      }
      setMessage(action === "approve" ? "E-KYC approved." : "E-KYC rejected.");
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setActionLoadingId(null);
    }
  };

  const stats = [
    {
      title: "Total Freelancers",
      value: String(toNumber(dashboard.totalFreelancers)),
      badge: "Live",
      tone: "bg-[#eef2ff] text-[#4f46e5]",
    },
    {
      title: "Total Clients",
      value: String(toNumber(dashboard.totalClients)),
      badge: "Live",
      tone: "bg-[#ecfdf5] text-[#10b981]",
    },
    {
      title: "Total Users",
      value: String(toNumber(dashboard.totalUsers)),
      badge: "Registered",
      tone: "bg-[#f0f9ff] text-[#0284c7]",
    },
    {
      title: "Total Earnings",
      value: formatMoney(0),
      badge: "Paid",
      tone: "bg-[#f0fdf4] text-[#16a34a]",
    },
    {
      title: "Paid Records",
      value: String(toNumber(dashboard.paidPaymentRecords)),
      badge: "Payments",
      tone: "bg-[#fef3c7] text-[#d97706]",
    },
    {
      title: "Pending Earnings",
      value: formatMoney(dashboard.pendingRevenue),
      badge: `${toNumber(dashboard.submittedPaymentRecords)} submitted`,
      tone: "bg-[#fffbeb] text-[#ca8a04]",
    },
    {
      title: "Pending Reviews",
      value: String(toNumber(dashboard.pendingReviews)),
      badge: toNumber(dashboard.pendingReviews) > 0 ? "Attention" : "Clear",
      tone: "bg-[#fff7ed] text-[#f97316]",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-8 md:px-6 lg:px-10">
      <div className="mb-2">
        <h1 className="text-[28px] font-semibold leading-tight text-[#222]">Dashboard Overview</h1>
        <p className="mt-2 text-[15px] text-[#6b7280]">
          Monitor platform activity and review pending verification work.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm text-[#9a3412]">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-sm text-[#166534]">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.title} className="min-h-40 rounded-2xl border border-[#e5e7eb] bg-white px-5 py-5">
            <div className="mb-10 flex items-start justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.tone}`}>•</div>
              <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-[#f3f4f6] px-2 py-1 text-[12px] font-medium leading-none text-[#4b5563]">
                {stat.badge}
              </span>
            </div>
            <div>
              <p className="text-[15px] text-[#6b7280]">{stat.title}</p>
              <h2 className="mt-1 text-[24px] font-medium leading-none text-[#222]">{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#e5e7eb] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[#111827]">Pending E-KYC Reviews</h2>
            <p className="text-sm text-[#6b7280]">Identity verification requests waiting for admin review.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-medium text-[#c2410c]">
              {dashboard.pendingReviewItems.length} pending
            </span>
            <button
              className="rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
              onClick={() => void loadDashboard()}
              type="button"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="max-h-[420px] min-h-64 overflow-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="sticky top-0 bg-[#f9fafb] text-[#6b7280]">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Identity</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Failure</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.pendingReviewItems.map((review) => (
                <tr key={review.ekycId} className="border-t border-[#e5e7eb]">
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#111827]">{toText(review.username, "Unknown user")}</p>
                    <p className="text-xs text-[#6b7280]">{toText(review.email, "No email")}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-medium text-[#4338ca]">
                      {toText(review.role, "Unknown")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#111827]">{toText(review.fullName, "No full name")}</p>
                    <p className="text-xs text-[#6b7280]">
                      {toText(review.nationality, "No nationality")} · {toText(review.country, "No country")}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-[#374151]">{toText(review.phoneNumber, "No phone")}</td>
                  <td className="max-w-md px-5 py-4">
                    <p className="line-clamp-2 text-[#6b7280]">
                      {summarizeFailureReason(review.failureReason)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-md border border-[#d1d5db] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] disabled:opacity-60"
                        disabled={detailLoadingId === review.ekycId}
                        onClick={() => void openReview(review.ekycId)}
                        type="button"
                      >
                        {detailLoadingId === review.ekycId ? "Loading..." : "View"}
                      </button>
                      <button
                        className="rounded-md bg-[#10b981] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                        disabled={actionLoadingId === review.ekycId}
                        onClick={() => void updateReview(review.ekycId, "approve")}
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-md border border-[#fecaca] bg-white px-3 py-1.5 text-xs font-medium text-[#b91c1c] disabled:opacity-60"
                        disabled={actionLoadingId === review.ekycId}
                        onClick={() => void updateReview(review.ekycId, "reject")}
                        type="button"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && dashboard.pendingReviewItems.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-[#6b7280]" colSpan={6}>
                    No E-KYC reviews are waiting.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedReview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => setSelectedReview(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-lg bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#e5e7eb] px-6 py-4">
              <div>
                <h3 className="text-[18px] font-semibold text-[#111827]">E-KYC Review Detail</h3>
                <p className="text-sm text-[#6b7280]">
                  {toText(selectedReview.username, "Unknown user")} · {toText(selectedReview.email, "No email")}
                </p>
              </div>
              <button
                className="rounded-md px-3 py-1.5 text-sm text-[#374151] hover:bg-[#f3f4f6]"
                onClick={() => setSelectedReview(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 px-6 py-5 lg:grid-cols-[320px_1fr]">
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-[#e5e7eb] p-4">
                  <p className="text-xs font-medium uppercase text-[#6b7280]">Identity</p>
                  <dl className="mt-3 space-y-2">
                    {[
                      ["Full name", toText(selectedReview.fullName, "N/A")],
                      ["Document ID", toText(selectedReview.documentId, "Not extracted")],
                      ["DOB", toText(selectedReview.dateOfBirth, "N/A")],
                      ["Gender", toText(selectedReview.gender, "N/A")],
                      ["Nationality", toText(selectedReview.nationality, "N/A")],
                      ["Country", toText(selectedReview.country, "N/A")],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3">
                        <dt className="text-[#6b7280]">{label}</dt>
                        <dd className="text-right font-medium text-[#111827]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="rounded-lg border border-[#e5e7eb] p-4">
                  <p className="text-xs font-medium uppercase text-[#6b7280]">Checks</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${selectedReview.ocrVerified ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fff7ed] text-[#9a3412]"}`}>
                      OCR {selectedReview.ocrVerified ? "passed" : "review"}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${selectedReview.faceVerified ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fff7ed] text-[#9a3412]"}`}>
                      Face {selectedReview.faceVerified ? "passed" : "review"}
                    </span>
                  </div>
                  <p className="mt-3 max-h-32 overflow-auto rounded-md bg-[#f9fafb] p-3 text-xs text-[#6b7280]">
                    {summarizeFailureReason(selectedReview.failureReason)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    label: "Front ID",
                    data: selectedReview.frontIdData,
                    type: selectedReview.frontIdType,
                  },
                  {
                    label: "Back ID",
                    data: selectedReview.backIdData,
                    type: selectedReview.backIdType,
                  },
                  {
                    label: "Live Face",
                    data: selectedReview.liveFaceData,
                    type: selectedReview.liveFaceType,
                  },
                ].map((item) => {
                  const src = buildImageSource({
                    data: item.data,
                    contentType: item.type,
                    fallback: "",
                  });
                  return (
                    <div key={item.label} className="rounded-lg border border-[#e5e7eb] p-3">
                      <p className="mb-2 text-sm font-medium text-[#111827]">{item.label}</p>
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={item.label} className="aspect-[4/3] w-full rounded-md bg-[#f9fafb] object-contain" src={src} />
                      ) : (
                        <p className="py-16 text-center text-sm text-[#6b7280]">No image</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
