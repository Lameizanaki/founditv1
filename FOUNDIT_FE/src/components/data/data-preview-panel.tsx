"use client";

import { useEffect, useState } from "react";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

const requestPreview = (endpoint: string, token: string) =>
  apiRequest<unknown>(endpoint, {
    token,
  });

const sanitizePreview = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizePreview);
  }

  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value.length > 180) {
      return `[omitted long string: ${value.length} chars]`;
    }
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, innerValue]) => {
      if (typeof innerValue === "string" && innerValue.length > 180) {
        return [key, `[omitted long string: ${innerValue.length} chars]`];
      }

      return [key, sanitizePreview(innerValue)];
    }),
  );
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "string") {
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }

  if (Array.isArray(value)) {
    return `${value.length} item(s)`;
  }

  return "Available";
};

const buildSummary = (value: unknown) => {
  const sanitized = sanitizePreview(value);

  if (Array.isArray(sanitized)) {
    const first = sanitized[0];
    const firstRecord =
      first && typeof first === "object" && !Array.isArray(first)
        ? Object.entries(first as Record<string, unknown>).slice(0, 4)
        : [];

    return {
      headline: `${sanitized.length} record(s) loaded`,
      items: firstRecord.map(([key, innerValue]) => ({
        key,
        value: formatValue(innerValue),
      })),
    };
  }

  if (sanitized && typeof sanitized === "object") {
    const entries = Object.entries(sanitized as Record<string, unknown>).slice(0, 6);
    return {
      headline: `${entries.length} fields available`,
      items: entries.map(([key, innerValue]) => ({
        key,
        value: formatValue(innerValue),
      })),
    };
  }

  return {
    headline: "Response loaded",
    items: [
      {
        key: "value",
        value: formatValue(sanitized),
      },
    ],
  };
};

export function DataPreviewPanel({
  title,
  endpoint,
  description,
  emptyMessage,
}: {
  title: string;
  endpoint: string;
  description: string;
  emptyMessage: string;
}) {
  const { session, status } = useAuth();
  const token = session?.token ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<unknown>(null);

  const loadPreview = async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await requestPreview(endpoint, token);
      setPayload(data);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated" || !token) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await requestPreview(endpoint, token);
        if (!cancelled) {
          setPayload(data);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(toErrorMessage(nextError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [endpoint, status, token]);

  const preview =
    payload === null
      ? emptyMessage
      : JSON.stringify(sanitizePreview(payload), null, 2) || emptyMessage;
  const summary = payload === null ? null : buildSummary(payload);

  return (
    <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b7280]">
            Connected data
          </p>
          <h2 className="mt-2 text-[18px] font-bold text-[#111827]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">{description}</p>
        </div>
        <button
          className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
          onClick={() => void loadPreview()}
          type="button"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-[#6b7280]">{endpoint}</p>
        {isLoading ? (
          <p className="text-sm text-[#6b7280]">Loading response...</p>
        ) : error ? (
          <div className="space-y-2">
            <p className="font-semibold text-[#b91c1c]">Request failed</p>
            <p className="text-sm text-[#7f1d1d]">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {summary ? (
              <div>
                <p className="text-sm font-semibold text-[#111827]">{summary.headline}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {summary.items.map((item) => (
                    <div key={item.key} className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b7280]">
                        {item.key}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#111827]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <details className="rounded-xl border border-[#e5e7eb] bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#374151]">
                View raw response
              </summary>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[#111827]">
                {preview}
              </pre>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}
