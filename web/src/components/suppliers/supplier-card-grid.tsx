"use client";

import {
  Mail,
  MapPin,
  Pencil,
  Phone,
  Power,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn, getInitials } from "@/lib/utils";
import type { Supplier } from "@/types/api";

function DetailRow({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 break-words text-ink">{children}</div>
    </div>
  );
}

interface SupplierCardGridProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDeactivate: (supplier: Supplier) => void;
  onActivate: (supplier: Supplier) => void;
}

export function SupplierCardGrid({
  suppliers,
  onEdit,
  onDeactivate,
  onActivate,
}: SupplierCardGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {suppliers.map((supplier) => {
        const hasContact =
          supplier.contact_name ||
          supplier.phone ||
          supplier.email ||
          supplier.address;

        return (
          <article
            key={supplier.id}
            className={cn(
              "card-surface-flat flex flex-col p-5",
              !supplier.is_active && "opacity-80",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mint font-heading text-sm font-extrabold text-brand-strong"
                  aria-hidden="true"
                >
                  {getInitials(supplier.name)}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-heading text-base font-bold text-ink">
                    {supplier.name}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {supplier.contact_name ?? "No contact person"}
                  </p>
                </div>
              </div>
              <StatusBadge
                label={supplier.is_active ? "Active" : "Inactive"}
                tone={supplier.is_active ? "success" : "neutral"}
              />
            </div>

            <div className="mt-4 space-y-2">
              {hasContact ? (
                <>
                  {supplier.contact_name ? (
                    <DetailRow icon={UserRound}>
                      {supplier.contact_name}
                    </DetailRow>
                  ) : null}
                  {supplier.phone ? (
                    <DetailRow icon={Phone}>
                      <a
                        href={`tel:${supplier.phone}`}
                        className="hover:text-brand-strong hover:underline"
                      >
                        {supplier.phone}
                      </a>
                    </DetailRow>
                  ) : null}
                  {supplier.email ? (
                    <DetailRow icon={Mail}>
                      <a
                        href={`mailto:${supplier.email}`}
                        className="break-all hover:text-brand-strong hover:underline"
                      >
                        {supplier.email}
                      </a>
                    </DetailRow>
                  ) : null}
                  {supplier.address ? (
                    <DetailRow icon={MapPin}>{supplier.address}</DetailRow>
                  ) : null}
                </>
              ) : (
                <p className="rounded-xl bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                  No contact details recorded yet.
                </p>
              )}
            </div>

            {supplier.notes ? (
              <p className="mt-3 line-clamp-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
                {supplier.notes}
              </p>
            ) : null}

            <div className="mt-auto flex items-center justify-end gap-2 border-t border-border/70 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => onEdit(supplier)}
                aria-label={`Edit ${supplier.name}`}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
              {supplier.is_active ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDeactivate(supplier)}
                  aria-label={`Deactivate ${supplier.name}`}
                >
                  <Power className="size-3.5" />
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-brand-strong hover:bg-mint"
                  onClick={() => onActivate(supplier)}
                  aria-label={`Activate ${supplier.name}`}
                >
                  <Power className="size-3.5" />
                  Activate
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
