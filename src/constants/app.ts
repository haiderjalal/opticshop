import type { ItemCategory, OrderStatus, PaymentMethod } from "@/types/domain";

export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Booked", className: "bg-status-pending/12 text-status-pending" },
  at_lab: { label: "At lab", className: "bg-status-lab/12 text-status-lab" },
  ready: { label: "Ready", className: "bg-status-ready/14 text-status-ready" },
  delivered: { label: "Delivered", className: "bg-status-done/12 text-status-done" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground line-through" },
};

export const OPEN_STATUSES: OrderStatus[] = ["pending", "at_lab", "ready"];

export const ITEM_CATEGORIES: Record<ItemCategory, string> = {
  frame: "Frames",
  sunglasses: "Sunglasses",
  lens: "Lenses",
  contact_lens: "Contact lenses",
  accessory: "Accessories",
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  bank: "Bank",
  wallet: "Wallet",
};

// Suggestions only — staff can type any category.
export const EXPENSE_CATEGORIES = [
  "Lab bill",
  "Stock purchase",
  "Rent",
  "Salaries",
  "Electricity",
  "Tea & food",
  "Transport",
  "Repairs",
  "Other",
];

export const PAGE_SIZE = 30;
