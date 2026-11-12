"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { cn, formatDateTime, formatKHR } from "@/lib/utils";
import type { FundDecision, FundRequest, FundRequestStatus } from "@/types/api";
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
  useCreateFundRequest,
  useDisburseFundRequest,
  useFundRequests,
  usePendingFundCount,
  useReviewFundRequest,
} from "@/hooks/use-funds";
import { useMe } from "@/hooks/use-me";

const PAGE_SIZE = 20;

function fundStatusMeta(status: FundRequestStatus): {
  label: string;
  tone: "warning" | "success" | "danger" | "brand";
} {
  switch (status) {
    case "approved":
      return { label: "Approved", tone: "success" };
    case "rejected":
      return { label: "Rejected", tone: "danger" };
    case "disbursed":
      return { label: "Disbursed", tone: "brand" };
    default:
      return { label: "Pending", tone: "warning" };
  }
}

function RequestMoneyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [note, setNote] = useState("");
  const create = useCreateFundRequest();

  const amountValue = Number(amount);
  const valid =
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    purpose.trim().length > 0 &&
    purpose.trim().length <= 200;

  const submit = () => {
    if (!valid) return;
    create.mutate(
      {
        amount: Math.floor(amountValue),
        purpose: purpose.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: (request) => {
          toast.success(`Request ${request.reference} submitted`, {
            description: "An admin will review it shortly.",
          });
          setAmount("");
          setPurpose("");
          setNote("");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error("Could not submit the request", {
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
            Request money from the main account
          </DialogTitle>
          <DialogDescription>
            Ask the admin to send ABA funds for buying products or supplies.
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
        <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fund-amount" className="text-xs font-bold text-ink">
            Amount (KHR)
          </Label>
          <Input
            id="fund-amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={500}
            placeholder="e.g. 40000"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fund-purpose" className="text-xs font-bold text-ink">
            Purpose
          </Label>
          <Input
            id="fund-purpose"
            maxLength={200}
            placeholder="e.g. Restock milk and jelly"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fund-note" className="text-xs font-bold text-ink">
            Note (optional)
          </Label>
          <Textarea
            id="fund-note"
            rows={2}
            maxLength={2000}
            placeholder="Anything the approver should know."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
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
            {create.isPending ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({
  target,
  decision,
  onOpenChange,
}: {
  target: FundRequest;
  decision: FundDecision;
  onOpenChange: (open: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const review = useReviewFundRequest();
  const rejecting = decision === "rejected";

  const submit = () => {
    review.mutate(
      {
        id: target.id,
        payload: {
          decision,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(
            `Request ${target.reference} ${decision}`,
            {
              description: rejecting
                ? "The requester will see your note."
                : "You can disburse the money when it is sent.",
            },
          );
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(`Could not ${decision} the request`, {
            description:
              error instanceof ApiError ? error.detail : "Please try again.",
          });
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[24px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-black text-ink">
            {rejecting
              ? `Reject ${target.reference}?`
              : `Approve ${target.reference}?`}
          </DialogTitle>
          <DialogDescription>
            {rejecting
              ? "The requester will be told the money is not available."
              : `${formatKHR(target.amount)} will be marked as approved for disbursement.`}
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
          <div className="space-y-1.5 text-left">
            <Label htmlFor="review-note" className="text-xs font-bold text-ink">
              Decision note (optional)
            </Label>
            <Textarea
              id="review-note"
              rows={2}
              maxLength={2000}
              placeholder={rejecting ? "Why is it rejected?" : "e.g. covers PO-…"}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full text-xs font-bold"
              onClick={() => onOpenChange(false)}
              disabled={review.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn(
                "rounded-full text-xs font-bold",
                rejecting &&
                  "bg-destructive text-white hover:bg-destructive/90",
              )}
              disabled={review.isPending}
            >
              {review.isPending
                ? "Saving…"
                : rejecting
                  ? "Reject request"
                  : "Approve request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FundsPage() {
  const me = useMe();
  const isAdmin = me.data?.user.role === "admin";
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [page, setPage] = useState(1);
  const [requestOpen, setRequestOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    request: FundRequest;
    decision: FundDecision;
  } | null>(null);
  const [disburseTarget, setDisburseTarget] = useState<FundRequest | null>(null);

  const listParams = useMemo(
    () => ({
      status:
        statusFilter === "all" ? undefined : (statusFilter as FundRequestStatus),
      page,
      page_size: PAGE_SIZE,
    }),
    [statusFilter, page],
  );

  const listQuery = useFundRequests(listParams);
  const pendingQuery = usePendingFundCount();
  const disburse = useDisburseFundRequest();

  const rows = listQuery.data?.items ?? [];
  const totals = useMemo(() => {
    const items = rows;
    const approved = items
      .filter((item) => item.status === "approved")
      .reduce((sum, item) => sum + item.amount, 0);
    return { approved };
  }, [rows]);

  const confirmDisburse = () => {
    if (!disburseTarget) return;
    disburse.mutate(disburseTarget.id, {
      onSuccess: (request) => {
        toast.success(`Request ${request.reference} disbursed`, {
          description: "Mark the transfer on the ABA app as done.",
        });
        setDisburseTarget(null);
      },
      onError: (error) => {
        toast.error("Could not disburse", {
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
        title="Fund requests"
        description="Ask the main ABA account for money to buy products and supplies, and track approvals."
        actions={
          <Button
            className="rounded-full text-xs font-bold"
            onClick={() => setRequestOpen(true)}
          >
            <Plus className="size-4" />
            Request money
          </Button>
        }      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending review"
          value={String(pendingQuery.data?.pending ?? 0)}
          icon={<CircleDollarSign />}
          tone="warning"
          hint="Waiting for an admin decision"
        />
        <StatCard
          label="Approved on page"
          value={formatKHR(totals.approved, { compact: true })}
          icon={<CheckCircle2 />}
          tone="blue"
          hint="Ready to disburse"
        />
      </div>

      <SectionCard
        title="Requests"
        description="Newest first. Staff see their own requests; admins see everything."
        bodyClassName="p-4 sm:p-5"
        action={
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="h-9 w-[150px] rounded-xl text-xs"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="disbursed">Disbursed</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        {listQuery.isPending ? (
          <TableSkeleton rows={5} columns={6} />
        ) : listQuery.isError ? (
          <ErrorState
            title="Fund requests could not be loaded"
            message={
              listQuery.error instanceof ApiError
                ? listQuery.error.detail
                : "Try again in a moment."
            }
            onRetry={() => void listQuery.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<CircleDollarSign />}
            title="No fund requests here"
            description="Submit a request when the main account needs to send money for buying products."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Reference</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => {
                  const meta = fundStatusMeta(item.status);
                  const canReview = isAdmin && item.status === "pending";
                  const canDisburse = isAdmin && item.status === "approved";
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="pl-5">
                        <p className="font-semibold text-ink">{item.reference}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDateTime(item.created_at)}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="line-clamp-1 text-sm text-ink">
                          {item.purpose}
                        </p>
                        {item.decision_note ? (
                          <p className="line-clamp-1 text-[10px] text-muted-foreground">
                            Note: {item.decision_note}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-ink">
                        {formatKHR(item.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={meta.label} tone={meta.tone} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.requested_by_name}
                        {item.reviewed_by_name ? (
                          <p className="text-[10px]">
                            reviewed by {item.reviewed_by_name}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="flex items-center justify-end gap-1">
                          {canReview ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Approve ${item.reference}`}
                                className="text-[#0d7a5b] hover:bg-mint hover:text-brand-strong"
                                onClick={() =>
                                  setReviewTarget({
                                    request: item,
                                    decision: "approved",
                                  })
                                }
                              >
                                <ArrowUpRight className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Reject ${item.reference}`}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() =>
                                  setReviewTarget({
                                    request: item,
                                    decision: "rejected",
                                  })
                                }
                              >
                                <X className="size-4" />
                              </Button>
                            </>
                          ) : null}
                          {canDisburse ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Disburse ${item.reference}`}
                              className="text-brand-strong hover:bg-mint"
                              onClick={() => setDisburseTarget(item)}
                            >
                              <Send className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
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

      <RequestMoneyDialog open={requestOpen} onOpenChange={setRequestOpen} />
      {reviewTarget ? (
        <ReviewDialog
          target={reviewTarget.request}
          decision={reviewTarget.decision}
          onOpenChange={() => setReviewTarget(null)}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(disburseTarget)}
        onOpenChange={(open) => {
          if (!open) setDisburseTarget(null);
        }}
        title="Mark as disbursed?"
        description={
          disburseTarget
            ? `${disburseTarget.reference} — ${formatKHR(disburseTarget.amount)} will be marked as sent from the main ABA account.`
            : ""
        }
        confirmLabel="Money sent"
        onConfirm={confirmDisburse}
        loading={disburse.isPending}
      />
    </div>
  );
}
