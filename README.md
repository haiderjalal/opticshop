# OpticShop

Counter software for optical shops: orders with prescriptions, returning-customer lookup, stock, daily sales, expenses, monthly reports, and PDF invoices sent over WhatsApp.

Built to be resold. Each shop gets its own copy (its own Supabase project + Vercel deployment). The shop's name, logo, brand colour, currency and invoice text are set in **Settings** inside the app, so a new shop needs no code changes.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · Supabase (Postgres + Auth + Storage) · React Hook Form + Zod · `@react-pdf/renderer`.

---

## What staff can do

| Area | What it does |
| --- | --- |
| **New order** (`N` from anywhere) | Phone first. Typing 4+ digits suggests existing customers (families sharing a phone are listed separately). Picking one fills name/address and offers **Use last prescription**. |
| **Prescription card** | R/L grid: SPH, CYL, AXIS, ADD, PRISM, PD, HD. Powers auto-format (`-1.5` → `-1.50`). A TABO dial beside AXIS swings to the typed degree so 18 vs 180 is obvious. *Own prescription / Eye test here / No Rx*, plus Prescribed by and Checked by. |
| **Frame & lenses** | Type to search stock (shows price and quantity) or type free text. Stock items are deducted when the order is saved and put back if it is cancelled. *Lenses in stock / Order from lab* (with lab name). |
| **Payment** | Discount, advance (**Full** / **Half** one-tap), Cash/Card/Bank/Wallet. Balance shown live. Delivery date shortcuts: Today, Tomorrow, 3 days, 1 week. `Enter` jumps to the next field, `Ctrl+Enter` saves. |
| **After saving** | Unique order number (from #1001). One button sends the invoice on WhatsApp: the message has totals, balance, delivery date and a link to the PDF. |
| **Order page** | Booked → At lab → Ready → Delivered, one next-step button at a time. **Tell customer it's ready** (WhatsApp). **Deliver · collect Rs X** takes the balance and closes the order in one step. Receive part payments. Cancel restores stock. |
| **Search** (`Ctrl+K` or `/`) | Name, phone or order number → customer history with every order and a prescription history table. |
| **Today** | Sales booked, cash in, spent, and what customers owe; orders waiting to go out (late ones in red); the month so far; low stock. |
| **Stock** | Frames, sunglasses, lenses, contact lenses, accessories. `+`/`−` counters update instantly. Low-stock alerts. Stock value at cost and at sale price. The add dialog stays open for entering a box of frames one after another. |
| **Expenses** | Tap a category, type the amount, press Enter. Grouped by day, totals by category, month by month. |
| **Reports** | Per month: sales, cash collected, expenses, net cash; day-by-day chart and table; 12-month trend; expense breakdown. |
| **Settings** | Shop name, tagline, logo, brand colour, phone/email/address, currency symbol, WhatsApp country code, timezone, usual delivery days, invoice footer note. |

"Sales" means the value of orders booked that day. "Cash collected" means money actually received that day (advances plus balances). Both appear because optical shops take advances.

---

## Setting up a shop (about 15 minutes)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (the free tier is fine to start). Use one project per shop.
2. **Create the database:** in Supabase → SQL Editor, paste all of [`supabase/migrations/20260927000000_init.sql`](supabase/migrations/20260927000000_init.sql) and run it.
   *(Or, with the Supabase CLI: `supabase link` then `supabase db push`.)*
3. **Auth settings:** Supabase → Authentication → URL Configuration → set **Site URL** to the shop's deployed URL. Keep email confirmation on.
4. **Deploy to Vercel:** import the repo, then add these environment variables (from Supabase → Project Settings → API Keys):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
5. **First sign-in:** open the site and choose **First time here? Create the owner account**. The first account becomes the owner. Accounts created after that see *Waiting for access* until the owner lets them in (see below).
6. **Brand it:** open **Settings** and fill in the shop name, logo, colour, currency, country code and invoice note. That's the whole white-label step.

### Giving a staff member access

The staff member creates an account on the sign-in page. Then, in Supabase → SQL Editor:

```sql
insert into public.staff (user_id)
select id from auth.users where email = 'staff@example.com';
```

### Local development

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local`, then:

```bash
npm run dev
```

---

## Security model

- **Row Level Security on every table.** Only rows in `staff` can read or write shop data. Being signed in is not enough.
- The **first account to sign in becomes the owner** (`claim_owner()`), so a fresh deployment is never open to strangers who sign up.
- **Invoice links** (`/i/<token>`) are public on purpose, because customers open them from WhatsApp. Each token is a random UUID and reveals exactly one invoice (`invoice_by_token()`).
- Money rules live in the database, so no client can bypass them: a payment can never exceed the balance, a cancelled order cannot take payments, and order + items + stock + advance are saved in one transaction.
- All input is validated with the same Zod schemas in the browser and on the server. Logos are checked by file signature (PNG/JPG only, 1 MB max).

## Checks

```bash
npm test
```

`npm test` runs the formatting/validation unit tests and applies the real migration to an in-process Postgres (PGlite) to check stock, payments, cancellations, daily totals and access rules.

```bash
npm run typecheck
```

```bash
npm run lint
```

## Project layout

```
src/app/(app)/      staff pages: today, orders, customers, inventory, expenses, reports, settings
src/app/login/      sign in / create owner account
src/app/i/[token]/  public invoice PDF
src/features/       one folder per area: queries.ts (reads), actions.ts (validated writes), components/
src/components/     shell, shared UI (AxisDial, Segmented, SuggestInput…), shadcn/ui primitives
src/lib/            Supabase client, formatting, Zod schemas
supabase/           migration + database tests
docs/roadmap.md     features to sell next
```
