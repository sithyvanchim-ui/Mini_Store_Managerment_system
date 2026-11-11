import Link from "next/link";
import { Refrigerator } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandProps {
  compact?: boolean;
  className?: string;
  onNavigate?: () => void;
}

export function Brand({ compact = false, className, onNavigate }: BrandProps) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className={cn("group flex items-center gap-3", className)}
      aria-label="MiniStore home"
    >
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_rgba(15,181,160,0.3)] transition-transform group-hover:-translate-y-0.5">
        <Refrigerator className="size-5" strokeWidth={2.2} />
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-card bg-warning" />
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className="block font-heading text-[17px] font-extrabold leading-tight tracking-tight text-ink">
            MiniStore
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Dorm operations
          </span>
        </span>
      ) : null}
    </Link>
  );
}
