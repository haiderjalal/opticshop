-- OpticShop — initial schema.
-- One Supabase project per shop (single tenant). Every table is staff-only via RLS;
-- the only anonymous entry point is invoice_by_token() for WhatsApp invoice links.

create extension if not exists pg_trgm with schema extensions;

-- ─── Helpers ────────────────────────────────────────────────────────────────

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Settings (single row — this is what makes the app white-label) ─────────

create table public.settings (
  id boolean primary key default true check (id),
  shop_name text not null default 'My Optics' check (length(shop_name) between 1 and 80),
  tagline text check (length(tagline) <= 120),
  phone text check (length(phone) <= 40),
  email text check (length(email) <= 120),
  address text check (length(address) <= 300),
  logo_url text check (length(logo_url) <= 500),
  brand_color text not null default '#0f1b2d' check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  currency text not null default 'Rs' check (length(currency) between 1 and 6),
  country_code text not null default '92' check (country_code ~ '^[0-9]{1,4}$'),
  timezone text not null default 'Asia/Karachi' check (length(timezone) <= 60),
  delivery_days integer not null default 3 check (delivery_days between 0 and 60),
  invoice_note text check (length(invoice_note) <= 500),
  updated_at timestamptz not null default now()
);
insert into public.settings default values;
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- "Today" in the shop's timezone, so a 1 a.m. sale is not booked on yesterday (UTC).
create function public.shop_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone coalesce((select timezone from public.settings), 'UTC'))::date
$$;

-- ─── Staff (access gate) ────────────────────────────────────────────────────

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);
create unique index staff_single_owner on public.staff (role) where role = 'owner';

create function public.is_staff() returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()))
$$;

-- The first account to sign in becomes the owner; later sign-ups get no access
-- until the owner adds them. Returns whether the caller is staff.
create function public.claim_owner() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return false;
  end if;
  if not exists (select 1 from public.staff) then
    insert into public.staff (user_id, role) values (v_uid, 'owner') on conflict do nothing;
  end if;
  return exists (select 1 from public.staff where user_id = v_uid);
end $$;
revoke execute on function public.claim_owner() from public, anon;
grant execute on function public.claim_owner() to authenticated;

-- ─── Customers ──────────────────────────────────────────────────────────────

-- Families often share one phone, so identity is phone + name, not phone alone.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  phone text not null check (phone ~ '^[0-9]{7,15}$'),
  address text check (length(address) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_phone_name_key on public.customers (phone, (lower(name)));
create index customers_name_trgm on public.customers using gin (name extensions.gin_trgm_ops);
create index customers_phone_trgm on public.customers using gin (phone extensions.gin_trgm_ops);
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- ─── Inventory ──────────────────────────────────────────────────────────────

create table public.items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('frame', 'sunglasses', 'lens', 'contact_lens', 'accessory')),
  brand text check (length(brand) <= 60),
  name text not null check (length(name) between 1 and 120),
  details text check (length(details) <= 200),
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  price numeric(12, 2) not null default 0 check (price >= 0),
  -- No qty >= 0 check on purpose: a miscounted shelf must not block a sale at the counter.
  -- Negative stock shows up red in Inventory as a "recount" signal.
  qty integer not null default 0,
  low_stock integer not null default 2 check (low_stock >= 0),
  is_low boolean generated always as (qty <= low_stock) stored,
  search text generated always as (lower(coalesce(brand, '') || ' ' || name || ' ' || coalesce(details, ''))) stored,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_category_idx on public.items (category) where archived_at is null;
create index items_search_trgm on public.items using gin (search extensions.gin_trgm_ops);
create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

