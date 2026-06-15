"use client";

import Link from "next/link";
import { useState } from "react";
import { apiRequest, toErrorMessage } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

type PackageType = "basic" | "standard" | "premium";

type PricingPackage = {
  price: number;
  delivery: number;
  revisions: number;
  description: string;
};

const createDefaultPackages = () => ({
  basic: { price: 100, delivery: 7, revisions: 2, description: "Basic package" },
  standard: { price: 200, delivery: 5, revisions: 4, description: "Standard package" },
  premium: { price: 300, delivery: 3, revisions: 6, description: "Premium package" },
});

export function FreelancerCreateServiceClient() {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const [currentStep, setCurrentStep] = useState(1);
  const [gigId, setGigId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageType>("standard");
  const [overview, setOverview] = useState({
    title: "",
    category: "",
    description: "",
    tags: "",
  });
  const [packages, setPackages] = useState<Record<PackageType, PricingPackage>>(createDefaultPackages());
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [coverImages, setCoverImages] = useState<File[]>([]);

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
    const selected = packages[selectedPackage];
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
          paymentChoice: selectedPackage,
          price: String(selected.price),
          deliveryDate: String(selected.delivery),
          rivision: String(selected.revisions),
          packageDescription: selected.description,
          pricingPackagesJson: JSON.stringify(
            Object.entries(packages).map(([type, pkg]) => ({
              type,
              label: type,
              price: pkg.price,
              deliveryDate: pkg.delivery,
              rivision: pkg.revisions,
              packageDescription: pkg.description,
            })),
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
      coverImages.forEach((file) => formData.append("cover", file));

      await apiRequest(`/freelancer/${gigId}/publish-service`, {
        method: "PUT",
        token,
        body: formData,
      });
      setSuccess("Service published successfully.");
      setCurrentStep(1);
      setGigId(null);
      setOverview({ title: "", category: "", description: "", tags: "" });
      setPackages(createDefaultPackages());
      setSelectedPackage("standard");
      setMainImage(null);
      setCoverImages([]);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#4b5563] transition hover:text-[#111827]"
          href="/freelancer/dashboard"
        >
          Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#111827]">
            Create a New Service
          </h1>
          <p className="mt-2 text-sm text-[#6b7280]">
            List your service and start earning from clients worldwide.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-[#fecaca] bg-[#fee2e2] p-4 text-sm text-[#dc2626]">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-6 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-sm text-[#166534]">
            {success}
          </div>
        ) : null}

        <div className="mb-8 flex items-center">
          {[1, 2, 3].map((step, index) => (
            <div key={step} className="flex flex-1 items-center">
              <div
                className={
                  currentStep >= step
                    ? "flex h-7 w-7 items-center justify-center rounded-full border border-[#16a34a] bg-white text-xs font-semibold text-[#16a34a]"
                    : "flex h-7 w-7 items-center justify-center rounded-full border border-[#d1d5db] bg-white text-xs font-semibold text-[#9ca3af]"
                }
              >
                {step}
              </div>
              <span
                className={
                  currentStep >= step
                    ? "ml-2 text-sm font-medium text-[#16a34a]"
                    : "ml-2 text-sm font-medium text-[#9ca3af]"
                }
              >
                {step === 1 ? "Overview" : step === 2 ? "Pricing" : "Publish"}
              </span>
              {index < 2 ? (
                <div
                  className={
                    currentStep > step ? "mx-3 h-0.5 flex-1 rounded-full bg-[#22c55e]" : "mx-3 h-0.5 flex-1 rounded-full bg-[#e5e7eb]"
                  }
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] md:p-6">
          {currentStep === 1 ? (
            <>
              <h2 className="text-[24px] font-semibold text-[#111827]">Service Overview</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#374151]">Service Title</label>
                  <input
                    className="h-12 w-full rounded-xl border border-[#d1d5db] bg-white px-4 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#16a34a]"
                    maxLength={80}
                    onChange={(event) => setOverview((current) => ({ ...current, title: event.target.value }))}
                    placeholder="e.g. I will design a modern UI/UX for your app"
                    value={overview.title}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#374151]">Category</label>
                  <input
                    className="h-12 w-full rounded-xl border border-[#d1d5db] bg-white px-4 text-sm text-[#111827] outline-none focus:border-[#16a34a]"
                    onChange={(event) => setOverview((current) => ({ ...current, category: event.target.value }))}
                    value={overview.category}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#374151]">Service Description</label>
                  <textarea
                    className="w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#16a34a]"
                    onChange={(event) => setOverview((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Describe your service in detail."
                    rows={6}
                    value={overview.description}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#374151]">Tags</label>
                  <input
                    className="h-12 w-full rounded-xl border border-[#d1d5db] bg-white px-4 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#16a34a]"
                    onChange={(event) => setOverview((current) => ({ ...current, tags: event.target.value }))}
                    placeholder="react, ui, typescript"
                    value={overview.tags}
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end">
                <button
                  className="rounded-xl bg-[#16a34a] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-60"
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
              <h2 className="text-[24px] font-semibold text-[#111827]">Pricing & Packages</h2>
              <div className="mt-6 space-y-4">
                {(["basic", "standard", "premium"] as PackageType[]).map((packageType) => (
                  <div
                    key={packageType}
                    className={
                      selectedPackage === packageType
                        ? "rounded-2xl border border-[#16a34a] bg-[#f0fdf4] p-5 shadow-[inset_0_0_0_1px_rgba(22,163,74,0.2)]"
                        : "rounded-2xl border border-[#e5e7eb] p-5"
                    }
                  >
                    <button
                      className="mb-4 text-left text-xl font-semibold text-[#111827]"
                      onClick={() => setSelectedPackage(packageType)}
                      type="button"
                    >
                      {packageType[0].toUpperCase() + packageType.slice(1)}
                    </button>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {[
                        ["price", "Price ($)"],
                        ["delivery", "Delivery (days)"],
                        ["revisions", "Revisions"],
                        ["description", "Package Description"],
                      ].map(([field, label]) => (
                        <div key={field}>
                          <label className="mb-2 block text-sm font-medium text-[#374151]">{label}</label>
                          <input
                            className="h-11 w-full rounded-xl border border-[#d1d5db] px-4 text-sm outline-none focus:border-[#16a34a]"
                            onChange={(event) =>
                              setPackages((current) => ({
                                ...current,
                                [packageType]: {
                                  ...current[packageType],
                                  [field]:
                                    field === "description"
                                      ? event.target.value
                                      : Number(event.target.value),
                                },
                              }))
                            }
                            type={field === "description" ? "text" : "number"}
                            value={String(packages[packageType][field as keyof PricingPackage])}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  className="rounded-xl border border-[#d1d5db] bg-white px-6 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
                  onClick={() => setCurrentStep(1)}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="rounded-xl bg-[#16a34a] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-60"
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
              <h2 className="text-[24px] font-semibold text-[#111827]">Upload & Publish</h2>
              <div className="mt-6 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#374151]">Cover Image</label>
                  <input
                    accept="image/*"
                    className="block rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#374151] file:mr-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    onChange={(event) => setMainImage(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#374151]">Gallery Images</label>
                  <input
                    accept="image/*"
                    className="block rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#374151] file:mr-3 file:rounded-lg file:border-0 file:bg-[#16a34a] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    multiple
                    onChange={(event) => setCoverImages(Array.from(event.target.files ?? []).slice(0, 3))}
                    type="file"
                  />
                </div>
                <div className="rounded-2xl border border-[#86efac] bg-[#ecfdf3] px-5 py-4">
                  <p className="text-base font-semibold text-[#111827]">Ready to Publish?</p>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Your service listing will be reviewed and go live after publishing.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  className="rounded-xl border border-[#d1d5db] bg-white px-6 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
                  onClick={() => setCurrentStep(2)}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="rounded-xl bg-[#16a34a] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-60"
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
