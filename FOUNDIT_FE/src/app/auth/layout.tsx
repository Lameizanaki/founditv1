import { PublicHeader } from "@/components/shell/public-header";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen pb-12">
      <PublicHeader />
      <div className="px-4 pt-6 sm:px-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </div>
    </main>
  );
}
