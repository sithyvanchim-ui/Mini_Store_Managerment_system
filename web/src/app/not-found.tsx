import Link from "next/link";
import { Refrigerator, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card-surface w-full max-w-md p-10 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-mint text-brand-strong">
          <Refrigerator className="size-7" />
        </span>
        <p className="mt-6 font-heading text-5xl font-extrabold tracking-tight text-ink">
          404
        </p>
        <h1 className="mt-2 font-heading text-xl font-bold text-ink">
          This shelf is empty
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to overview
          </Link>
        </Button>
      </div>
    </main>
  );
}
