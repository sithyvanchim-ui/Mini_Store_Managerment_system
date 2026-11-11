"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateSupplier,
  useUpdateSupplier,
} from "@/hooks/use-suppliers";
import type { Supplier } from "@/types/api";

const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Supplier name is required")
    .max(120, "Use 120 characters or fewer"),
  contact_name: z.string().trim().max(120, "Use 120 characters or fewer"),
  phone: z.string().trim().max(40, "Use 40 characters or fewer"),
  email: z
    .string()
    .trim()
    .max(160, "Use 160 characters or fewer")
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address",
    ),
  address: z.string().trim().max(300, "Use 300 characters or fewer"),
  notes: z.string().trim().max(500, "Use 500 characters or fewer"),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

const emptyValues: SupplierFormValues = {
  name: "",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: SupplierFormDialogProps) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isEditing = Boolean(supplier);
  const isPending = createSupplier.isPending || updateSupplier.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      supplier
        ? {
            name: supplier.name,
            contact_name: supplier.contact_name ?? "",
            phone: supplier.phone ?? "",
            email: supplier.email ?? "",
            address: supplier.address ?? "",
            notes: supplier.notes ?? "",
          }
        : emptyValues,
    );
  }, [open, supplier, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      contact_name: values.contact_name.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      address: values.address.trim() || null,
      notes: values.notes.trim() || null,
    };

    try {
      if (supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, payload });
        toast.success("Supplier updated", {
          description: `${payload.name} was saved.`,
        });
      } else {
        await createSupplier.mutateAsync(payload);
        toast.success("Supplier added", {
          description: `${payload.name} is now in the directory.`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        isEditing ? "Could not update supplier" : "Could not add supplier",
        {
          description:
            error instanceof ApiError
              ? error.detail
              : "Check the form and try again.",
        },
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-ink">
            {isEditing ? "Edit supplier" : "Add supplier"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update contact details and notes for this partner."
              : "Keep supplier contacts handy for restocking and purchase records."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="supplier-name">Supplier name</Label>
            <Input
              id="supplier-name"
              className="mt-1.5 h-10 rounded-xl"
              placeholder="e.g. Thai Market Wholesale"
              autoComplete="organization"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="supplier-contact">Contact name</Label>
              <Input
                id="supplier-contact"
                className="mt-1.5 h-10 rounded-xl"
                placeholder="e.g. Sokha"
                autoComplete="name"
                aria-invalid={Boolean(errors.contact_name)}
                {...register("contact_name")}
              />
              <FieldError message={errors.contact_name?.message} />
            </div>
            <div>
              <Label htmlFor="supplier-phone">Phone</Label>
              <Input
                id="supplier-phone"
                className="mt-1.5 h-10 rounded-xl"
                placeholder="012 345 678"
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
              />
              <FieldError message={errors.phone?.message} />
            </div>
          </div>

          <div>
            <Label htmlFor="supplier-email">Email</Label>
            <Input
              id="supplier-email"
              type="email"
              className="mt-1.5 h-10 rounded-xl"
              placeholder="orders@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>

          <div>
            <Label htmlFor="supplier-address">Address</Label>
            <Textarea
              id="supplier-address"
              className="mt-1.5 min-h-16 rounded-xl"
              placeholder="Market stall, street, district"
              {...register("address")}
            />
            <FieldError message={errors.address?.message} />
          </div>

          <div>
            <Label htmlFor="supplier-notes">Notes</Label>
            <Textarea
              id="supplier-notes"
              className="mt-1.5 min-h-20 rounded-xl"
              placeholder="Delivery days, payment terms, or other reminders"
              {...register("notes")}
            />
            <FieldError message={errors.notes?.message} />
          </div>

          <DialogFooter className="rounded-b-[24px]">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-brand text-white hover:bg-brand-strong"
              disabled={isPending}
            >
              <Handshake className="size-4" />
              {isPending
                ? "Saving…"
                : isEditing
                  ? "Save changes"
                  : "Add supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
