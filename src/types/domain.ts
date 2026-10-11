// Row shapes returned by Supabase queries. Keep in sync with supabase/migrations.
// Once a project exists, `npx supabase gen types typescript` can replace these.

export type OrderStatus = "pending" | "at_lab" | "ready" | "delivered" | "cancelled";
export type RxSource = "own" | "tested" | "none";
export type LensSource = "stock" | "lab";
export type PaymentMethod = "cash" | "card" | "bank" | "wallet";
export type ItemCategory = "frame" | "sunglasses" | "lens" | "contact_lens" | "accessory";

export interface RxEye {
  sph: number | null;
  cyl: number | null;
  axis: number | null;
  add: number | null;
  prism: string | null;
  pd: number | null;
  hd: number | null;
}

export interface Rx {
  r: RxEye;
  l: RxEye;
}

export interface ShopSettings {
  shop_name: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  brand_color: string;
  currency: string;
  country_code: string;
  timezone: string;
  delivery_days: number;
  invoice_note: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  created_at: string;
}

export interface OrderListRow {
  id: string;
  order_no: number;
  order_date: string;
  delivery_date: string | null;
  status: OrderStatus;
  total: number;
  lens_source: LensSource;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  paid: number;
  balance: number;
}

export interface OrderItemRow {
  id: string;
  item_id: string | null;
  description: string;
  qty: number;
  price: number;
}

export interface PaymentRow {
  id: string;
  amount: number;
  method: PaymentMethod;
  paid_on: string;
  created_at: string;
}

export interface OrderDetail {
  id: string;
  order_no: number;
  order_date: string;
  delivery_date: string | null;
  status: OrderStatus;
  rx_source: RxSource;
  rx: Rx | null;
  prescribed_by: string | null;
  checked_by: string | null;
  lens_source: LensSource;
  lab_name: string | null;
  subtotal: number;
  discount: number;
  total: number;
  remarks: string | null;
  share_token: string;
  delivered_at: string | null;
  created_at: string;
  customer: Customer;
  items: OrderItemRow[];
  payments: PaymentRow[];
}

export interface InventoryItem {
  id: string;
  category: ItemCategory;
  brand: string | null;
  name: string;
  details: string | null;
  cost: number;
  price: number;
  qty: number;
  low_stock: number;
}

export interface Expense {
  id: string;
  spent_on: string;
  category: string;
  note: string | null;
  amount: number;
  method: PaymentMethod;
}

export interface DailyTotal {
  day: string;
  sales: number;
  orders: number;
  collected: number;
  expenses: number;
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}
