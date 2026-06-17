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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-[28px] font-semibold text-slate-900">Platform Settings</h1>
        <p className="mt-2 text-[15px] text-slate-500">
          Control maintenance mode, login protection, and identity verification requirements.
        </p>
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

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-6">
            <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-base font-semibold text-slate-900">Maintenance Mode</p>
                <p className="mt-1 text-sm text-slate-500">
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
              <label className="mb-2 block text-sm font-medium text-slate-700">Maintenance Message</label>
              <textarea
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-600"
                onChange={(event) =>
                  setSettings((current) => ({ ...current, maintenanceMessage: event.target.value }))
                }
                rows={5}
                value={settings.maintenanceMessage}
              />
            </div>

            <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-base font-semibold text-slate-900">Require Identity Verification</p>
                <p className="mt-1 text-sm text-slate-500">
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
              <label className="mb-2 block text-sm font-medium text-slate-700">Max Login Attempts</label>
              <input
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-600"
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
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              onClick={() => void loadSettings()}
              type="button"
            >
              {isLoading ? "Loading..." : "Reset"}
            </button>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-950 disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void saveSettings()}
              type="button"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Deployment Notes</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
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
