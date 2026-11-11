import { cn, categoryColor, getInitials } from "@/lib/utils";

interface ProductThumbProps {
  name: string;
  category?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "size-8 rounded-xl text-[10px]",
  md: "size-10 rounded-2xl text-xs",
  lg: "size-12 rounded-2xl text-sm",
};

export function ProductThumb({
  name,
  category,
  size = "md",
  className,
}: ProductThumbProps) {
  const color = categoryColor(category ?? name);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-heading font-extrabold text-white shadow-sm",
        sizes[size],
        className,
      )}
      style={{
        backgroundColor: color,
        boxShadow: `0 8px 18px ${color}33`,
      }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}
