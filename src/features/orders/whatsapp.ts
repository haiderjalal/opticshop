import { formatDate, formatMoney } from "@/lib/format";

interface MessageContext {
  shopName: string;
  shopPhone: string | null;
  currency: string;
  customerName: string;
  orderNo: number;
}

export function invoiceMessage(
  ctx: MessageContext & { total: number; paid: number; deliveryDate: string | null; invoiceUrl: string },
): string {
  const money = (n: number) => formatMoney(n, ctx.currency);
  const balance = Math.max(0, ctx.total - ctx.paid);
  return [
    `Dear ${ctx.customerName},`,
    `Thank you for your order at ${ctx.shopName}.`,
    "",
    `Order #${ctx.orderNo}`,
    `Total: ${money(ctx.total)}`,
    `Paid: ${money(ctx.paid)}`,
    balance > 0 ? `Balance: ${money(balance)}` : "Fully paid",
    ctx.deliveryDate ? `Expected delivery: ${formatDate(ctx.deliveryDate)}` : null,
    "",
    `Invoice: ${ctx.invoiceUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function readyMessage(ctx: MessageContext & { balance: number }): string {
  return [
    `Dear ${ctx.customerName},`,
    `Your order #${ctx.orderNo} is ready for pickup at ${ctx.shopName}.`,
    ctx.balance > 0 ? `Balance due: ${formatMoney(ctx.balance, ctx.currency)}` : null,
    ctx.shopPhone ? `Call us: ${ctx.shopPhone}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
