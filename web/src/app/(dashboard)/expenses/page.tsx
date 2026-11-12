"use client";

import { useMemo, useState } from "react";
import { Coins, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { formatDate, formatKHR, todayISO } from "@/lib/utils";
import type { ExpenseCategory, Expense } from "@/types/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DataPagination } from "@/components/shared/data-pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useTodayExpenses,
} from "@/hooks/use-expenses";
import { useMe } from "@/hooks/use-me";

const PAGE_SIZE = 20;

const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; tone: "brand" | "lavender" | "warning" | "neutral" }
> = {
  restock: { label: "Restock", tone: "brand" },
  supplies: { label: "Supplies", tone: "lavender" },
  utility: { label: "Utility", tone: "warning" },
  other: { label: "Other", tone: "neutral" },
};

function AddExpenseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [businessDate, setBusinessDate] = useState(todayISO());
  const [category, setCategory] = useState<ExpenseCategory>("supplies");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const create = useCreateExpense();

  const amountValue = Number(amount);
  const valid =
    Boolean(businessDate) &&
    description.trim().length > 0 &&
    description.trim().length <= 200 &&
    Number.isFinite(amountValue) &&
    amountValue > 0;

  const submit = () => {
    if (!valid) return;
    create.mutate(
      {
        business_date: businessDate,
        category,
        description: description.trim(),
        amount: Math.floor(amountValue),
      },
      {
        onSuccess: () => {
          toast.success("Expense recorded", {
            description: `${formatKHR(Math.floor(amountValue))} logged for ${formatDate(businessDate)}.`,
          });
          setDescription("");
          setAmount("");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error("Could not record the expense", {
            description:
              error instanceof ApiError ? error.detail : "Please try again.",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[24px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-black text-ink">
            Record an expense
          </DialogTitle>
          <DialogDescription>
            Money already spent for the shop — restock fees, supplies, utility
            top-ups.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="space-y-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="expense-date" className="text-xs font-bold text-ink">
                Date
              </Label>
              <Input
                id="expense-date"
                type="date"
                value={businessDate}
                onChange={(event) => setBusinessDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="expense-category"
                className="text-xs font-bold text-ink"
              >
                Category
              </Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as ExpenseCategory)}
              >
                <SelectTrigger
                  id="expense-category"
                  className="w-full rounded-xl"
                  aria-label="Expense category"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restock">Restock</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="expense-description"
              className="text-xs font-bold text-ink"
            >
              Description
            </Label>
            <Input
              id="expense-description"
              maxLength={200}
              placeholder="e.g. Plastic bags and receipt rolls"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-amount" className="text-xs font-bold text-ink">
              Amount (KHR)
            </Label>
            <Input
              id="expense-amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={500}
              placeholder="e.g. 12000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full text-xs font-bold"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full text-xs font-bold"
              disabled={!valid || create.isPending}
            >
              {create.isPending ? "Saving…" : "Save expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ExpensesPage() {
  const me = useMe();
  const isAdmin = me.data?.user.role === "admin";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const listParams = useMemo(
    () => ({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(category === "all" ? {} : { category: category as ExpenseCategory }),
      page,
      page_size: PAGE_SIZE,
    }),
    [from, to, category, page],
  );

  const listQuery = useExpenses(listParams);
  const todayQuery = useTodayExpenses();
  const remove = useDeleteExpense();

  const rows = listQuery.data?.items ?? [];

  const confirmDelete = () => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Expense deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error("Could not delete the expense", {
          description:
            error instanceof ApiError ? error.detail : "Please try again.",
        });
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Money"
        title="Expenses"
        description="Track every KHR the shop spends, so the daily ABA check balances correctly."
        actions={
          <Button
            className="rounded-full text-xs font-bold"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            Add expense
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Spent today"
          value={formatKHR(todayQuery.data?.total ?? 0, { compact: true })}
          icon={<Coins />}
          tone="warning"
          hint="Counted in today's daily check"
        />
        <StatCard
          label="Listed total"
          value={formatKHR(listQuery.data?.sum ?? 0, { compact: true })}
          icon={<Coins />}
          tone="danger"
          hint="Current filter"
        />
      </div>

      <SectionCard
        title="Expense history"
        description="Newest first. Deducted from ABA sales in the daily check."
        bodyClassName="p-4 sm:p-5"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className="h-9 w-[150px] rounded-xl text-xs"
              aria-label="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              className="h-9 w-[150px] rounded-xl text-xs"
              aria-label="To date"
            />
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                className="h-9 w-[130px] rounded-xl text-xs"
                aria-label="Filter by category"
              >
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="restock">Restock</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {listQuery.isPending ? (
          <TableSkeleton rows={5} columns={5} />
        ) : listQuery.isError ? (
          <ErrorState
            title="Expenses could not be loaded"
            message={
              listQuery.error instanceof ApiError
                ? listQuery.error.detail
                : "Try again in a moment."
            }
            onRetry={() => void listQuery.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Coins />}
            title="No expenses here"
            description="Record delivery fees, supplies and utility top-ups as they are paid."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Recorded by</TableHead>
                  {isAdmin ? (
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => {
                  const meta = CATEGORY_META[item.category];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="pl-5 font-semibold text-ink">
                        {formatDate(item.business_date)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={meta.label} tone={meta.tone} />
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="line-clamp-1 text-sm text-ink">
                          {item.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-ink">
                        {formatKHR(item.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.created_by_name}
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="pr-5 text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${item.description}`}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="pt-4">
              <DataPagination
                page={listQuery.data?.page ?? page}
                pageSize={listQuery.data?.page_size ?? PAGE_SIZE}
                total={listQuery.data?.total ?? 0}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </SectionCard>

      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this expense?"
        description={
          deleteTarget
            ? `${deleteTarget.description} — ${formatKHR(deleteTarget.amount)} will be removed and today's totals will update.`
            : ""
        }
        confirmLabel="Delete expense"
        destructive
        onConfirm={confirmDelete}
        loading={remove.isPending}
      />
    </div>
  );
}
