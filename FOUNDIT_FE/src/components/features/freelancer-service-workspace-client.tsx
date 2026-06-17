"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { asRecord, buildImageSource, formatMoney, normalizeStatus, toNumber, toText } from "@/lib/data-utils";

type WorkspaceMode = "view" | "edit";

const actionButtonClass =
  "rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export function FreelancerServiceWorkspaceClient({
  gigId,
  mode,
}: {
  gigId: string;
  mode: WorkspaceMode;
}) {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const gig = useApiQuery<unknown>({
    endpoint: `/freelancer/gigs/${gigId}`,
    initialData: {},
  });

  const record = asRecord(gig.data);
  const image = buildImageSource({
    data: record.gigMainImageData,
    contentType: record.gigMainImageContentType,
    url: record.gigMainImageUrl,
  });

  const [draft, setDraft] = useState({
    title: "",
    category: "",
    description: "",
    tags: "",
  });
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const effectiveTitle = draft.title || toText(record.serviceTitle, "");
  const effectiveCategory = draft.category || toText(record.category, "");
  const effectiveDescription = draft.description || toText(record.serviceDescription, "");
  const effectiveTags =
    draft.tags ||
    (Array.isArray(record.tags)
      ? record.tags.map((tag) => toText(tag, "")).filter(Boolean).join(", ")
      : toText(record.tags, ""));
  const previewImage = mainImageFile ? URL.createObjectURL(mainImageFile) : image;

  const saveOverview = async () => {
    if (!token) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/freelancer/${gigId}/overview`, {
        method: "PUT",
        token,
        body: {
          serviceTitle: effectiveTitle,
          category: effectiveCategory,
          serviceDescription: effectiveDescription,
          tags: effectiveTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
      });
      await gig.refresh();
      setMessage("Service overview updated.");
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  const updateMainImage = async () => {
    if (!token || !mainImageFile) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = new FormData();
      payload.append("main", mainImageFile, mainImageFile.name);
      await apiRequest(`/freelancer/${gigId}/publish-service`, {
        method: "PUT",
        token,
        body: payload,
      });
      setMainImageFile(null);
      await gig.refresh();
      setMessage("Service image updated.");
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (action: "pause" | "resume" | "disable") => {
    if (!token) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/freelancer/gigs/${gigId}/${action}`, {
        method: "PUT",
        token,
      });
      await gig.refresh();
      setMessage(
        action === "disable"
          ? "Service removed from the marketplace."
          : `Service ${action}d successfully.`,
      );
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  const status = toText(record.status, "Draft");
  const normalizedStatus = normalizeStatus(status);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <Link
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        href="/freelancer/my-services"
      >
        Back to My Services
      </Link>

      {gig.error || error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || gig.error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {mode === "edit" ? "Edit Service" : "Service Details"}
              </p>
              <h1 className="mt-2 text-[32px] font-semibold text-slate-900">
                {effectiveTitle || toText(record.serviceTitle, "Untitled service")}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Use this workspace to review your listing, update the overview and image, and control visibility.
              </p>
            </div>

            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              {status}
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={toText(record.serviceTitle, "Service image")} className="h-[280px] w-full object-cover" src={previewImage} />
          </div>

          {mode === "edit" ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Update service image</p>
                <p className="mt-1 text-xs text-slate-500">
                  Replace the main image shown on your listing card and detail page.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  {mainImageFile ? mainImageFile.name : "Choose image"}
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => setMainImageFile(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
                <button
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-950 disabled:opacity-60"
                  disabled={isSaving || !mainImageFile}
                  onClick={() => void updateMainImage()}
                  type="button"
                >
                  {isSaving ? "Updating..." : "Update Image"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Service Title</label>
              <input
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-green-600"
                disabled={mode !== "edit"}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                value={effectiveTitle}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
              <input
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-green-600"
                disabled={mode !== "edit"}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                value={effectiveCategory}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Tags</label>
            <input
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-green-600"
              disabled={mode !== "edit"}
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
              value={effectiveTags}
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-green-600"
              disabled={mode !== "edit"}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={7}
              value={effectiveDescription}
            />
          </div>

          {mode === "edit" ? (
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                disabled={isSaving}
                onClick={() => void saveOverview()}
                type="button"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Performance</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["Price", formatMoney(toNumber(record.price, 0))],
                ["Views", String(toNumber(record.views ?? record.viewCount, 0))],
                ["Orders", String(toNumber(record.orders, 0))],
                ["Rating", toNumber(record.rating, 0).toFixed(1)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Listing Controls</h2>
            <p className="mt-2 text-sm text-slate-500">
              Pause, resume, or remove the service from client browsing while keeping your past order records.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className={`${actionButtonClass} border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100`}
                disabled={isSaving || normalizedStatus.includes("pause")}
                onClick={() => void updateStatus("pause")}
                type="button"
              >
                Pause
              </button>
              <button
                className={`${actionButtonClass} border-green-600 bg-green-50 text-green-800 hover:bg-green-100`}
                disabled={isSaving || normalizedStatus.includes("active")}
                onClick={() => void updateStatus("resume")}
                type="button"
              >
                Resume
              </button>
              <button
                className={`${actionButtonClass} border-red-500 bg-red-50 text-red-700 hover:bg-red-100`}
                disabled={isSaving || normalizedStatus.includes("disable")}
                onClick={() => void updateStatus("disable")}
                type="button"
              >
                Delete
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold !text-white transition visited:!text-white hover:!text-white hover:bg-slate-950 focus:!text-white"
                href={`/freelancer/my-services/${gigId}/edit`}
              >
                Edit Service
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
