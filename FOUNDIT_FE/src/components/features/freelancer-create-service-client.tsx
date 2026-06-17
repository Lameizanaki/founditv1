"use client";

import Link from "next/link";
import { useState } from "react";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

type PricingPackage = {
  price: number;
  delivery: number;
  revisions: number;
  description: string;
};

const createDefaultPackage = (): PricingPackage => ({
  price: 200,
  delivery: 5,
  revisions: 4,
  description: "Standard package",
});

export function FreelancerCreateServiceClient() {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const [currentStep, setCurrentStep] = useState(1);
  const [gigId, setGigId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [overview, setOverview] = useState({
    title: "",
    category: "",
    description: "",
    tags: "",
  });
  const [pricing, setPricing] = useState<PricingPackage>(createDefaultPackage());
  const [mainImage, setMainImage] = useState<File | null>(null);

  const submitOverview = async () => {
    if (!token) return;
    if (!overview.title.trim() || !overview.category.trim() || !overview.description.trim()) {
      setError("Title, category, and description are required.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest<Record<string, unknown>>("/freelancer/create-service", {
        method: "POST",
        token,
        body: {
          serviceTitle: overview.title,
          category: overview.category,
          serviceDescription: overview.description,
          tags: overview.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          paymentChoice: "",
          price: "",
          deliveryDate: "",
          rivision: "",
          packageDescription: "",
        },
      });

      const nextGigId = Number(response.gigId ?? response.id);
      if (!Number.isFinite(nextGigId) || nextGigId <= 0) {
        throw new Error("The backend did not return a usable gig ID.");
      }

      setGigId(nextGigId);
      setCurrentStep(2);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  };

  const submitPricing = async () => {
    if (!token || !gigId) return;
    setIsLoading(true);
    setError(null);

    try {
      await apiRequest(`/freelancer/${gigId}/choose-pricing`, {
        method: "PUT",
        token,
        body: {
          serviceTitle: overview.title,
          category: overview.category,
          serviceDescription: overview.description,
          tags: overview.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          paymentChoice: "standard",
          price: String(pricing.price),
          deliveryDate: String(pricing.delivery),
          rivision: String(pricing.revisions),
          packageDescription: pricing.description,
          pricingPackagesJson: JSON.stringify(
            [{
              type: "standard",
              label: "standard",
              price: pricing.price,
              deliveryDate: pricing.delivery,
              rivision: pricing.revisions,
              packageDescription: pricing.description,
            }],
          ),
        },
      });
      setCurrentStep(3);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  };

  const submitPublish = async () => {
    if (!token || !gigId || !mainImage) {
      setError("A cover image is required before publishing.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("main", mainImage);

      await apiRequest(`/freelancer/${gigId}/publish-service`, {
        method: "PUT",
        token,
        body: formData,
      });
      setSuccess("Service published successfully.");
      setCurrentStep(1);
      setGigId(null);
      setOverview({ title: "", category: "", description: "", tags: "" });
      setPricing(createDefaultPackage());
      setMainImage(null);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          href="/freelancer/dashboard"
        >
          Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-[38px] font-bold leading-tight tracking-[-0.02em] text-slate-900">
            Create a New Service
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            List your service and start earning from clients worldwide.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-100 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        ) : null}

        <div className="mb-8 flex items-center">
          {[1, 2, 3].map((step, index) => (
            <div key={step} className="flex flex-1 items-center">
              <div
                className={
                  currentStep >= step
                    ? "flex h-7 w-7 items-center justify-center rounded-full border border-green-600 bg-white text-xs font-semibold text-green-600"
                    : "flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-400"
                }
              >
                {step}
              </div>
              <span
                className={
                  currentStep >= step
                    ? "ml-2 text-sm font-medium text-green-600"
                    : "ml-2 text-sm font-medium text-slate-400"
                }
              >
                {step === 1 ? "Overview" : step === 2 ? "Pricing" : "Publish"}
              </span>
              {index < 2 ? (
                <div
                  className={
                    currentStep > step ? "mx-3 h-0.5 flex-1 rounded-full bg-green-500" : "mx-3 h-0.5 flex-1 rounded-full bg-slate-200"
                  }
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] md:p-6">
          {currentStep === 1 ? (
            <>
              <h2 className="text-[24px] font-semibold text-slate-900">Service Overview</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Service Title</label>
                  <input
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-600"
                    maxLength={80}
                    onChange={(event) => setOverview((current) => ({ ...current, title: event.target.value }))}
                    placeholder="e.g. I will design a modern UI/UX for your app"
                    value={overview.title}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
                  <input
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-green-600"
                    onChange={(event) => setOverview((current) => ({ ...current, category: event.target.value }))}
                    value={overview.category}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Service Description</label>
                  <textarea
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-600"
                    onChange={(event) => setOverview((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Describe your service in detail."
                    rows={6}
                    value={overview.description}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Tags</label>
                  <input
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-600"
                    onChange={(event) => setOverview((current) => ({ ...current, tags: event.target.value }))}
                    placeholder="react, ui, typescript"
                    value={overview.tags}
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end">
                <button
                  className="rounded-xl bg-green-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                  disabled={isLoading}
                  onClick={() => void submitOverview()}
                  type="button"
                >
                  {isLoading ? "Please wait..." : "Continue"}
                </button>
              </div>
            </>
          ) : null}

          {currentStep === 2 ? (
            <>
              <h2 className="text-[24px] font-semibold text-slate-900">Standard Package</h2>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-green-600 bg-green-50 p-5 shadow-[inset_0_0_0_1px_rgba(22,163,74,0.2)]">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-600">
                      Single Package
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">Standard</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Keep one clear package so clients see one straightforward offer.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      ["price", "Price ($)"],
                      ["delivery", "Delivery (days)"],
                      ["revisions", "Revisions"],
                      ["description", "Package Description"],
                    ].map(([field, label]) => (
                      <div key={field}>
                        <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
                        <input
                          className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-green-600"
                          onChange={(event) =>
                            setPricing((current) => ({
                              ...current,
                              [field]:
                                field === "description"
                                  ? event.target.value
                                  : Number(event.target.value),
                            }))
                          }
                          type={field === "description" ? "text" : "number"}
                          value={String(pricing[field as keyof PricingPackage])}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setCurrentStep(1)}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="rounded-xl bg-green-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                  disabled={isLoading}
                  onClick={() => void submitPricing()}
                  type="button"
                >
                  {isLoading ? "Saving..." : "Continue"}
                </button>
              </div>
            </>
          ) : null}

          {currentStep === 3 ? (
            <>
              <h2 className="text-[24px] font-semibold text-slate-900">Upload & Publish</h2>
              <div className="mt-6 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Cover Image</label>
                  <input
                    accept="image/*"
                    className="block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-green-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    onChange={(event) => setMainImage(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </div>
                <div className="rounded-2xl border border-green-300 bg-green-50 px-5 py-4">
                  <p className="text-base font-semibold text-slate-900">Ready to Publish?</p>
                  <p className="mt-1 text-sm text-slate-500">
                    One strong cover image is enough for this version of your listing.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setCurrentStep(2)}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="rounded-xl bg-green-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                  disabled={isLoading}
                  onClick={() => void submitPublish()}
                  type="button"
                >
                  {isLoading ? "Publishing..." : "Publish Service"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
