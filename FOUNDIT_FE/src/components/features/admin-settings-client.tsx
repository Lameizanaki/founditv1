"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiRequest, toErrorMessage } from "@/lib/api";

type AdminSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  identityVerificationRequired: boolean;
  maxLoginAttempts: number;
};

const initialSettings: AdminSettings = {
  maintenanceMode: false,
  maintenanceMessage: "",
  identityVerificationRequired: true,
  maxLoginAttempts: 3,
};

export function AdminSettingsClient() {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const [settings, setSettings] = useState<AdminSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSettings = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const nextSettings = await apiRequest<AdminSettings>("/admin/settings", { token });
      setSettings(nextSettings);
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
      void loadSettings();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const saveSettings = async () => {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await apiRequest<AdminSettings>("/admin/settings", {
        method: "PUT",
        token,
        body: settings,
      });
      setSettings(updated);
      setMessage("Platform settings updated.");
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-8 md:px-6 lg:px-10">
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <h1 className="text-[28px] font-semibold text-[#222]">Platform Settings</h1>
        <p className="mt-2 text-[15px] text-[#6b7280]">
          Control maintenance mode, login protection, and identity verification requirements.
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

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          <div className="space-y-6">
            <label className="flex items-start justify-between gap-4 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-5">
              <div>
                <p className="text-base font-semibold text-[#111827]">Maintenance Mode</p>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Temporarily block the app and show a maintenance message.
                </p>
              </div>
              <input
                checked={settings.maintenanceMode}
                className="mt-1 h-5 w-5"
                onChange={(event) =>
                  setSettings((current) => ({ ...current, maintenanceMode: event.target.checked }))
                }
                type="checkbox"
              />
            </label>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">Maintenance Message</label>
              <textarea
                className="w-full rounded-2xl border border-[#d1d5db] bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#2563eb]"
                onChange={(event) =>
                  setSettings((current) => ({ ...current, maintenanceMessage: event.target.value }))
                }
                rows={5}
                value={settings.maintenanceMessage}
              />
            </div>

            <label className="flex items-start justify-between gap-4 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-5">
              <div>
                <p className="text-base font-semibold text-[#111827]">Require Identity Verification</p>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Keep E-KYC mandatory before users can access restricted platform actions.
                </p>
              </div>
              <input
                checked={settings.identityVerificationRequired}
                className="mt-1 h-5 w-5"
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    identityVerificationRequired: event.target.checked,
                  }))
                }
                type="checkbox"
              />
            </label>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">Max Login Attempts</label>
              <input
                className="h-12 w-full rounded-2xl border border-[#d1d5db] bg-white px-4 text-sm text-[#111827] outline-none focus:border-[#2563eb]"
                max={5}
                min={1}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    maxLoginAttempts: Number(event.target.value),
                  }))
                }
                type="number"
                value={settings.maxLoginAttempts}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#f9fafb]"
              onClick={() => void loadSettings()}
              type="button"
            >
              {isLoading ? "Loading..." : "Reset"}
            </button>
            <button
              className="rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b1220] disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void saveSettings()}
              type="button"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Deployment Notes</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[#4b5563]">
            <p>Maintenance mode affects live traffic, so keep the message clear before deploying.</p>
            <p>
              The backend now reads environment overrides, which keeps production settings out of source control.
            </p>
            <p>
              Identity verification should stay enabled if your release depends on controlled gig publishing.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
