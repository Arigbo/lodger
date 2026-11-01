"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl bg-destructive/10 p-4 text-destructive">
        <AlertTriangle aria-hidden className="h-8 w-8" />
      </div>
      <h1 className="mt-6 font-headline text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        An unexpected error occurred. You can try again, and if it keeps happening please contact support.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset} className="rounded-xl">
          Try again
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
