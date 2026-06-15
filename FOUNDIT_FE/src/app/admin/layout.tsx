import { DashboardShell } from "@/components/shell/dashboard-shell";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    note: "Overview",
  },
  {
    href: "/admin/users",
    label: "Users",
    note: "Management",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    note: "Reviews",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    note: "Platform",
  },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardShell
      description="Use this shell to migrate the moderation panels, user management, and settings pages from Angular."
      navItems={navItems}
      role="ADMIN"
      title="Admin"
    >
      {children}
    </DashboardShell>
  );
}
