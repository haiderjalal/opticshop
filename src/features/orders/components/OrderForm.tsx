"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createOrder, type CustomerMatch } from "@/features/orders/actions";
import { CustomerFields } from "@/features/orders/components/CustomerFields";
import { EMPTY_LINE, ItemLines } from "@/features/orders/components/ItemLines";
import { OrderSummary } from "@/features/orders/components/OrderSummary";
import { RxCard } from "@/features/orders/components/RxCard";
import { addDays } from "@/lib/format";
import { RX_FIELDS, orderSchema, type OrderFormValues, type OrderInput } from "@/lib/validations/order.schema";

import type { Rx, RxEye } from "@/types/domain";

const EMPTY_EYE = { sph: "", cyl: "", axis: "", add: "", prism: "", pd: "", hd: "" };

function eyeToForm(eye: RxEye | undefined): typeof EMPTY_EYE {
  if (!eye) return { ...EMPTY_EYE };
  const power = (n: number | null) => (n === null ? "" : `${n > 0 ? "+" : ""}${n.toFixed(2)}`);
  const plain = (n: number | string | null) => (n === null ? "" : String(n));
  return {
    sph: power(eye.sph),
    cyl: power(eye.cyl),
    axis: plain(eye.axis),
    add: power(eye.add),
    prism: plain(eye.prism),
    pd: plain(eye.pd),
    hd: plain(eye.hd),
  };
}

interface OrderFormProps {
  currency: string;
  today: string;
  deliveryDays: number;
  initialCustomer: CustomerMatch | null;
}

export function OrderForm({ currency, today, deliveryDays, initialCustomer }: OrderFormProps) {
  const [returning, setReturning] = useState<CustomerMatch | null>(initialCustomer);
  const [submitting, startSubmit] = useTransition();

  const form = useForm<OrderFormValues, unknown, OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      phone: initialCustomer?.phone ?? "",
      name: initialCustomer?.name ?? "",
      address: initialCustomer?.address ?? "",
      rx_source: "own",
      rx: { r: { ...EMPTY_EYE }, l: { ...EMPTY_EYE } },
      prescribed_by: "",
      checked_by: "",
      items: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
      lens_source: "stock",
      lab_name: "",
      order_date: today,
      delivery_date: addDays(today, deliveryDays),
      discount: "",
      advance: "",
      method: "cash",
      remarks: "",
    },
  });

  const pickCustomer = (customer: CustomerMatch) => {
    setReturning(customer);
    form.setValue("phone", customer.phone);
    form.setValue("name", customer.name, { shouldValidate: form.formState.isSubmitted });
    form.setValue("address", customer.address ?? "");
    form.setFocus("name");
  };

  const applyLastRx = () => {
    const rx: Rx | null = returning?.lastRx ?? null;
    if (!rx) return;
    (["r", "l"] as const).forEach((eye) => {
      const values = eyeToForm(rx[eye]);
      RX_FIELDS.forEach((field) => form.setValue(`rx.${eye}.${field}`, values[field]));
    });
    if (returning?.lastRxSource) form.setValue("rx_source", returning.lastRxSource);
    toast.success("Last prescription filled in. Check it before saving.");
  };

  const submit = form.handleSubmit(
    () =>
      startSubmit(async () => {
        // Send the raw strings — the server re-validates with the same schema.
        const result = await createOrder(form.getValues());
        if (result && !result.ok) toast.error(result.message);
      }),
    () => toast.error("Some fields need attention."),
  );

  // Counter speed: Enter moves to the next field instead of submitting; Ctrl+Enter / Ctrl+S saves.
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key.toLowerCase() === "s")) {
      e.preventDefault();
      void submit();
      return;
    }
    const target = e.target as HTMLElement;
    if (e.key !== "Enter" || e.defaultPrevented || target.tagName !== "INPUT") return;
    e.preventDefault();
    const fields = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("input:not([type=hidden]):not(:disabled), textarea"));
    fields[fields.indexOf(target) + 1]?.focus();
  };

  return (
    <form onSubmit={submit} onKeyDown={onKeyDown} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="stagger min-w-0 space-y-5">
        <CustomerFields form={form} returning={returning} onPick={pickCustomer} onUseLastRx={applyLastRx} />
        <RxCard form={form} />
        <ItemLines form={form} currency={currency} />
      </div>
      <OrderSummary form={form} currency={currency} submitting={submitting} />
    </form>
  );
}
