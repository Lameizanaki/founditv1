"use client";

import { useState } from "react";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  arrayFromField,
  asRecord,
  buildImageSource,
  formatMoney,
  toNumber,
  toText,
} from "@/lib/data-utils";

export function FreelancerProfileClient() {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const profile = useApiQuery<unknown>({
    endpoint: "/freelancer/me/client/profile",
    initialData: {},
  });
  const sidebar = useApiQuery<unknown>({
    endpoint: "/freelancer/me/get-rightSideBar",
    initialData: {},
  });
  const experience = useApiQuery<unknown[]>({
    endpoint: "/freelancer/me/profile/experience",
    initialData: [],
  });
  const reviews = useApiQuery<unknown[]>({
    endpoint: "/freelancer/me/reviews",
    initialData: [],
  });

  const profileRecord = asRecord(profile.data);
  const sidebarRecord = asRecord(sidebar.data);
  const avatar = buildImageSource({
    data: profileRecord.profilePictureData,
    contentType: profileRecord.profilePictureType,
    url: profileRecord.profilePictureUrl,
  });

  const [draft, setDraft] = useState({
    freelancerName: "",
    freelancerJob: "",
    workLocation: "",
    yearExperience: "",
    about: "",
    skill: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const effective = {
    freelancerName: draft.freelancerName || toText(profileRecord.freelancerName, "Freelancer"),
    freelancerJob: draft.freelancerJob || toText(profileRecord.freelancerJob, "Available freelancer"),
    workLocation: draft.workLocation || toText(profileRecord.workLocation, "Remote"),
    yearExperience: draft.yearExperience || String(toNumber(profileRecord.yearExperience, 0)),
    about: draft.about || toText(profileRecord.about, ""),
    skill: draft.skill || arrayFromField(profileRecord.skill).join(", "),
  };

  const saveProfile = async () => {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest("/freelancer/update-profile", {
        method: "PUT",
        token,
        body: {
          freelancerName: effective.freelancerName,
          freelancerJob: effective.freelancerJob,
          workLocation: effective.workLocation,
          yearExperience: toNumber(effective.yearExperience, 0),
          about: effective.about,
          skill: effective.skill
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });
      setMessage("Freelancer profile updated.");
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 md:px-6 lg:px-10">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-[30px] font-semibold text-slate-900">Freelancer Profile</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Manage your public portfolio, highlight your services, and review profile activity.
        </p>
      </div>

      {profile.error || sidebar.error || experience.error || reviews.error || error ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error || profile.error || sidebar.error || experience.error || reviews.error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#e5e7eb] bg-[#eef2ff] text-2xl font-semibold text-[#2563eb]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={effective.freelancerName} className="h-full w-full object-cover" src={avatar} />
            </div>
            <div className="flex-1">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["freelancerName", "Full Name", effective.freelancerName],
                  ["freelancerJob", "Headline", effective.freelancerJob],
                  ["workLocation", "Location", effective.workLocation],
                  ["yearExperience", "Years Experience", effective.yearExperience],
                ].map(([field, label, value]) => (
                  <div key={field}>
                    <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
                    <input
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500"
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, [field]: event.target.value }))
                      }
                      value={value}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Skills</label>
                <input
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500"
                  onChange={(event) => setDraft((current) => ({ ...current, skill: event.target.value }))}
                  value={effective.skill}
                />
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">About</label>
                <textarea
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                  onChange={(event) => setDraft((current) => ({ ...current, about: event.target.value }))}
                  rows={6}
                  value={effective.about}
                />
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSaving}
                  onClick={() => void saveProfile()}
                  type="button"
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Sidebar Summary</h2>
          <div className="mt-5 space-y-4">
            {[
              ["Email", toText(profileRecord.email, "Not available")],
              ["Start Price", formatMoney(sidebarRecord.startPrice)],
              ["Views", String(toNumber(sidebarRecord.viewCount ?? sidebarRecord.view, 0))],
              ["Reviews", String(reviews.data.length)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Experience</h2>
          <div className="mt-5 space-y-4">
            {experience.data.length ? (
              experience.data.map((entry, index) => {
                const item = asRecord(entry);
                return (
                  <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {toText(item.title ?? item.jobTitle, `Experience ${index + 1}`)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{toText(item.company, "Previous role")}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {toText(item.description ?? item.bio, "No description available.")}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No experience records available.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Reviews</h2>
          <div className="mt-5 space-y-4">
            {reviews.data.length ? (
              reviews.data.map((entry, index) => {
                const item = asRecord(entry);
                return (
                  <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {toText(item.clientName, "Client")}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">{toText(item.service, "Service review")}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {toNumber(item.rating, 0).toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {toText(item.comment, "No comment provided.")}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No reviews available yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

