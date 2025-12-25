import type { Metadata } from "next";

import "./globals.css";
import { cn } from "@/utils";
import { Toaster } from "@/components/ui/toaster";
import { HeaderAndFooterProvider } from "@/components/header-and-footer-provider";
import { FirebaseClientProvider } from "@/firebase";
import { SupportBubble } from "@/components/support-bubble";



export const metadata: Metadata = {
  title: {
    default: "Lodger",
    template: "%s | Lodger",
  },
  description: "The easiest way for university students to find and book their next rental property.",
  openGraph: {
    title: "Lodger - Find Your Perfect Student Home",
    description: "The easiest way for university students to find and book their next rental property.",
    url: "https://your-domain.com", // TODO: Replace with your actual domain
    siteName: "Lodger",
    images: [
      {
        url: "https://your-domain.com/og-image.png", // TODO: Replace with your actual OG image URL
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
    // TODO: Add your Twitter handle
    // creator: "@your_handle", 
    images: ["https://your-domain.com/og-image.png"], // TODO: Replace with your actual OG image URL
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: "/favicon.ico", // Ensure you have a favicon.ico in your public folder
  }
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-body text-foreground antialiased",
          "font-inter font-space-grotesk"
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