-- ─── Orders ─────────────────────────────────────────────────────────────────

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity (start with 1001) unique,
  customer_id uuid not null references public.customers (id),
  order_date date not null default public.shop_today(),
  delivery_date date,
  status text not null default 'pending'
    check (status in ('pending', 'at_lab', 'ready', 'delivered', 'cancelled')),
  -- own = customer brought a prescription, tested = eye test done in the shop, none = no Rx (e.g. sunglasses)
  rx_source text not null default 'own' check (rx_source in ('own', 'tested', 'none')),
  -- Snapshot of the prescription used for this order: {"r": {sph,cyl,axis,add,prism,pd,hd}, "l": {...}}
  rx jsonb check (rx is null or jsonb_typeof(rx) = 'object'),
  prescribed_by text check (length(prescribed_by) <= 80),
  checked_by text check (length(checked_by) <= 80),
  lens_source text not null default 'stock' check (lens_source in ('stock', 'lab')),
  lab_name text check (length(lab_name) <= 80),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0 and discount <= subtotal),
  total numeric(12, 2) generated always as (subtotal - discount) stored,
  remarks text check (length(remarks) <= 500),
  -- Unguessable id for the public invoice link sent over WhatsApp.
  share_token uuid not null default gen_random_uuid() unique,
  delivered_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders (customer_id, order_date desc);
create index orders_status_idx on public.orders (status, delivery_date);
create index orders_date_idx on public.orders (order_date);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  description text not null check (length(description) between 1 and 200),
  qty integer not null default 1 check (qty between 1 and 100),
  price numeric(12, 2) not null check (price >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_item_idx on public.order_items (item_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'card', 'bank', 'wallet')),
  paid_on date not null default public.shop_today(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create index payments_date_idx on public.payments (paid_on);

-- Every payment path (advance, collect, deliver) goes through this guard.
create function public.guard_payment() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_total numeric;
  v_status text;
  v_paid numeric;
begin
  select total, status into v_total, v_status from public.orders where id = new.order_id for update;
  if v_status = 'cancelled' then
    raise exception 'This order is cancelled, so it cannot take a payment.';
  end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = new.order_id;
  if v_paid + new.amount > v_total then
    raise exception 'That is more than the balance due.';
  end if;
  return new;
end $$;
create trigger payments_guard before insert on public.payments
  for each row execute function public.guard_payment();

-- ─── Expenses ───────────────────────────────────────────────────────────────

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default public.shop_today(),
  category text not null check (length(category) between 1 and 40),
  note text check (length(note) <= 200),
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'card', 'bank', 'wallet')),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (spent_on);
create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- ─── Views ──────────────────────────────────────────────────────────────────

create view public.order_list with (security_invoker = true) as
select
  o.id, o.order_no, o.order_date, o.delivery_date, o.status, o.total, o.lens_source, o.created_at,
  c.id as customer_id, c.name as customer_name, c.phone as customer_phone,
  coalesce(p.paid, 0)::numeric(12, 2) as paid,
  (o.total - coalesce(p.paid, 0))::numeric(12, 2) as balance
from public.orders o
join public.customers c on c.id = o.customer_id
left join lateral (
  select sum(amount) as paid from public.payments where order_id = o.id
) p on true;

-- sales = value of orders booked that day; collected = cash actually received that day.
create view public.daily_totals with (security_invoker = true) as
select
  day,
  sum(sales)::numeric(12, 2) as sales,
  sum(orders)::integer as orders,
  sum(collected)::numeric(12, 2) as collected,
  sum(expenses)::numeric(12, 2) as expenses
from (
  select order_date as day, total as sales, 1 as orders, 0 as collected, 0 as expenses
    from public.orders where status <> 'cancelled'
  union all
  select paid_on, 0, 0, amount, 0 from public.payments
  union all
  select spent_on, 0, 0, 0, amount from public.expenses
) t
group by day;

-- ─── Order workflows (atomic) ───────────────────────────────────────────────

