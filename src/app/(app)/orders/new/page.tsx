import type { Metadata } from "next";
import { z } from "zod";

import { PageHeader } from "@/components/shared/PageHeader";
import { OrderForm } from "@/features/orders/components/OrderForm";
import { getCustomerForNewOrder } from "@/features/orders/queries";
import { getSettings } from "@/features/settings/queries";
import { todayIn } from "@/lib/format";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage({ searchParams }: PageProps<"/orders/new">) {
  const { customer } = await searchParams;
  const customerId = z.uuid().safeParse(customer);
  const [settings, initialCustomer] = await Promise.all([
    getSettings(),
    customerId.success ? getCustomerForNewOrder(customerId.data) : null,
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Counter"
        title="New order"
        description="Phone first — returning customers fill themselves in."
      />
      <OrderForm
        currency={settings.currency}
        today={todayIn(settings.timezone)}
        deliveryDays={settings.delivery_days}
        initialCustomer={initialCustomer}
      />
    </>
  );
}
