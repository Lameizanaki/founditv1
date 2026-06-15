"use client";

import { useRouter, useSearchParams } from "next/navigation";

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
      <div className="rounded-3xl border border-[#e5e7eb] bg-white px-6 py-8 shadow-sm md:px-9 md:py-10">
        <div className="flex justify-center">
          <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[#dcfce7]">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full border-[3px] border-[#16a34a] text-[24px] font-bold text-[#16a34a]">
              ✓
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-[28px] font-semibold leading-tight text-[#111827] md:text-[30px]">
            {mode === "pay" ? "Payment Submitted Successfully!" : "Order Request Sent Successfully!"}
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-[#6b7280] md:text-[16px]">
            {mode === "pay"
              ? "Your proof is recorded. The freelancer will confirm the transfer after checking their bank app."
              : "Your request has been sent to the freelancer for approval."}
          </p>
        </div>

        <div className="mt-7 rounded-[18px] bg-[#f9fafb] px-5 py-6 text-center">
          <p className="text-[16px] text-[#4b5563]">
            Reference ID: <span className="font-semibold text-[#111827]">{orderId || "Pending"}</span>
          </p>
          <p className="mx-auto mt-4 max-w-[420px] text-[14px] leading-6 text-[#6b7280]">
            {mode === "pay"
              ? "You can return to chat while waiting for the seller to confirm payment."
              : "Once the freelancer accepts the request, you can continue from chat or the order page."}
          </p>
        </div>

        <div className="mt-7 space-y-3">
          <button
            className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 text-[16px] font-semibold text-white transition hover:bg-[#1d4ed8]"
            onClick={() => router.push(orderDetailHref)}
            type="button"
          >
            {projectId ? "Track This Order" : "Track My Orders"}
          </button>

          <button
            className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#2563eb] bg-white px-4 text-[16px] font-semibold text-[#2563eb] transition hover:bg-[#eff6ff]"
            onClick={() => router.push("/client/my-orders")}
            type="button"
          >
            View All Orders
          </button>

          <button
            className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-4 text-[16px] font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
            onClick={() => router.push(roomId ? `/client/${roomId}/chat` : "/client/chat")}
            type="button"
          >
            Message Freelancer
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            className="inline-flex items-center gap-2 text-[15px] font-medium text-[#4b5563] transition hover:text-[#111827]"
            onClick={() => router.push("/client/dashboard")}
            type="button"
          >
            Back to Home
          </button>
        </div>

        <div className="mt-8 border-t border-[#e5e7eb] pt-6 text-center">
          <p className="mx-auto max-w-[420px] text-[13px] leading-6 text-[#6b7280]">
            {mode === "pay"
              ? "This payment was submitted through the manual P2P transfer flow. Money moves outside the platform; FoundIt only tracks proof and confirmation."
              : "The freelancer will review your request and respond through the chat flow."}
          </p>
        </div>
      </div>
    </div>
  );
}
