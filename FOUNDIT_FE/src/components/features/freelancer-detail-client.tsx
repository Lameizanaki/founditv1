"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  arrayFromField,
  asArray,
  asRecord,
  buildImageSource,
  formatDate,
  getInitials,
  toNumber,
  toText,
} from "@/lib/data-utils";
import { PublicFooter } from "@/components/shell/public-footer";
import { PublicHeader } from "@/components/shell/public-header";
import type { ConversationResponse } from "@/types/chat";

export function FreelancerDetailClient({
  freelancerId,
  mode,
  backHref,
}: {
  freelancerId: string;
  mode: "public" | "workspace";
  backHref: string;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const [chatError, setChatError] = useState<string | null>(null);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const profile = useApiQuery<unknown>({
    endpoint: `/freelancer/${freelancerId}/client/profile`,
    requireAuth: false,
    initialData: {},
  });
  const experience = useApiQuery<unknown[]>({
    endpoint: `/freelancer/${freelancerId}/profile/experience`,
    requireAuth: false,
    initialData: [],
  });
  const reviews = useApiQuery<unknown[]>({
    endpoint: `/freelancer/${freelancerId}/reviews`,
    requireAuth: false,
    initialData: [],
  });

  const record = asRecord(profile.data);
  const avatar = buildImageSource({
    data: record.profilePictureData,
    contentType: record.profilePictureType,
    url: record.profilePictureUrl,
  });
  const skills = arrayFromField(record.skill);
  const services = asArray(record.activeService).map((entry, index) => {
    const service = asRecord(entry);
    return {
      id: toText(service.gigId ?? service.id ?? index + 1),
      title: toText(service.serviceTitle ?? service.packageDescription, `Service ${index + 1}`),
      price: toNumber(service.price, 0),
    };
  });
  const canOpenChat =
    (!session?.user.role || session.user.role === "CLIENT") &&
    toNumber(record.id ?? freelancerId, 0) > 0;

  const openChat = async () => {
    if (!session?.token) {
      router.push("/auth/sign-in");
      return;
    }

    const resolvedFreelancerId = toNumber(record.id ?? freelancerId, 0);
    if (!resolvedFreelancerId) {
      setChatError("This freelancer account is not ready for chat yet.");
      return;
    }

    setIsOpeningChat(true);
    setChatError(null);

    try {
      const conversation = await apiRequest<ConversationResponse>("/api/chat/conversations", {
        body: {
          freelancerId: resolvedFreelancerId,
        },
        method: "POST",
        token: session.token,
      });

      router.push(`/client/${conversation.roomId}/chat`);
    } catch (error) {
      setChatError(toErrorMessage(error));
    } finally {
      setIsOpeningChat(false);
    }
  };

  const content = (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
      <Link className="mb-6 inline-flex text-sm font-medium text-slate-500 transition hover:text-slate-900" href={backHref}>
        Back
      </Link>

      {profile.error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {profile.error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-50 text-2xl font-semibold text-blue-600">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={toText(record.freelancerName, "Freelancer")} className="h-full w-full object-cover" src={avatar} />
              ) : (
                getInitials(record.freelancerName)
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-[32px] font-semibold text-slate-900">
                {toText(record.freelancerName, "Freelancer")}
              </h1>
              <p className="mt-2 text-lg text-green-600">
                {toText(record.freelancerJob, "Available freelancer")}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                <span>{toText(record.workLocation, "Remote")}</span>
                <span>{toNumber(record.rating, 0).toFixed(1)} rating</span>
                <span>{toNumber(record.yearExperience, 0)} years experience</span>
              </div>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
                {toText(record.about, "Profile summary is not available yet.")}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Profile Snapshot</h2>
          <div className="mt-5 space-y-4">
            {[
              ["Email", toText(record.email, "Not listed")],
              ["Phone", toText(record.phoneNumber, "Not listed")],
              ["Location", toText(record.workLocation, "Remote")],
              ["Member Since", formatDate(record.createdAt, "Not available")],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <button
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!canOpenChat || isOpeningChat}
            onClick={() => void openChat()}
            type="button"
          >
            {isOpeningChat ? "Opening chat..." : "Message Freelancer"}
          </button>

          {chatError ? <p className="mt-3 text-sm text-red-600">{chatError}</p> : null}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-semibold text-slate-900">Skills</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.length ? (
              skills.map((skill) => (
                <span key={skill} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No listed skills yet.</span>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Reviews</h2>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{reviews.data.length}</p>
          <p className="mt-1 text-sm text-slate-500">Client review entries</p>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Active Services</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.length ? (
            services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">{service.title}</h3>
                <p className="mt-3 text-sm text-slate-500">Starting at</p>
                <p className="text-2xl font-semibold text-slate-900">${service.price}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No active services listed yet.</p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Experience</h2>
        <div className="mt-5 space-y-4">
          {experience.data.length ? (
            experience.data.map((entry, index) => {
              const item = asRecord(entry);
              return (
                <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {toText(item.jobTitle ?? item.title, `Experience ${index + 1}`)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {toText(item.companyName ?? item.company, "Previous role")}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {toText(item.description, "No description available.")}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No experience records available.</p>
          )}
        </div>
      </section>
    </div>
  );

  if (mode === "public") {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicHeader />
        {content}
        <PublicFooter />
      </div>
    );
  }

  return <div className="min-h-screen bg-slate-50">{content}</div>;
}
