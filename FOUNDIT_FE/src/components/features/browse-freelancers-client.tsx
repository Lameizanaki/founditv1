"use client";

import Link from "next/link";
import { useState } from "react";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  arrayFromField,
  asRecord,
  buildImageSource,
  formatCompactNumber,
  getInitials,
  toNumber,
  toText,
} from "@/lib/data-utils";
import { PublicFooter } from "@/components/shell/public-footer";
import { PublicHeader } from "@/components/shell/public-header";

interface BrowseFreelancersClientProps {
  mode: "public" | "workspace";
  basePath: string;
}

interface FreelancerCard {
  id: string;
  name: string;
  job: string;
  rating: number;
  views: number;
  location: string;
  about: string;
  price: number | null;
  skills: string[];
  avatar: string;
}

const pageSize = 6;

export function BrowseFreelancersClient({
  mode,
  basePath,
}: BrowseFreelancersClientProps) {
  const { data, error, isLoading } = useApiQuery<unknown[]>({
    endpoint: "/freelancer/active",
    requireAuth: false,
    initialData: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState("");
  const [location, setLocation] = useState("");
  const [showFilters, setShowFilters] = useState(mode === "workspace");
  const [currentPage, setCurrentPage] = useState(1);

  const cards = data.map((entry, index) => {
    const record = asRecord(entry);
    const activeServices = Array.isArray(record.activeService) ? record.activeService : [];
    const servicePrices = activeServices
      .map((service) => toNumber(asRecord(service).price, 0))
      .filter((value) => value > 0);

    return {
      id: toText(
        record.id ??
          record.profileId ??
          record.freelancerId ??
          record.freelancerProfileId ??
          index + 1,
      ),
      name: toText(record.freelancerName, `Freelancer ${index + 1}`),
      job: toText(record.freelancerJob, "Available freelancer"),
      rating: toNumber(record.rating, 0),
      views: toNumber(record.profileViews ?? record.viewCount ?? record.views, 0),
      location: toText(record.workLocation, "Remote"),
      about: toText(record.about, "Portfolio details are available on the full freelancer profile."),
      price: servicePrices.length ? Math.min(...servicePrices) : null,
      skills: arrayFromField(record.skill).slice(0, 4),
      avatar: buildImageSource({
        data: record.profilePictureData,
        contentType: record.profilePictureType,
        url: record.profilePictureUrl,
      }),
    } satisfies FreelancerCard;
  });

  const filteredCards = cards.filter((card) => {
    const safeSearch = searchQuery.trim().toLowerCase();
    const safeCategory = category.trim().toLowerCase();
    const safeLocation = location.trim().toLowerCase();
    const minRating = toNumber(rating, 0);

    const matchesSearch =
      !safeSearch ||
      card.name.toLowerCase().includes(safeSearch) ||
      card.job.toLowerCase().includes(safeSearch) ||
      card.about.toLowerCase().includes(safeSearch);
    const matchesCategory =
      !safeCategory ||
      card.skills.some((skill) => skill.toLowerCase().includes(safeCategory)) ||
      card.job.toLowerCase().includes(safeCategory);
    const matchesLocation = !safeLocation || card.location.toLowerCase().includes(safeLocation);
    const matchesRating = !rating.trim() || card.rating >= minRating;

    return matchesSearch && matchesCategory && matchesLocation && matchesRating;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedCards = filteredCards.slice(
    (visiblePage - 1) * pageSize,
    visiblePage * pageSize,
  );

  const content = (
    <div className="overflow-y-auto bg-[#f6f7f9] px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold text-[#111827]">Browse Freelancers</h1>
          <p className="text-[14px] text-[#6b7280]">
            Find and hire talented freelancers for your projects.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="w-full rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#16a34a] sm:w-72"
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search freelancers..."
            value={searchQuery}
          />
          <button
            className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm transition hover:bg-gray-50"
            onClick={() => setShowFilters((value) => !value)}
            type="button"
          >
            {showFilters ? "Hide Filters" : "Filters"}
          </button>
        </div>
      </div>

      {showFilters ? (
        <div className="mb-6 rounded-xl border border-[#e5e7eb] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-[#111827]">Filters</h2>
            <button
              className="text-[13px] text-blue-600 hover:underline"
              onClick={() => {
                setCategory("");
                setRating("");
                setLocation("");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              type="button"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm outline-none focus:border-[#16a34a]"
              onChange={(event) => {
                setCategory(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Category or skill"
              value={category}
            />
            <input
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm outline-none focus:border-[#16a34a]"
              onChange={(event) => {
                setRating(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Minimum rating"
              value={rating}
            />
            <input
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm outline-none focus:border-[#16a34a]"
              onChange={(event) => {
                setLocation(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Location"
              value={location}
            />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 text-sm text-[#6b7280]">
          Loading freelancers...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-5 text-sm text-[#b91c1c]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {paginatedCards.map((card) => (
          <Link
            key={card.id}
            className="rounded-xl border border-[#e5e7eb] bg-white p-5 transition hover:shadow-sm"
            href={`${basePath}/${card.id}`}
          >
            <div className="mb-4 flex gap-4">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                {card.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={card.name} className="h-full w-full object-cover" src={card.avatar} />
                ) : (
                  <span className="text-sm font-semibold text-[#374151]">{getInitials(card.name)}</span>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[#111827]">{card.name}</h3>
                <p className="text-sm text-green-600">{card.job}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{card.rating.toFixed(1)}</span>
                  <span>•</span>
                  <span>{formatCompactNumber(card.views)} views</span>
                </div>
              </div>
            </div>

            <div className="mb-3 text-sm text-gray-500">{card.location}</div>

            <div className="mb-4 flex flex-wrap gap-2">
              {card.skills.length ? (
                card.skills.map((skill) => (
                  <span
                    key={`${card.id}-${skill}`}
                    className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  General
                </span>
              )}
            </div>

            <p className="line-clamp-2 text-sm text-[#6b7280]">{card.about}</p>

            <div className="mt-4 border-t border-gray-200 pt-3 text-[15px] font-semibold text-[#111827]">
              {card.price ? `From $${card.price}` : "View portfolio"}
            </div>
          </Link>
        ))}
      </div>

      {!isLoading && !error && !filteredCards.length ? (
        <div className="mt-6 rounded-xl border border-[#e5e7eb] bg-white p-5 text-sm text-[#6b7280]">
          No freelancers found.
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-sm text-[#374151] transition hover:bg-gray-50 disabled:opacity-50"
            disabled={visiblePage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            type="button"
          >
            {"<"}
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              key={page}
              className={
                page === visiblePage
                  ? "flex h-9 w-9 items-center justify-center rounded-lg border border-[#16a34a] bg-[#16a34a] text-sm text-white"
                  : "flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-sm text-[#374151] transition hover:bg-gray-50"
              }
              onClick={() => setCurrentPage(page)}
              type="button"
            >
              {page}
            </button>
          ))}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-sm text-[#374151] transition hover:bg-gray-50 disabled:opacity-50"
            disabled={visiblePage === totalPages}
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
      <div className="w-full bg-[#f6f7f9]">
        <PublicHeader />
        {content}
        <PublicFooter />
      </div>
    );
  }

  return <div className="w-full bg-[#f6f7f9] px-8 py-8">{content}</div>;
}

