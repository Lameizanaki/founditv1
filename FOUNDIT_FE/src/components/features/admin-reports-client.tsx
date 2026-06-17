"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { formatDate, toText } from "@/lib/data-utils";

type ReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";

type AccountReport = {
  id: number;
  userId: number | null;
  username: string | null;
  email: string | null;
  role: string | null;
  accountStatus: string | null;
  subject: string | null;
  message: string | null;
  status: ReportStatus;
  adminNote: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export function AdminReportsClient() {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const [reports, setReports] = useState<AccountReport[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadReports = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const nextReports = await apiRequest<AccountReport[]>("/admin/reports", { token });
      setReports(nextReports);
      if (nextReports.length && selectedId == null) {
        setSelectedId(nextReports[0].id);
        setAdminNote(toText(nextReports[0].adminNote));
      }
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
      void loadReports();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const updateReport = async (status: ReportStatus) => {
    if (!token || !selectedReport) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await apiRequest<AccountReport>(`/admin/reports/${selectedReport.id}`, {
        method: "PUT",
        token,
        body: {
          status,
          adminNote: adminNote.trim() || null,
        },
      });
      setReports((current) => current.map((report) => (report.id === updated.id ? updated : report)));
      setAdminNote(toText(updated.adminNote));
      setMessage(`Report marked as ${status.toLowerCase()}.`);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  const counts = {
    pending: reports.filter((report) => report.status === "PENDING").length,
    reviewed: reports.filter((report) => report.status === "REVIEWED").length,
    resolved: reports.filter((report) => report.status === "RESOLVED").length,
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-8 md:px-6 lg:px-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold text-slate-900">Reports</h1>
            <p className="mt-2 text-[15px] text-slate-500">
              Review account reports, leave admin notes, and close moderation requests.
            </p>
          </div>
          <button
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            onClick={() => void loadReports()}
            type="button"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["Pending", counts.pending, "bg-orange-50 text-orange-700"],
          ["Reviewed", counts.reviewed, "bg-blue-50 text-indigo-700"],
          ["Resolved", counts.resolved, "bg-emerald-50 text-green-800"],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`inline-flex rounded-xl px-3 py-2 text-sm font-semibold ${tone}`}>{label}</div>
            <p className="mt-5 text-3xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Report Queue</h2>
          </div>
          <div className="max-h-[680px] overflow-y-auto">
            {reports.map((report) => (
              <button
                key={report.id}
                className={
                  selectedId === report.id
                    ? "w-full border-b border-slate-200 bg-slate-50 px-5 py-4 text-left"
                    : "w-full border-b border-slate-200 px-5 py-4 text-left transition hover:bg-slate-50"
                }
                onClick={() => {
                  setSelectedId(report.id);
                  setAdminNote(toText(report.adminNote));
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {toText(report.subject, "Suspended account review request")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {toText(report.username, "Unknown user")} / {toText(report.email, "No email")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      report.status === "PENDING"
                        ? "bg-orange-50 text-orange-700"
                        : report.status === "RESOLVED"
                          ? "bg-emerald-50 text-green-800"
                          : report.status === "DISMISSED"
                            ? "bg-red-50 text-red-700"
                            : "bg-blue-50 text-indigo-700"
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{toText(report.message, "No message")}</p>
                <p className="mt-3 text-xs text-slate-400">{formatDate(report.createdAt)}</p>
              </button>
            ))}
            {!isLoading && reports.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">No reports were submitted.</div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedReport ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">{toText(selectedReport.subject, "Report detail")}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {toText(selectedReport.username, "Unknown user")} / {toText(selectedReport.role, "Unknown role")} / {toText(selectedReport.accountStatus, "Unknown status")}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  #{selectedReport.id}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  ["Email", toText(selectedReport.email, "No email")],
                  ["Created", formatDate(selectedReport.createdAt)],
                  ["Updated", formatDate(selectedReport.updatedAt)],
                  ["Status", selectedReport.status],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Report Message</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{toText(selectedReport.message, "No message provided.")}</p>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-slate-700">Admin Note</label>
                <textarea
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-600"
                  onChange={(event) => setAdminNote(event.target.value)}
                  rows={6}
                  value={adminNote}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {(["REVIEWED", "RESOLVED", "DISMISSED"] as ReportStatus[]).map((status) => (
                  <button
                    key={status}
                    className={
                      status === "RESOLVED"
                        ? "rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                        : "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
                    }
                    disabled={isSaving}
                    onClick={() => void updateReport(status)}
                    type="button"
                  >
                    {isSaving ? "Saving..." : `Mark ${status.toLowerCase()}`}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              Select a report to review it.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
