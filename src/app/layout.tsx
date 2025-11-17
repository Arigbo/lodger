'use client';

import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

// Since we are using a client component, we can't export metadata directly.
// This would typically be handled in a parent server component or on a per-page basis.
// For now, we'll manage the title in the <head> tag directly.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard');

  return (
    <html lang="en" className="h-full">
      <head>
        <title>RentU - Student Housing Made Easy</title>
        <meta name="description" content="Find and book your perfect student rental." />
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
          inter.variable,
          spaceGrotesk.variable
        )}
      >
        <div className="flex min-h-screen flex-col">
          {!isDashboard && <Header />}
          <main className="flex-grow">{children}</main>
          {!isDashboard && <Footer />}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
