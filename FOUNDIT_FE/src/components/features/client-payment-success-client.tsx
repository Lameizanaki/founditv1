"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Check, ClipboardList, MessageSquare, PackageCheck } from "lucide-react";

export function ClientPaymentSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get("mode") === "pay" ? "pay" : "request";
  const orderId = searchParams.get("orderId") ?? "";
  const roomId = searchParams.get("roomId");
  const projectId = searchParams.get("projectId");
  const orderDetailHref = projectId ? `/client/my-orders/${projectId}` : "/client/my-orders";

  return (
    <div className="mx-auto max-w-[640px] px-4 py-10 md:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm md:px-9 md:py-10">
        <div className="flex justify-center">
          <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-green-100">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full border-[3px] border-green-600 text-[24px] font-bold text-green-600">
              <Check className="h-7 w-7" />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-[28px] font-semibold leading-tight text-slate-900 md:text-[30px]">
            {mode === "pay" ? "Payment Submitted Successfully!" : "Order Request Sent Successfully!"}
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-slate-500 md:text-[16px]">
            {mode === "pay"
              ? "Your proof is recorded. The freelancer will confirm the transfer after checking their bank app."
              : "Your request has been sent to the freelancer for approval."}
          </p>
        </div>

        <div className="mt-7 rounded-[18px] bg-slate-50 px-5 py-6 text-center">
          <p className="text-[16px] text-slate-600">
            Reference ID: <span className="font-semibold text-slate-900">{orderId || "Pending"}</span>
          </p>
          <p className="mx-auto mt-4 max-w-[420px] text-[14px] leading-6 text-slate-500">
            {mode === "pay"
              ? "You can return to chat while waiting for the seller to confirm payment."
              : "Once the freelancer accepts the request, you can continue from chat or the order page."}
          </p>
        </div>

        <div className="mt-7 space-y-3">
          <button
            className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[16px] font-semibold text-white transition hover:bg-blue-700"
            onClick={() => router.push(orderDetailHref)}
            type="button"
          >
            <PackageCheck className="h-5 w-5" />
            {projectId ? "Track This Order" : "Track My Orders"}
          </button>

          <button
            className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-600 bg-white px-4 text-[16px] font-semibold text-blue-600 transition hover:bg-blue-50"
            onClick={() => router.push("/client/my-orders")}
            type="button"
          >
            <ClipboardList className="h-5 w-5" />
            View All Orders
          </button>

          <button
            className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[16px] font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => router.push(roomId ? `/client/${roomId}/chat` : "/client/chat")}
            type="button"
          >
            <MessageSquare className="h-5 w-5" />
            Message Freelancer
          </button>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 text-center">
          <p className="mx-auto max-w-[420px] text-[13px] leading-6 text-slate-500">
            {mode === "pay"
              ? "This payment was submitted through the manual P2P transfer flow. Money moves outside the platform; FoundIt only tracks proof and confirmation."
              : "The freelancer will review your request and respond through the chat flow."}
          </p>
        </div>
      </div>
    </div>
  );
}
