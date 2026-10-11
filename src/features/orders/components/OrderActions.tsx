"use client";

import { useState, useTransition } from "react";
import { BanIcon, CheckCheckIcon, FlaskConicalIcon, Loader2Icon, PackageCheckIcon, WalletIcon } from "lucide-react";
import { toast } from "sonner";

import { Segmented } from "@/components/shared/Segmented";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHODS } from "@/constants/app";
import { addPayment, deliverOrder, setOrderStatus } from "@/features/orders/actions";
import { formatMoney } from "@/lib/format";

import type { ActionResult, LensSource, OrderStatus, PaymentMethod } from "@/types/domain";

const METHOD_OPTIONS = Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value: value as PaymentMethod, label }));

interface OrderActionsProps {
  orderId: string;
  status: OrderStatus;
  lensSource: LensSource;
  balance: number;
  currency: string;
}

type Dialogs = "deliver" | "payment" | "cancel" | null;

export function OrderActions({ orderId, status, lensSource, balance, currency }: OrderActionsProps) {
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(String(balance));
  const [pending, start] = useTransition();
  const money = (n: number) => formatMoney(n, currency);

  const run = (action: () => Promise<ActionResult<unknown>>, success?: string) =>
    start(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success ?? result.message);
        setDialog(null);
      } else {
        toast.error(result.message);
      }
    });

  const open = status !== "delivered" && status !== "cancelled";
  const next =
    status === "pending" && lensSource === "lab"
      ? { label: "Sent to lab", icon: FlaskConicalIcon, onClick: () => run(() => setOrderStatus(orderId, "at_lab"), "Marked as at the lab.") }
      : status === "pending" || status === "at_lab"
        ? { label: status === "at_lab" ? "Back from lab — mark ready" : "Mark ready", icon: PackageCheckIcon, onClick: () => run(() => setOrderStatus(orderId, "ready"), "Marked ready for pickup.") }
        : status === "ready"
          ? { label: balance > 0 ? `Deliver · collect ${money(balance)}` : "Mark delivered", icon: CheckCheckIcon, onClick: () => setDialog("deliver") }
          : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next && (
        <Button size="lg" onClick={next.onClick} disabled={pending} className="glint rounded-xl">
          {pending && dialog === null ? <Loader2Icon className="animate-spin" /> : <next.icon />}
          {next.label}
        </Button>
      )}
      {status !== "ready" && open && (
        <Button size="lg" variant="outline" onClick={() => setDialog("deliver")} disabled={pending} className="rounded-xl">
          <CheckCheckIcon /> Deliver now
        </Button>
      )}
      {balance > 0 && status !== "cancelled" && (
        <Button
          size="lg"
          variant="outline"
          disabled={pending}
          className="rounded-xl"
          onClick={() => {
            setAmount(String(balance));
            setDialog("payment");
          }}
        >
          <WalletIcon /> Receive payment
        </Button>
      )}
      {open && (
        <Button variant="ghost" onClick={() => setDialog("cancel")} disabled={pending} className="text-muted-foreground hover:text-destructive">
          <BanIcon /> Cancel order
        </Button>
      )}

      <Dialog open={dialog === "deliver"} onOpenChange={(o) => setDialog(o ? "deliver" : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hand over the order</DialogTitle>
            <DialogDescription>
              {balance > 0 ? `${money(balance)} is still due. It will be recorded as paid now.` : "Everything is paid."}
            </DialogDescription>
          </DialogHeader>
          {balance > 0 && <Segmented label="Payment method" value={method} onChange={setMethod} options={METHOD_OPTIONS} />}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Not yet</DialogClose>
            <Button disabled={pending} onClick={() => run(() => deliverOrder(orderId, method), "Delivered. Order complete.")}>
              {pending && <Loader2Icon className="animate-spin" />}
              {balance > 0 ? `Collect ${money(balance)} & deliver` : "Mark delivered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "payment"} onOpenChange={(o) => setDialog(o ? "payment" : null)}>
        <DialogContent className="sm:max-w-md">
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addPayment({ order_id: orderId, amount, method }), "Payment recorded.");
            }}
          >
            <DialogHeader>
              <DialogTitle>Receive payment</DialogTitle>
              <DialogDescription>Balance due: {money(balance)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-right font-heading text-xl font-bold"
              />
            </div>
            <Segmented label="Payment method" value={method} onChange={setMethod} options={METHOD_OPTIONS} />
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Close</DialogClose>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2Icon className="animate-spin" />}
                Save payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "cancel"} onOpenChange={(o) => setDialog(o ? "cancel" : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              Items taken from stock go back into stock. Payments already received stay on record. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Keep order</DialogClose>
            <Button variant="destructive" disabled={pending} onClick={() => run(() => setOrderStatus(orderId, "cancelled"), "Order cancelled.")}>
              {pending && <Loader2Icon className="animate-spin" />}
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
