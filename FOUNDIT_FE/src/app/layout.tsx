import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ChatNotificationProvider } from "@/components/providers/chat-notification-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "FoundIt",
    template: "%s | FoundIt",
  },
  description: "FoundIt marketplace frontend rebuilt with Next.js and React.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>
          <ChatNotificationProvider>{children}</ChatNotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
