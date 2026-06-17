import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Code2,
  CreditCard,
  Layout,
  Megaphone,
  Palette,
  PenLine,
  Search,
  ShieldCheck,
  UserCheck,
  Video,
} from "lucide-react";
import { PublicHeader } from "@/components/shell/public-header";
import { PublicFooter } from "@/components/shell/public-footer";

const features = [
  { icon: ShieldCheck, label: "Secure payments" },
  { icon: UserCheck, label: "Verified freelancers" },
  { icon: CreditCard, label: "Easy checkout" },
];

const categories = [
  { icon: Layout, title: "UI/UX Design", subtitle: "426 experts" },
  { icon: Code2, title: "Web Development", subtitle: "612 experts" },
  { icon: Palette, title: "Graphic Design", subtitle: "388 experts" },
  { icon: PenLine, title: "Content Writing", subtitle: "294 experts" },
  { icon: Video, title: "Video Editing", subtitle: "201 experts" },
  { icon: Megaphone, title: "Digital Marketing", subtitle: "340 experts" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
              Freelance marketplace
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              <span className="block">Find top</span>
              <span className="block">freelancers</span>
              <span className="block">
                on <span className="text-green-600">FoundIt</span>
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Browse thousands of expert freelancers. Hire instantly, collaborate easily, and pay
              securely all in one platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:text-base"
                href="/browse-freelancers"
              >
                Browse Freelancers
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-green-200 hover:text-green-700 sm:text-base"
                href="/browse-gigs"
              >
                <Search className="h-4 w-4" />
                Browse Gigs
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.label}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-600"
                  >
                    <Icon className="h-4 w-4 text-green-600" />
                    <span>{feature.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <video
              autoPlay
              className="h-64 w-full rounded-xl object-cover sm:h-80 md:h-96 lg:h-[520px]"
              loop
              muted
              playsInline
              preload="auto"
            >
              <source src="/assets/videos/landingGif.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Browse by Popular Categories</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Explore our diverse freelance marketplace to find top-tier professionals for any
              digital project.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <div
                  key={category.title}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700">
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="mt-4">
                    <h3 className="text-base font-semibold text-slate-900">{category.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{category.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 md:py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            {
              icon: BriefcaseBusiness,
              href: "/client/dashboard",
              title: "Client Workspace",
              description: "Manage orders, profile, and hiring flows.",
            },
            {
              icon: CheckCircle2,
              href: "/freelancer/dashboard",
              title: "Freelancer Workspace",
              description: "Track gigs, earnings, and active work.",
            },
            {
              icon: ShieldCheck,
              href: "/admin/dashboard",
              title: "Admin Workspace",
              description: "Review platform stats, users, and settings.",
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                href={card.href}
              >
                <Icon className="h-6 w-6 text-green-700" />
                <h3 className="mt-4 text-xl font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                <p className="mt-5 text-sm font-semibold text-green-700">Open workspace</p>
              </Link>
            );
          })}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
