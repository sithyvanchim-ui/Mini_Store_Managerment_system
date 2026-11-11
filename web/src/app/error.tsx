"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card-surface w-full max-w-md p-10 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </span>
        <h1 className="mt-6 font-heading text-2xl font-extrabold text-ink">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The page could not be rendered. Try again, or return to the overview if
          the problem persists.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button className="rounded-full" onClick={reset}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/">Back to overview</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
