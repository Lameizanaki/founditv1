"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { useApiQuery } from "@/hooks/use-api-query";
import { asRecord, buildImageSource, toNumber, toText } from "@/lib/data-utils";
import { PublicFooter } from "@/components/shell/public-footer";
import { PublicHeader } from "@/components/shell/public-header";
import type { ConversationResponse } from "@/types/chat";

export function GigDetailClient({
  gigId,
  mode,
  backHref,
}: {
  gigId: string;
  mode: "public" | "workspace";
  backHref: string;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const [chatError, setChatError] = useState<string | null>(null);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const gig = useApiQuery<unknown>({
    endpoint: `/freelancer/client/gigs/${gigId}`,
    requireAuth: false,
    initialData: {},
  });

  const record = asRecord(gig.data);
  const image = buildImageSource({
    data: record.gigMainImageData,
    contentType: record.gigMainImageContentType,
    url: record.gigMainImageUrl,
  });
  const canOpenChat =
    (!session?.user.role || session.user.role === "CLIENT") &&
    toNumber(record.freelancerId, 0) > 0;
  const canOrder = !session?.user.role || session.user.role === "CLIENT";

  const openOrderPage = () => {
    if (!session?.token) {
      router.push("/auth/sign-in");
      return;
    }

    router.push(`/client/browse-gigs/gig/${gigId}/confirm-order`);
  };

  const openChat = async () => {
    if (!session?.token) {
      router.push("/auth/sign-in");
      return;
    }

    const freelancerId = toNumber(record.freelancerId, 0);
    if (!freelancerId) {
      setChatError("This seller account is not ready for chat yet.");
      return;
    }

    setIsOpeningChat(true);
    setChatError(null);

    try {
      const conversation = await apiRequest<ConversationResponse>("/api/chat/conversations", {
        body: {
          freelancerId,
          gigId: toNumber(record.gigId ?? gigId, 0) || undefined,
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

      {gig.error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {gig.error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-[380px] w-full bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={toText(record.serviceTitle, "Gig")} className="h-full w-full object-cover" src={image} />
          </div>
          <div className="p-6">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              {toText(record.category, "General")}
            </span>
            <h1 className="mt-4 text-[32px] font-semibold text-slate-900">
              {toText(record.serviceTitle ?? record.packageDescription, "Untitled service")}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {toText(record.description ?? record.packageDescription, "Detailed package information is not available yet.")}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Gig Overview</h2>
          <div className="mt-5 space-y-4">
            {[
              ["Freelancer", toText(record.freelancerName, "Freelancer")],
              ["Price", `$${toNumber(record.price, 0)}`],
              ["Delivery", `${toNumber(record.deliveryDate, 0) || "Flexible"} ${toNumber(record.deliveryDate, 0) ? "days" : ""}`.trim()],
              ["Rating", toNumber(record.rating, 0).toFixed(1)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!canOrder}
              onClick={openOrderPage}
              type="button"
            >
              Continue to Order
            </button>
            <button
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!canOpenChat || isOpeningChat}
              onClick={() => void openChat()}
              type="button"
            >
              {isOpeningChat ? "Opening chat..." : "Contact Seller"}
            </button>
          </div>

          {chatError ? (
            <p className="mt-4 text-sm text-red-600">{chatError}</p>
          ) : null}
        </section>
      </div>
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
