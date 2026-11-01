import Link from "next/link";
import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <>
    <Header />
    <main id="main-content" className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl bg-primary/10 p-4 text-primary">
        <Compass aria-hidden className="h-8 w-8" />
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-primary">404</p>
      <h1 className="mt-2 font-headline text-3xl font-bold tracking-tight sm:text-4xl">We couldn&apos;t find that page</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The link may be broken, or the listing may have been removed. Try browsing the homes that are available now.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="rounded-xl">
          <Link href="/properties">Browse properties</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
    <Footer />
    </>
  );
}
