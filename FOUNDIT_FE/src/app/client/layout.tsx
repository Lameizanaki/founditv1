import { DashboardShell } from "@/components/shell/dashboard-shell";

const navItems = [
  {
    href: "/client/dashboard",
    label: "Dashboard",
    note: "Overview",
  },
  {
    href: "/client/browse-freelancers",
    label: "Find Freelancers",
    note: "Browse",
  },
  {
    href: "/client/browse-gigs",
    label: "Browse Gigs",
    note: "Marketplace",
  },
  {
    href: "/client/my-orders",
    label: "My Orders",
    note: "Projects",
  },
  {
    href: "/client/chat",
    label: "Chat",
    note: "Messages",
  },
  {
    href: "/client/ekyc",
    label: "eKYC",
    note: "Verification",
  },
  {
    href: "/client/my-profile",
    label: "My Profile",
    note: "Account",
  },
  {
    href: "/client/setting",
    label: "Settings",
    note: "Preferences",
  },
];

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardShell
      description="Use this shell to migrate client profile, order, browse, and payment flows on top of the Spring Boot API."
      navItems={navItems}
      role="CLIENT"
      title="Client"
    >
      {children}
    </DashboardShell>
  );
}
