import Link from "next/link";
import { PublicHeader } from "@/components/shell/public-header";

const features = ["Secure payments", "Verified freelancers", "Instant hiring"];

const categories = [
  { title: "UI/UX Design", subtitle: "426 experts" },
  { title: "Web Development", subtitle: "612 experts" },
  { title: "Graphic Design", subtitle: "388 experts" },
  { title: "Content Writing", subtitle: "294 experts" },
  { title: "Video Editing", subtitle: "201 experts" },
  { title: "Digital Marketing", subtitle: "340 experts" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#eef5f0]">
      <PublicHeader />

      <section className="mx-auto w-full max-w-[1600px] px-6 pb-16 pt-8 lg:px-10 lg:pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-2xl pl-0 lg:pl-16 lg:pr-16">
            <h1 className="leading-[0.98] tracking-[-0.03em] text-[#0f172a]">
              <span className="block text-[52px] font-extrabold md:text-[68px]">Find Top</span>
              <span className="block text-[52px] font-extrabold md:text-[68px]">Freelancers</span>
              <span className="block text-[52px] font-extrabold md:text-[68px]">
                on <span className="text-[#16a34a]">FoundIt</span>
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-[20px] leading-9 text-slate-600">
              Browse thousands of expert freelancers. Hire instantly, collaborate easily, and pay
              securely all in one platform.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-8 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] transition hover:bg-[#1d4ed8]"
                href="/browse-freelancers"
              >
                Browse Freelancers
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-2xl bg-[#16a34a] px-8 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(22,163,74,0.28)] transition hover:bg-[#15803d]"
                href="/browse-gigs"
              >
                Browse Gigs
              </Link>
            </div>

            <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-4xl">
            <div className="absolute inset-4 rounded-[40px] bg-[#dff0e7] blur-[2px]" />
            <div className="relative overflow-visible rounded-[34px] bg-white/40 p-5">
              <div className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
                <video
                  autoPlay
                  className="h-full w-full object-cover md:h-[720px]"
                  loop
                  muted
                  playsInline
                  preload="auto"
                >
                  <source src="/assets/videos/landingGif.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f7f7] py-20 lg:px-10">
        <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full text-center">
            <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-[#0f172a] md:text-[40px]">
              Browse by Popular Categories
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[18px] leading-8 text-[#6b7280]">
              Explore our diverse freelance marketplace to find top-tier professionals for any
              digital project.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {categories.map((category) => (
              <div
                key={category.title}
                className="rounded-[22px] border border-[#e8e8ea] bg-white px-6 py-8 text-center shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf7ef]">
                  <span className="text-2xl text-[#16a34a]">●</span>
                </div>

                <div className="mt-5">
                  <h3 className="text-[16px] font-extrabold leading-7 text-[#111827]">
                    {category.title}
                  </h3>
                  <p className="mt-1 text-[15px] leading-7 text-[#8b9099]">
                    {category.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#eef5f0] px-6 py-16 lg:px-10">
        <div className="mx-auto grid w-full max-w-[1600px] gap-5 lg:grid-cols-3">
          {[
            {
              href: "/client/dashboard",
              title: "Client Workspace",
              description: "Manage orders, profile, and hiring flows.",
            },
            {
              href: "/freelancer/dashboard",
              title: "Freelancer Workspace",
              description: "Track gigs, earnings, and active work.",
            },
            {
              href: "/admin/dashboard",
              title: "Admin Workspace",
              description: "Review platform stats, users, and settings.",
            },
          ].map((card) => (
            <Link
              key={card.href}
              className="rounded-[24px] border border-[#e5e7eb] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              href={card.href}
            >
              <h3 className="text-[22px] font-bold text-[#111827]">{card.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-[#6b7280]">{card.description}</p>
              <p className="mt-6 text-sm font-semibold text-[#16a34a]">Open workspace</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
