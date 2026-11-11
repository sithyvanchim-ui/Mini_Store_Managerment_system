import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  flat?: boolean;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  headerClassName,
  bodyClassName,
  flat = false,
}: SectionCardProps) {
  return (
    <section className={cn(flat ? "card-surface-flat" : "card-surface", className)}>
      {title || description || action ? (
        <div
          className={cn(
            "flex flex-col gap-2 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between",
            headerClassName,
          )}
        >
          <div className="min-w-0">
            {title ? (
              <h2 className="font-heading text-lg font-bold tracking-tight text-ink">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
