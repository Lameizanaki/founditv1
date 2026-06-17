"use client";

import Link from "next/link";
import { useApiQuery } from "@/hooks/use-api-query";
import { asRecord, buildImageSource, toNumber, toText } from "@/lib/data-utils";

const statusClass = (status: string) =>
  status.toLowerCase().includes("pause")
    ? "bg-amber-100 text-amber-600"
    : "bg-green-100 text-green-600";

export function FreelancerServicesClient() {
  const services = useApiQuery<unknown[]>({
    endpoint: "/freelancer/gigs",
    initialData: [],
  });

  const rows = services.data.map((entry, index) => {
    const record = asRecord(entry);
    return {
      id: toText(record.gigId ?? record.id ?? index + 1),
      image: buildImageSource({
        data: record.gigMainImageData,
        contentType: record.gigMainImageContentType,
        url: record.gigMainImageUrl,
      }),
      title: toText(record.serviceTitle ?? record.packageDescription, "Untitled service"),
      rating: toNumber(record.rating, 0),
      activeOrders: toNumber(record.orders, 0),
      status: toText(record.status, "Active"),
      price: toNumber(record.price, 0),
    };
  });

  return (
    <div className="mx-auto max-w-[1600px] bg-slate-50 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-slate-900 md:text-[20px]">My Services</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your services, track performance and orders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            href="/freelancer/profile"
          >
            View Profile
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-medium !text-white shadow-sm transition visited:!text-white hover:!text-white hover:bg-slate-950 focus:!text-white"
            href="/freelancer/create-new-service"
          >
            Add New Service
          </Link>
        </div>
      </div>

      {services.error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {services.error}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
          <div className="col-span-5">Service Detail</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Price</div>
          <div className="col-span-2">Performance</div>
          <div className="col-span-2 text-right">Edit</div>
        </div>

        {services.isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Loading services...</div>
        ) : rows.length ? (
          rows.map((service, index) => (
            <div
              key={service.id}
              className={`grid grid-cols-12 gap-4 px-5 py-4 ${index < rows.length - 1 ? "border-b border-slate-100" : ""}`}
            >
              <Link
                className="col-span-5 flex items-center gap-4 transition hover:opacity-85"
                href={`/freelancer/my-services/${service.id}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={service.title} className="h-10 w-16 rounded-lg object-cover" src={service.image} />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{service.title}</h3>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{service.rating.toFixed(1)}</span>
                    <span>({service.activeOrders} active orders)</span>
                  </div>
                </div>
              </Link>

              <div className="col-span-2 flex items-center">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClass(service.status)}`}>
                  {service.status}
                </span>
              </div>

              <div className="col-span-1 flex items-center text-sm font-semibold text-slate-900">
                ${service.price}
              </div>

              <div className="col-span-2 flex items-center gap-8">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{service.activeOrders}</p>
                  <p className="text-xs text-slate-400">Orders</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{service.rating.toFixed(1)}</p>
                  <p className="text-xs text-slate-400">Rating</p>
                </div>
              </div>

              <div className="col-span-2 flex items-center justify-end gap-4 text-sm">
                <Link
                  className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold !text-white transition visited:!text-white hover:!text-white hover:bg-slate-950 focus:!text-white"
                  href={`/freelancer/my-services/${service.id}/edit`}
                >
                  Edit
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-500">No services found.</div>
        )}
      </div>
    </div>
  );
}
