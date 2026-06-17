"use client";

import Link from "next/link";
import { BriefcaseBusiness, DollarSign, Eye, Star } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  asRecord,
  buildImageSource,
  formatDate,
  formatMoney,
  normalizeStatus,
  toNumber,
  toText,
} from "@/lib/data-utils";
import { normalizeBackendEkycStatus } from "@/lib/ekyc";
import type { PaymentTransactionResponse } from "@/types/payment";

const serviceStatusClass = (value: string) => {
  const status = normalizeStatus(value);
  if (status.includes("pause")) {
    return "bg-amber-100 text-amber-600";
  }
  return "bg-green-100 text-green-600";
};

const projectStatusClass = (value: string) => {
  const status = normalizeStatus(value);
  if (status.includes("review") || status.includes("submitted") || status.includes("delivered")) {
    return "bg-amber-100 text-amber-600";
  }
  if (status.includes("completed")) {
    return "bg-green-100 text-green-600";
  }
  return "bg-blue-50 text-blue-600";
};

export function FreelancerDashboardClient() {
  const sidebar = useApiQuery<unknown>({
    endpoint: "/freelancer/me/get-rightSideBar",
    initialData: {},
  });
  const projects = useApiQuery<unknown[]>({
    endpoint: "/freelancer/view-project",
    initialData: [],
  });
  const services = useApiQuery<unknown[]>({
    endpoint: "/freelancer/gigs",
    initialData: [],
  });
  const requests = useApiQuery<unknown[]>({
    endpoint: "/freelancer/view-hire-request",
    initialData: [],
  });
  const payments = useApiQuery<PaymentTransactionResponse[]>({
    endpoint: "/payment/freelancer/my-transactions",
    initialData: [],
  });
  const ekyc = useApiQuery<unknown | null>({
    endpoint: "/ekyc/current",
    initialData: null,
  });

  const sidebarRecord = asRecord(sidebar.data);
  const serviceCards = services.data.slice(0, 6).map((entry, index) => {
    const record = asRecord(entry);
    return {
      id: toText(record.gigId ?? record.id ?? index + 1),
      title: toText(record.serviceTitle ?? record.packageDescription, "Untitled service"),
      image: buildImageSource({
        data: record.gigMainImageData,
        contentType: record.gigMainImageContentType,
        url: record.gigMainImageUrl,
      }),
      price: toNumber(record.price, 0),
      rating: toNumber(record.rating, 0),
      orders: toNumber(record.orders, 0),
      views: toNumber(record.views ?? record.viewCount, 0),
      status: toText(record.status, "Active"),
    };
  });

  const projectCards = projects.data
    .map((entry, index) => {
      const record = asRecord(entry);
      return {
        id: toText(record.id ?? index + 1),
        title: toText(record.projectTitle ?? record.gigTitle, `Project ${index + 1}`),
        client: toText(record.clientName, "Client"),
        dueDate: formatDate(record.deadline, "No deadline"),
        price: toNumber(record.agreedPrice, 0),
        status: toText(record.status, "In Progress"),
      };
    })
    .slice(0, 6);

  const paidTransactions = payments.data.filter(
    (transaction) => String(transaction.status ?? "").toUpperCase() === "PAID",
  );
  const recentPaidPayments = paidTransactions.slice(0, 5);

  const totalEarnings = paidTransactions.reduce<number>(
    (sum, entry) => sum + toNumber(entry.amount, 0),
    0,
  );
  const activeOrders = projectCards.filter(
    (project) => !normalizeStatus(project.status).includes("completed"),
  );
  const profileViews = toNumber(
    sidebarRecord.viewCount ?? sidebarRecord.views ?? sidebarRecord.sideBarView,
    0,
  );
  const totalServiceRating = serviceCards.reduce((sum, service) => sum + service.rating, 0);
  const averageRating = serviceCards.length ? totalServiceRating / serviceCards.length : 0;
  const ekycStatus = normalizeBackendEkycStatus(asRecord(ekyc.data).status);
  const isVerified = ekycStatus === "verified";

  const isLoading =
    sidebar.isLoading || projects.isLoading || services.isLoading || requests.isLoading || payments.isLoading;
  const error = sidebar.error || projects.error || services.error || requests.error || payments.error;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-8 md:px-6 lg:px-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[30px] font-semibold leading-none text-slate-900 md:text-[18px]">
              Freelancer Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your services, track earnings, and grow your freelance business.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isVerified ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800">
                Verified
              </span>
            ) : (
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-slate-50"
                href="/freelancer/ekyc"
              >
                Verify Identity
              </Link>
            )}
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold !text-white shadow-sm transition visited:!text-white hover:!text-white hover:bg-green-700 focus:!text-white"
              href="/freelancer/create-new-service"
            >
              Post a Gig
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-600 transition hover:bg-slate-50"
              href="/freelancer/profile"
            >
              View Profile
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Earnings", value: formatMoney(totalEarnings), badge: `${paidTransactions.length} paid`, icon: DollarSign },
          { label: "Active Orders", value: String(activeOrders.length), badge: `${requests.data.length} requests`, icon: BriefcaseBusiness },
          { label: "Profile Views", value: String(profileViews), badge: "Live", icon: Eye },
          { label: "Avg. Rating", value: averageRating ? averageRating.toFixed(1) : "0.0", badge: "Portfolio", icon: Star },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">
                <Icon className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600">
                {stat.badge}
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-500">{stat.label}</p>
            <h3 className="mt-1 text-[20px] font-bold text-slate-900">{stat.value}</h3>
          </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">Confirmed Payments</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent transfers you have already confirmed from your bank app.
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-600">
            {paidTransactions.length} paid
          </span>
        </div>

        {isLoading ? (
          <div className="px-5 py-8 text-sm text-slate-500">Loading confirmed payments...</div>
        ) : recentPaidPayments.length ? (
          <div className="divide-y divide-slate-100">
            {recentPaidPayments.map((payment) => (
              <div
                key={payment.tranId ?? payment.id}
                className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900">
                    {payment.projectTitle || (payment.projectId ? `Project #${payment.projectId}` : "Project payment")}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{payment.clientName || "Client"}</span>
                    <span>{payment.tranId || "No transaction ID"}</span>
                    <span>{formatMoney(payment.amount)}</span>
                    <span>Paid {formatDate(payment.paidAt ?? payment.createdAt, "Recently")}</span>
                    {payment.confirmedReference ? <span>Ref: {payment.confirmedReference}</span> : null}
                  </div>
                </div>

                <span className="inline-flex w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-600">
                  Paid
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-sm text-slate-500">
            Confirmed payments will appear here after you approve submitted proofs.
          </div>
        )}
      </section>

      <section>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-[16px] font-bold text-slate-900">My Active Services</h2>
              <Link
                className="text-sm font-semibold text-green-600 transition hover:opacity-80"
                href="/freelancer/my-services"
              >
                View All
              </Link>
            </div>

            {isLoading ? (
              <div className="px-5 py-8 text-sm text-slate-500">Loading dashboard...</div>
            ) : serviceCards.length ? (
              <div className="divide-y divide-slate-100">
                {serviceCards.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <Link
                      className="flex min-w-0 items-start gap-3 transition hover:opacity-85"
                      href={`/freelancer/my-services/${service.id}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={service.title} className="h-12 w-12 rounded-xl object-cover" src={service.image} />
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">{service.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{service.views} views</span>
                          <span>{service.orders} orders</span>
                          <span>{service.rating.toFixed(1)} rating</span>
                          <span className="font-semibold text-slate-700">${service.price}</span>
                        </div>
                      </div>
                    </Link>

                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${serviceStatusClass(service.status)}`}>
                      {service.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-sm text-slate-500">No gigs available yet.</div>
            )}
          </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-[16px] font-bold text-slate-900">Active Orders</h2>
          <Link
            className="text-sm font-semibold text-green-600 transition hover:opacity-80"
            href="/freelancer/active-work"
          >
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="px-5 py-8 text-sm text-slate-500">Loading active orders...</div>
        ) : projectCards.length ? (
          <div className="divide-y divide-slate-100">
            {projectCards.map((project) => (
              <div
                key={project.id}
                className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{project.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {project.client} <span className="mx-1">/</span> Due: {project.dueDate}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[20px] font-bold text-slate-900">
                    {formatMoney(project.price)}
                  </span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${projectStatusClass(project.status)}`}>
                    {project.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-sm text-slate-500">No in-progress projects yet.</div>
        )}
      </section>
    </div>
  );
}
