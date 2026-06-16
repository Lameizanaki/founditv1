"use client";

import Link from "next/link";
import { useState } from "react";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { asRecord, buildImageSource, toText } from "@/lib/data-utils";

type SettingsTab = "personal" | "notifications" | "security";

export function ClientSettingClient() {
  const { session, signOut } = useAuth();
  const token = session?.token ?? null;
  const profile = useApiQuery<unknown>({ endpoint: "/client/me", initialData: {} });
  const [activeTab, setActiveTab] = useState<SettingsTab>("personal");
  const [workLocation, setWorkLocation] = useState("");
  const [about, setAbout] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const record = asRecord(profile.data);
  const avatarSrc = buildImageSource({
    data: record.profilePictureData,
    contentType: record.profilePictureType,
    url: record.profilePictureUrl,
  });

  const currentLocation = workLocation || toText(record.workLocation ?? record.location);
  const currentAbout = about || toText(record.about ?? record.bio);

  const saveProfile = async () => {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const profileId = Number(record.id);
      await apiRequest(`/client/${profileId}/contact-info`, {
        method: "PUT",
        token,
        body: { workLocation: currentLocation },
      });
      await apiRequest(`/client/${profileId}/about`, {
        method: "PUT",
        token,
        body: { about: currentAbout },
      });

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        await apiRequest(`/client/${profileId}/avatar`, {
          method: "PUT",
          token,
          body: formData,
        });
      }

      setMessage("Profile settings saved.");
      setAvatarFile(null);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async () => {
    if (!token) return;
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest("/client/change-password", {
        method: "PUT",
        token,
        body: {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password updated successfully.");
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-[#2563eb]">
              •
            </div>
            <h1 className="text-[22px] font-bold text-[#111827] md:text-[24px]">Client Settings</h1>
          </div>

          <button
            className="inline-flex items-center gap-2 text-sm font-medium text-[#ef4444] transition hover:text-[#dc2626]"
            onClick={signOut}
            type="button"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[170px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            {[
              ["personal", "Personal Information"],
              ["notifications", "Notifications"],
              ["security", "Security"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={
                  activeTab === key
                    ? "mb-1 flex w-full items-center gap-3 rounded-xl bg-[#eef2ff] px-4 py-3 text-left text-sm font-medium text-[#2563eb]"
                    : "mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
                }
                onClick={() => {
                  setActiveTab(key as SettingsTab);
                  setError(null);
                  setMessage(null);
                }}
                type="button"
              >
                <span>{label}</span>
              </button>
            ))}

            <Link
              className="mt-3 flex w-full items-center gap-3 rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-left text-sm font-medium text-[#2563eb] transition hover:bg-[#dbeafe]"
              href="/client/ekyc"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2563eb]">
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 3 5 6v5c0 5.25 3.44 10.16 7 11 3.56-.84 7-5.75 7-11V6l-7-3Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                  <path
                    d="m9.5 12 1.7 1.7L14.8 10"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              <span>
                <span className="block">Identity Verification</span>
                <span className="block text-xs font-normal text-[#5b7fd6]">Open your eKYC flow</span>
              </span>
            </Link>
          </aside>

          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] md:p-6">
            {activeTab === "personal" ? (
              <>
                <h2 className="text-[18px] font-semibold text-[#111827]">Personal Information</h2>
                <div className="mt-5 flex flex-col gap-4 border-b border-[#e5e7eb] pb-6 md:flex-row md:items-center">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full ring-4 ring-[#f3f4f6]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Profile" className="h-full w-full object-cover" src={avatarSrc} />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[#111827]">
                      {toText(record.fullName ?? record.clientName ?? record.username, "Client")}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-sm text-[#6b7280]">
                      <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
                      <span>Client Account</span>
                    </div>

                    <input
                      accept="image/*"
                      className="mt-3 block text-sm text-[#374151] file:mr-3 file:rounded-lg file:border-0 file:bg-[#2563eb] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                      onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                      type="file"
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#374151]">Username</label>
                    <input
                      className="h-12 w-full rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-4 text-sm text-[#111827] outline-none"
                      readOnly
                      value={toText(record.fullName ?? record.clientName ?? record.username)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#374151]">Email Address</label>
                    <input
                      className="h-12 w-full rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-4 text-sm text-[#111827] outline-none"
                      readOnly
                      value={toText(record.email ?? record.clientEmail)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#374151]">Work Location</label>
                    <input
                      className="h-12 w-full rounded-xl border border-[#d1d5db] bg-white px-4 text-sm text-[#111827] outline-none focus:border-[#2563eb]"
                      onChange={(event) => setWorkLocation(event.target.value)}
                      value={currentLocation}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#374151]">About</label>
                    <textarea
                      className="w-full resize-none rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#2563eb]"
                      onChange={(event) => setAbout(event.target.value)}
                      rows={5}
                      value={currentAbout}
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#dbeafe] pt-4">
                  <button
                    className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
                    disabled={isSaving}
                    onClick={() => void saveProfile()}
                    type="button"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            ) : null}

            {activeTab === "notifications" ? (
              <>
                <h2 className="text-[18px] font-semibold text-[#111827]">Notification Preferences</h2>
                <div className="mt-4 rounded-xl border border-[#d1d5db] bg-[#f9fafb] p-4 text-sm text-[#6b7280]">
                  Notification preference storage has not been moved to the backend yet. This screen is ready for that hook-up.
                </div>
              </>
            ) : null}

            {activeTab === "security" ? (
              <>
                <h2 className="text-[18px] font-semibold text-[#111827]">Change Password</h2>
                <div className="mt-5 max-w-[28rem] space-y-5">
                  {[
                    ["currentPassword", "Current Password"],
                    ["newPassword", "New Password"],
                    ["confirmPassword", "Confirm New Password"],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label className="mb-2 block text-sm font-medium text-[#374151]">{label}</label>
                      <input
                        className="h-12 w-full rounded-xl border border-[#d1d5db] bg-white px-4 text-sm text-[#111827] outline-none focus:border-[#2563eb]"
                        onChange={(event) =>
                          setPasswords((current) => ({ ...current, [field]: event.target.value }))
                        }
                        type="password"
                        value={passwords[field as keyof typeof passwords]}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <button
                    className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
                    disabled={isSaving}
                    onClick={() => void changePassword()}
                    type="button"
                  >
                    {isSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-xl bg-[#fee2e2] p-4 text-sm text-[#dc2626]">{error}</div>
            ) : null}
            {message ? (
              <div className="mt-4 rounded-xl bg-[#dbeafe] p-4 text-sm text-[#2563eb]">{message}</div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
