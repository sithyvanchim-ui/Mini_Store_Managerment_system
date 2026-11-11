"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    router.push(`/inventory?q=${encodeURIComponent(query)}`);
    setValue("");
  }

  return (
    <form onSubmit={submit} className={cn("relative w-full max-w-[430px]", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search products, sales, suppliers…"
        aria-label="Search products, sales, and suppliers"
        className="h-11 w-full rounded-full border border-border/80 bg-white/80 pl-11 pr-20 text-[13px] text-ink shadow-[0_8px_24px_rgba(20,60,50,0.04)] outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-muted/70 px-1.5 py-1 text-[10px] font-semibold text-muted-foreground sm:flex">
        <span className="text-[11px]">⌘</span>K
      </kbd>
    </form>
  );
}
