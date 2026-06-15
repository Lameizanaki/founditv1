import { DashboardShell } from "@/components/shell/dashboard-shell";

const navItems = [
  {
    href: "/freelancer/dashboard",
    label: "Dashboard",
    note: "Overview",
  },
  {
    href: "/freelancer/active-work",
    label: "My Work",
    note: "Projects",
  },
  {
    href: "/freelancer/my-services",
    label: "My Services",
    note: "Gigs",
  },
  {
    href: "/freelancer/hire-requests",
    label: "Incoming Requests",
    note: "Requests",
  },
  {
    href: "/freelancer/chat",
    label: "Chat",
    note: "Messages",
  },
  {
    href: "/freelancer/ekyc",
    label: "eKYC",
    note: "Verification",
  },
  {
    href: "/freelancer/profile",
    label: "Profile",
    note: "Portfolio",
  },
  {
    href: "/freelancer/setting",
    label: "Settings",
    note: "Account",
  },
];

export default function FreelancerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardShell
      description="Use this shell to port freelancer profile editing, gigs, hire requests, and delivery workflows."
      navItems={navItems}
      role="FREELANCER"
      title="Freelancer"
    >
      {children}
    </DashboardShell>
  );
}