-- Customer upsert + order + lines + stock + advance, all-or-nothing.
create function public.create_order(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_customer uuid;
  v_order uuid;
  v_no bigint;
  v_subtotal numeric(12, 2);
  v_discount numeric(12, 2) := coalesce((p ->> 'discount')::numeric, 0);
  v_advance numeric(12, 2) := coalesce((p ->> 'advance')::numeric, 0);
begin
  if jsonb_array_length(coalesce(p -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Add at least one item.';
  end if;

  insert into public.customers (name, phone, address)
  values (trim(p ->> 'name'), p ->> 'phone', nullif(trim(p ->> 'address'), ''))
  on conflict (phone, (lower(name))) do update
    set name = excluded.name,
        address = coalesce(excluded.address, public.customers.address)
  returning id into v_customer;

  select coalesce(sum((l ->> 'qty')::integer * (l ->> 'price')::numeric), 0)
    into v_subtotal
    from jsonb_array_elements(p -> 'items') l;

  if v_discount > v_subtotal then
    raise exception 'The discount is more than the order total.';
  end if;
  if v_advance > v_subtotal - v_discount then
    raise exception 'The advance is more than the order total.';
  end if;

  insert into public.orders (
    customer_id, order_date, delivery_date, rx_source, rx, prescribed_by, checked_by,
    lens_source, lab_name, subtotal, discount, remarks
  ) values (
    v_customer,
    coalesce((p ->> 'order_date')::date, public.shop_today()),
    (p ->> 'delivery_date')::date,
    coalesce(p ->> 'rx_source', 'own'),
    nullif(p -> 'rx', 'null'::jsonb),
    nullif(trim(p ->> 'prescribed_by'), ''),
    nullif(trim(p ->> 'checked_by'), ''),
    coalesce(p ->> 'lens_source', 'stock'),
    nullif(trim(p ->> 'lab_name'), ''),
    v_subtotal,
    v_discount,
    nullif(trim(p ->> 'remarks'), '')
  )
  returning id, order_no into v_order, v_no;

  insert into public.order_items (order_id, item_id, description, qty, price)
  select v_order, nullif(l ->> 'item_id', '')::uuid, trim(l ->> 'description'),
         (l ->> 'qty')::integer, (l ->> 'price')::numeric
    from jsonb_array_elements(p -> 'items') l;

  update public.items i
     set qty = i.qty - x.qty
    from (
      select (l ->> 'item_id')::uuid as item_id, sum((l ->> 'qty')::integer) as qty
        from jsonb_array_elements(p -> 'items') l
       where nullif(l ->> 'item_id', '') is not null
       group by 1
    ) x
   where i.id = x.item_id;

  if v_advance > 0 then
    insert into public.payments (order_id, amount, method)
    values (v_order, v_advance, coalesce(p ->> 'method', 'cash'));
  end if;

  return jsonb_build_object('id', v_order, 'order_no', v_no);
end $$;

-- Cancelling puts inventory items back on the shelf. Cancelled is final.
create function public.set_order_status(p_order uuid, p_status text) returns void
language plpgsql set search_path = '' as $$
declare
  v_old text;
begin
  select status into v_old from public.orders where id = p_order for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  if v_old = 'cancelled' then
    raise exception 'This order is cancelled.';
  end if;
  if v_old = p_status then
    return;
  end if;

  update public.orders
     set status = p_status,
         delivered_at = case when p_status = 'delivered' then now() end
   where id = p_order;

  if p_status = 'cancelled' then
    update public.items i
       set qty = i.qty + x.qty
      from (
        select item_id, sum(qty) as qty from public.order_items
         where order_id = p_order and item_id is not null
         group by 1
      ) x
     where i.id = x.item_id;
  end if;
end $$;

-- One click at the counter: take whatever is still owed, then mark delivered.
create function public.deliver_order(p_order uuid, p_method text default 'cash') returns numeric
language plpgsql set search_path = '' as $$
declare
  v_balance numeric;
begin
  perform 1 from public.orders where id = p_order and status <> 'cancelled' for update;
  if not found then
    raise exception 'Order not found or cancelled.';
  end if;

  select o.total - coalesce((select sum(amount) from public.payments where order_id = o.id), 0)
    into v_balance
    from public.orders o where o.id = p_order;

  if v_balance > 0 then
    insert into public.payments (order_id, amount, method) values (p_order, v_balance, p_method);
  end if;
  perform public.set_order_status(p_order, 'delivered');
  return greatest(v_balance, 0);
end $$;

-- Atomic +/− from the stock screen (two counters tapping at once must not lose a count).
create function public.adjust_stock(p_item uuid, p_delta integer) returns integer
language sql set search_path = '' as $$
  update public.items set qty = qty + p_delta where id = p_item returning qty
$$;

-- Public invoice for WhatsApp links. SECURITY DEFINER on purpose: anonymous callers
-- can read exactly one order, and only if they hold its random share_token.
create function public.invoice_by_token(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'shop', (
      select jsonb_build_object(
        'shop_name', s.shop_name, 'tagline', s.tagline, 'phone', s.phone, 'email', s.email,
        'address', s.address, 'logo_url', s.logo_url, 'brand_color', s.brand_color,
        'currency', s.currency, 'invoice_note', s.invoice_note
      ) from public.settings s
    ),
    'order', jsonb_build_object(
      'order_no', o.order_no, 'order_date', o.order_date, 'delivery_date', o.delivery_date,
      'status', o.status, 'rx', o.rx, 'rx_source', o.rx_source, 'prescribed_by', o.prescribed_by,
      'checked_by', o.checked_by, 'subtotal', o.subtotal, 'discount', o.discount, 'total', o.total,
      'remarks', o.remarks
    ),
    'customer', jsonb_build_object('name', c.name, 'phone', c.phone, 'address', c.address),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('description', i.description, 'qty', i.qty, 'price', i.price) order by i.created_at)
        from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb),
    'paid', coalesce((select sum(amount) from public.payments p where p.order_id = o.id), 0)
  )
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where o.share_token = p_token
$$;
revoke execute on function public.invoice_by_token(uuid) from public;
grant execute on function public.invoice_by_token(uuid) to anon, authenticated;

-- Name and logo for the sign-in page (already public on every invoice).
create function public.shop_branding() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('shop_name', shop_name, 'tagline', tagline, 'logo_url', logo_url, 'brand_color', brand_color)
    from public.settings
$$;
revoke execute on function public.shop_branding() from public;
grant execute on function public.shop_branding() to anon, authenticated;

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table public.settings enable row level security;
alter table public.staff enable row level security;
alter table public.customers enable row level security;
alter table public.items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

create policy "staff read own row" on public.staff
  for select to authenticated using (user_id = (select auth.uid()));

create policy "staff read settings" on public.settings
  for select to authenticated using ((select public.is_staff()));
create policy "staff update settings" on public.settings
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "staff all" on public.customers
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff all" on public.items
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff all" on public.orders
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff all" on public.order_items
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff all" on public.payments
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff all" on public.expenses
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- New Supabase projects no longer expose tables to the Data API automatically.
grant select, update on public.settings to authenticated;
grant select on public.staff to authenticated;
grant select, insert, update, delete on
  public.customers, public.items, public.orders, public.order_items, public.payments, public.expenses
  to authenticated;
grant select on public.order_list, public.daily_totals to authenticated;
grant execute on function
  public.create_order(jsonb), public.set_order_status(uuid, text),
  public.deliver_order(uuid, text), public.adjust_stock(uuid, integer), public.is_staff(), public.shop_today()
  to authenticated;
revoke execute on function
  public.create_order(jsonb), public.set_order_status(uuid, text), public.deliver_order(uuid, text),
  public.adjust_stock(uuid, integer)
  from public, anon;

-- ─── Storage: shop logo ─────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 1048576, array['image/png', 'image/jpeg']);

create policy "staff upload branding" on storage.objects
  for insert to authenticated with check (bucket_id = 'branding' and (select public.is_staff()));
create policy "staff update branding" on storage.objects
  for update to authenticated using (bucket_id = 'branding' and (select public.is_staff()));
create policy "staff read branding" on storage.objects
  for select to authenticated using (bucket_id = 'branding' and (select public.is_staff()));
