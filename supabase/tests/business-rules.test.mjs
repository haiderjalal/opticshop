// Runs the real migration on real Postgres (PGlite, in-process) with Supabase-like stubs,
// then exercises the money and stock rules. Part of `npm test`.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const migration = readFileSync(new URL("../migrations/20260927000000_init.sql", import.meta.url), "utf8");

const db = new PGlite({ extensions: { pg_trgm } });

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage; create schema extensions;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage, extensions to anon, authenticated;
`);
await db.exec(migration);
console.log("✔ migration applied");

const OWNER = "11111111-1111-4111-8111-111111111111";
const STRANGER = "22222222-2222-4222-8222-222222222222";
await db.exec(`insert into auth.users values ('${OWNER}', 'owner@shop.test'), ('${STRANGER}', 'x@y.test')`);

async function as(uid, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${uid ? "authenticated" : "anon"};`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}
async function rejects(promise, pattern) {
  try {
    await promise;
  } catch (e) {
    assert.match(e.message, pattern);
    return;
  }
  assert.fail(`expected rejection matching ${pattern}`);
}

// ── Access gate ──
assert.equal((await as(OWNER, "select public.claim_owner() as ok"))[0].ok, true);
assert.equal((await as(STRANGER, "select public.claim_owner() as ok"))[0].ok, false, "second account must not become owner");
assert.equal((await as(STRANGER, "select count(*)::int as n from public.settings"))[0].n, 0, "non-staff sees no settings");
await rejects(as(STRANGER, "insert into public.customers (name, phone) values ('x', '03001234567')"), /row-level security/);
await rejects(as(null, "select * from public.orders"), /permission denied/);
console.log("✔ first account is owner, strangers and anon are locked out");

// ── Stock + order ──
const [frame] = await as(OWNER, "insert into public.items (category, brand, name, price, qty) values ('frame','Ray-Ban','RB2140', 8000, 5) returning id");
const [lens] = await as(OWNER, "insert into public.items (category, name, price, qty) values ('lens','Blue cut 1.56', 3500, 1) returning id");

const payload = (over = {}) => ({
  name: "Ayesha Khan", phone: "03001234567", address: "Main Blvd",
  rx_source: "own", rx: { r: { sph: -1.25, cyl: -0.5, axis: 90, add: null, prism: null, pd: 32, hd: null }, l: { sph: -1, cyl: null, axis: null, add: null, prism: null, pd: 31, hd: null } },
  prescribed_by: "Dr. Ali", checked_by: "", lens_source: "stock", lab_name: "",
  items: [
    { item_id: frame.id, description: "Ray-Ban RB2140", qty: 1, price: 8000 },
    { item_id: lens.id, description: "Blue cut 1.56", qty: 1, price: 3500 },
  ],
  order_date: "2026-09-27", delivery_date: "2026-09-30", discount: 500, advance: 5000, method: "cash", remarks: "",
  ...over,
});

const [{ o: first }] = await as(OWNER, "select public.create_order($1) as o", [payload()]);
assert.equal(first.order_no, 1001);
const [order1] = await as(OWNER, "select * from public.order_list where id = $1", [first.id]);
assert.equal(Number(order1.total), 11000);
assert.equal(Number(order1.paid), 5000);
assert.equal(Number(order1.balance), 6000);
const stock = async () => Object.fromEntries((await as(OWNER, "select name, qty, is_low from public.items")).map((r) => [r.name, r]));
assert.equal((await stock())["RB2140"].qty, 4);
assert.equal((await stock())["Blue cut 1.56"].qty, 0);
assert.equal((await stock())["Blue cut 1.56"].is_low, true);
console.log("✔ order #1001: totals, advance and stock decrement correct");

