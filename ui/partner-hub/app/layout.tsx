import type { Metadata } from "next";
import "../styles/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";

const siteTitle = "Portfolio Hub";
const siteDescription =
  "A solutions architect portfolio for data center infrastructure, showcasing tools, architectures, and proof points.";

// For local static serving, leave NEXT_PUBLIC_SITE_URL unset and the URLs below will
// resolve to http://localhost:3000/partner-hub/*.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const basePath = "/partner-hub";

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    images: [
      {
        url: `${basePath}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: "Portfolio Hub social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [`${basePath}/twitter-image.png`],
  },
  icons: {
    icon: `${basePath}/brand/favicon.svg`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
