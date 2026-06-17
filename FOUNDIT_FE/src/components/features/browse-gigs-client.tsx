"use client";

import Link from "next/link";
import { useState } from "react";
import { useApiQuery } from "@/hooks/use-api-query";
import { asRecord, buildImageSource, getInitials, toNumber, toText } from "@/lib/data-utils";
import { PublicFooter } from "@/components/shell/public-footer";
import { PublicHeader } from "@/components/shell/public-header";

interface BrowseGigsClientProps {
  mode: "public" | "workspace";
  basePath: string;
}

interface GigCard {
  id: string;
  image: string;
  category: string;
  seller: string;
  title: string;
  rating: number;
  reviews: number;
  delivery: string;
  price: number;
  sellerAvatar: string;
}

const itemsPerPage = 8;

export function BrowseGigsClient({ mode, basePath }: BrowseGigsClientProps) {
  const { data, error, isLoading } = useApiQuery<unknown[]>({
    endpoint: "/freelancer/client/gigs",
    requireAuth: false,
    initialData: [],
  });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const gigs = data.map((entry, index) => {
    const record = asRecord(entry);
    const gigId = toText(record.gigId ?? record.id ?? index + 1);
    const deliveryDays = toNumber(record.deliveryDate, 0);

    return {
      id: gigId,
      image: buildImageSource({
        data: record.gigMainImageData,
        contentType: record.gigMainImageContentType,
        url: record.gigMainImageUrl,
      }),
      category: toText(record.category, "General"),
      seller: toText(record.freelancerName ?? record.seller, `Freelancer ${index + 1}`),
      title: toText(record.serviceTitle ?? record.packageDescription, "Untitled service"),
      rating: toNumber(record.rating, 0),
      reviews: toNumber(record.reviews, 0),
      delivery: deliveryDays > 0 ? `${deliveryDays} days` : "Flexible delivery",
      price: toNumber(record.price, 0),
      sellerAvatar: buildImageSource({
        data: record.freelancerProfilePictureData ?? record.profilePictureData,
        contentType: record.freelancerProfilePictureType ?? record.profilePictureType,
        url: record.freelancerProfilePictureUrl ?? record.profilePictureUrl,
        fallback: "",
      }),
    } satisfies GigCard;
  });

  const categories = ["All", ...Array.from(new Set(gigs.map((gig) => gig.category)))];
  const filteredGigs = gigs.filter((gig) => {
    const safeSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !safeSearch ||
      gig.title.toLowerCase().includes(safeSearch) ||
      gig.seller.toLowerCase().includes(safeSearch) ||
      gig.category.toLowerCase().includes(safeSearch);
    const matchesCategory =
      selectedCategory === "All" ||
      gig.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filteredGigs.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedGigs = filteredGigs.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const content = (
    <div className="overflow-y-auto bg-slate-50 px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-[32px] font-semibold leading-tight text-slate-900">Browse Gigs</h1>
        <p className="mt-1 text-[14px] text-slate-500">
          Discover services from talented freelancers.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              className={
                selectedCategory === category
                  ? "rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-[12px] font-medium text-white"
                  : "rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-medium text-slate-700 transition hover:bg-gray-50"
              }
              onClick={() => {
                setSelectedCategory(category);
                setCurrentPage(1);
              }}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none xl:w-72"
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search gigs..."
          value={searchTerm}
        />
      </div>

      <div className="mb-4 text-[13px] text-slate-500">
        Showing {filteredGigs.length} results
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading gigs...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {paginatedGigs.map((gig) => (
          <Link
            key={gig.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md"
            href={`${basePath}/${gig.id}`}
          >
            <div className="relative h-52 w-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={gig.title} className="h-full w-full object-cover" src={gig.image} />
              <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                {gig.category}
              </span>
            </div>

            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                {gig.sellerAvatar ? (
                  <div className="h-7 w-7 overflow-hidden rounded-full border border-slate-200 bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={gig.seller}
                      className="h-full w-full object-cover"
                      src={gig.sellerAvatar}
                    />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-600">
                    {getInitials(gig.seller)}
                  </div>
                )}
                <span className="text-[12px] text-slate-600">{gig.seller}</span>
              </div>

              <h3 className="mb-3 line-clamp-2 min-h-11 text-[14px] font-medium leading-6 text-slate-900">
                {gig.title}
              </h3>

              <div className="mb-4 flex items-center gap-1 text-[13px] text-slate-500">
                <span className="font-medium text-slate-900">{gig.rating.toFixed(1)}</span>
                <span>({gig.reviews})</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div className="text-[12px] text-slate-500">{gig.delivery}</div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">Starting at</p>
                  <p className="text-[20px] font-semibold text-slate-900">${gig.price}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!isLoading && !error && !filteredGigs.length ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          No gigs found.
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="mt-12 flex items-center justify-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-700 transition hover:bg-gray-50 disabled:opacity-50"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            type="button"
          >
            {"<"}
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              key={page}
              className={
                page === safePage
                  ? "flex h-9 w-9 items-center justify-center rounded-lg border border-blue-600 bg-blue-600 text-sm text-white"
                  : "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-700 transition hover:bg-gray-50"
              }
              onClick={() => setCurrentPage(page)}
              type="button"
            >
              {page}
            </button>
          ))}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-700 transition hover:bg-gray-50 disabled:opacity-50"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            type="button"
          >
            {">"}
          </button>
        </div>
      ) : null}
    </div>
  );

  if (mode === "public") {
    return (
      <div className="w-full bg-slate-50">
        <PublicHeader />
        {content}
        <PublicFooter />
      </div>
    );
  }

  return <div className="w-full bg-slate-50 px-8 py-8">{content}</div>;
}