// Same phone, different capitalisation → same customer; same phone, different name → family member.
const [{ o: second }] = await as(OWNER, "select public.create_order($1) as o", [payload({ name: "ayesha khan", items: [{ item_id: "", description: "Case", qty: 1, price: 300 }], discount: 0, advance: 0 })]);
const [{ o: third }] = await as(OWNER, "select public.create_order($1) as o", [payload({ name: "Bilal Khan", items: [{ item_id: "", description: "Case", qty: 1, price: 300 }], discount: 0, advance: 0 })]);
const customers = await as(OWNER, "select name, phone from public.customers order by name");
assert.equal(customers.length, 2, "case-insensitive name + phone reuses the customer");
assert.equal(second.order_no, 1002);
assert.equal(third.order_no, 1003);
console.log("✔ returning customer reused, family member on same phone kept separate");

// ── Payment guard ──
await rejects(as(OWNER, "insert into public.payments (order_id, amount) values ($1, 6000.01)", [first.id]), /more than the balance/);
await rejects(as(OWNER, "select public.create_order($1)", [payload({ advance: 20000 })]), /advance is more/);
await rejects(as(OWNER, "select public.create_order($1)", [payload({ items: [] })]), /at least one item/);
console.log("✔ overpayment, oversized advance and empty orders rejected");

// ── Deliver: collects the balance in one step ──
const [{ c }] = await as(OWNER, "select public.deliver_order($1, 'card') as c", [first.id]);
assert.equal(Number(c), 6000);
const [delivered] = await as(OWNER, "select status, balance from public.order_list where id = $1", [first.id]);
assert.equal(delivered.status, "delivered");
assert.equal(Number(delivered.balance), 0);
console.log("✔ deliver_order collected 6000 and closed the order");

// ── Cancel restores stock and blocks further payments ──
const [{ o: fourth }] = await as(OWNER, "select public.create_order($1) as o", [payload({ items: [{ item_id: frame.id, description: "Ray-Ban RB2140", qty: 2, price: 8000 }], discount: 0, advance: 1000 })]);
assert.equal((await stock())["RB2140"].qty, 2);
await as(OWNER, "select public.set_order_status($1, 'cancelled')", [fourth.id]);
assert.equal((await stock())["RB2140"].qty, 4);
await rejects(as(OWNER, "insert into public.payments (order_id, amount) values ($1, 10)", [fourth.id]), /cancelled/);
await rejects(as(OWNER, "select public.set_order_status($1, 'ready')", [fourth.id]), /cancelled/);
console.log("✔ cancel put 2 frames back; cancelled order is final");

// ── Stock adjust + expenses + daily totals ──
assert.equal((await as(OWNER, "select public.adjust_stock($1, -5) as q", [frame.id]))[0].q, -1, "negative stock allowed as a recount signal");
await as(OWNER, "insert into public.expenses (spent_on, category, amount) values ('2026-09-27', 'Rent', 20000)");
const [day] = await as(OWNER, "select * from public.daily_totals where day = '2026-09-27'");
// Sales exclude the cancelled order: 11000 + 300 + 300. Cash: 5000 advance + 6000 balance + 1000 advance on the cancelled order.
assert.equal(Number(day.sales), 11600);
assert.equal(day.orders, 3);
assert.equal(Number(day.collected), 12000);
assert.equal(Number(day.expenses), 20000);
console.log("✔ daily_totals: sales 11600 (3 orders), collected 12000, expenses 20000");

// ── Public surfaces ──
const [{ token }] = await as(OWNER, "select share_token as token from public.orders where id = $1", [first.id]);
const [{ inv }] = await as(null, "select public.invoice_by_token($1) as inv", [token]);
assert.equal(inv.order.order_no, 1001);
assert.equal(inv.customer.name, "Ayesha Khan");
assert.equal(Number(inv.paid), 11000);
assert.equal(inv.items.length, 2);
assert.equal(inv.order.share_token, undefined, "token itself is not echoed");
const [{ inv: none }] = await as(null, "select public.invoice_by_token(gen_random_uuid()) as inv");
assert.equal(none, null);
const [{ b }] = await as(null, "select public.shop_branding() as b");
assert.equal(b.shop_name, "My Optics");
await rejects(as(null, "select public.create_order('{}'::jsonb)"), /permission denied/);
console.log("✔ anon can read one invoice by token and the shop name, nothing else");

console.log("\nAll database checks passed.");
