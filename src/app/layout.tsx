import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/utils";
import { Toaster } from "@/components/ui/toaster";
import { HeaderAndFooterProvider } from "@/components/header-and-footer-provider";
import { FirebaseClientProvider } from "@/firebase";
import { SupportBubble } from "@/components/support-bubble";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"]
});

export const metadata: Metadata = {
  title: {
    default: "LODGER | Student Living",
    template: "%s | LODGER",
  },
  description: "Find your perfect student home. LODGER offers a curated collection of residences for the modern scholar.",
  metadataBase: new URL('https://lodger.app'),
  keywords: ["student housing", "premium rentals", "university living", "student apartments"],
  openGraph: {
    title: "Lodger - Find Your Perfect Student Home",
    description: "The easiest way for university students to find and book their next rental property.",
    url: "https://lodger.app",
    siteName: "Lodger",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lodger - Find Your Perfect Student Home",
    description: "The easiest way for university students to find and book their next rental property.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          outfit.variable,
          playfair.variable
        )}
      >
        <FirebaseClientProvider>
          <HeaderAndFooterProvider>{children}</HeaderAndFooterProvider>
        </FirebaseClientProvider>
        <Toaster />
        <SupportBubble />
      </body>
    </html>
  );
}
