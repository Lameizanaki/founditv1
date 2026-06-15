"use client";

import { useState } from "react";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { asRecord, buildImageSource, toText } from "@/lib/data-utils";

type SettingsTab = "personal" | "notifications" | "security" | "payments";

export function FreelancerSettingClient() {
  const { session, signOut } = useAuth();
  const token = session?.token ?? null;
  const setting = useApiQuery<unknown>({
    endpoint: "/freelancer/me/setting",
    initialData: {},
  });
  const profile = useApiQuery<unknown>({
    endpoint: "/freelancer/me/client/profile",
    initialData: {},
  });
  const [activeTab, setActiveTab] = useState<SettingsTab>("personal");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bankQrFile, setBankQrFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const settingRecord = asRecord(setting.data);
  const profileRecord = asRecord(profile.data);
  const avatar = buildImageSource({
    data: profileRecord.profilePictureData,
    contentType: profileRecord.profilePictureType,
    url: profileRecord.profilePictureUrl,
  });
  const bankQr = buildImageSource({
    data: settingRecord.bankQrData,
    contentType: settingRecord.bankQrType,
    url: undefined,
    fallback: "",
  });

  const uploadAvatar = async () => {
    if (!token || !avatarFile) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      await apiRequest("/freelancer/create-avatar", {
        method: "PUT",
        token,
        body: formData,
      });
      setAvatarFile(null);
      setMessage("Profile picture updated.");
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  const uploadBankQr = async () => {
    if (!token || !bankQrFile) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", bankQrFile);
      await apiRequest("/freelancer/setting/bank-qr", {
        method: "PUT",
        token,
        body: formData,
      });
      setBankQrFile(null);
      setMessage("Seller bank QR uploaded.");
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
      await apiRequest("/freelancer/change-password", {
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-[#16a34a]">•</div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#111827] md:text-[24px]">
              Freelancer Settings
            </h1>
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
              ["payments", "Payment Methods"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={
                  activeTab === key
                    ? "mb-1 flex w-full items-center gap-3 rounded-xl bg-[#eaf7ef] px-4 py-3 text-left text-sm font-medium text-[#16a34a]"
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
          </aside>

          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] md:p-6">
            {activeTab === "personal" ? (
              <>
                <h2 className="text-[18px] font-semibold text-[#111827]">Personal Information</h2>
                <div className="mt-5 flex flex-col gap-4 border-b border-[#e5e7eb] pb-6 md:flex-row md:items-center">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full ring-4 ring-[#f3f4f6]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Profile" className="h-full w-full object-cover" src={avatar} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[#111827]">
                      {toText(profileRecord.freelancerName, "Freelancer")}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-sm text-[#6b7280]">
                      <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
                      <span>Freelancer Account</span>
                    </div>
                    <input
                      accept="image/*"
                      className="mt-3 block text-sm text-[#374151] file:mr-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                      onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                      type="file"
                    />
                    <button
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#eaf7ef] px-4 py-2 text-sm font-medium text-[#16a34a] transition hover:bg-[#ddf2e4] disabled:opacity-50"
                      disabled={isSaving || !avatarFile}
                      onClick={() => void uploadAvatar()}
                      type="button"
                    >
                      {isSaving ? "Uploading..." : "Update Profile Picture"}
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === "payments" ? (
              <>
                <h2 className="text-[18px] font-semibold text-[#111827]">Payment Information</h2>
                <div className="mt-4">
                  <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d1d5db] bg-white">
                        {bankQr ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="Seller bank QR" className="h-full w-full object-contain" src={bankQr} />
                        ) : (
                          <span className="text-sm text-[#6b7280]">No QR</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-[#111827]">
                          {toText(settingRecord.bankQrName, "No seller QR uploaded")}
                        </p>
                        <p className="mt-1 text-sm text-[#6b7280]">
                          Buyers will scan this QR and submit proof. You confirm payment after checking your bank app.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      <input
                        accept="image/*"
                        className="block max-w-xs rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#374151] file:mr-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                        onChange={(event) => setBankQrFile(event.target.files?.[0] ?? null)}
                        type="file"
                      />
                      <button
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-5 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSaving || !bankQrFile}
                        onClick={() => void uploadBankQr()}
                        type="button"
                      >
                        {isSaving ? "Uploading..." : "Upload QR"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === "notifications" ? (
              <div className="rounded-xl border border-[#d1d5db] bg-[#f9fafb] p-4 text-sm text-[#6b7280]">
                Notification preference storage has not been moved to the backend yet. This screen is ready for that hook-up.
              </div>
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
                        className="h-12 w-full rounded-xl border border-[#d1d5db] bg-white px-4 text-sm text-[#111827] outline-none focus:border-[#16a34a]"
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
                    className="rounded-xl bg-[#16a34a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-50"
                    disabled={isSaving}
                    onClick={() => void changePassword()}
                    type="button"
                  >
                    {isSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </>
            ) : null}

            {setting.error || profile.error || error ? (
              <div className="mt-4 rounded-xl bg-[#fee2e2] p-4 text-sm text-[#dc2626]">
                {error || setting.error || profile.error}
              </div>
            ) : null}
            {message ? (
              <div className="mt-4 rounded-xl bg-[#dcfce7] p-4 text-sm text-[#16a34a]">{message}</div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

