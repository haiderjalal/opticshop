# Roadmap — what to build next

These are ordered by how much each one helps a shop owner decide to buy. The first group is what optical shops ask for most often.

## Tier 1 — sells the product

| Feature | Why shops pay for it | Notes |
| --- | --- | --- |
| **Eye-test recall reminders** | Brings customers back every 12–18 months. This is the single biggest revenue lever for an optician. | A "Due for check-up" list from the last order date, with a one-tap WhatsApp message. The data already exists. |
| **Lab job sheet + lab ledger** | Every lab order today is a handwritten slip. Owners also lose track of what they owe each lab. | Printable job sheet (Rx, frame, lens, PD/HD) per order; a `labs` table; lab bills posted as expenses per lab; "owed to labs" on Today. |
| **Staff roles** | Owners don't want counter staff seeing cost prices, reports or settings. | `staff.role` already exists (owner/staff). Hide cost/reports/settings for `staff`, and add a Staff page in Settings to approve sign-ups (replaces the SQL step). |
| **Edit order** | Typos in the Rx or delivery date happen daily. | Allow editing Rx, dates, remarks and lab. Item and price changes should go through cancel + re-book to keep stock honest. |
| **Thermal receipt (80 mm) + job envelope print** | Many shops print on thermal printers and tape a ticket to the frame envelope. | A second PDF layout at 80 mm width, and an envelope ticket with order #, name and due date. |
| **Daily cash closing** | "Does the drawer match?" is the owner's end-of-day question. | Opening cash + cash payments − cash expenses = expected cash; staff enter the counted amount, and the difference is logged. |

## Tier 2 — makes it stickier

- **Lens stock by power** — lenses kept as an SPH × CYL grid (e.g. −2.00 / −0.50). Picking a lens in an order checks the exact power.
- **Barcode / QR labels for frames** — print labels, then scan them into an order or a stock count.
- **Supplier purchases** — stock-in from a supplier invoice (updates quantity and cost) and supplier payables.
- **Gross profit report** — cost price is already stored per item, so margin per order, brand and month is a query away.
- **Customer credit (udhaar) ledger** — customers who pay later across several orders; a statement to send on WhatsApp.
- **Import from Excel** — most shops arrive with a customer register; import it on day one.
- **Export / backup** — monthly Excel export of orders, expenses and stock for the accountant.

## Tier 3 — bigger bets

- **WhatsApp Cloud API** — send the PDF itself and automatic "ready for pickup" messages without leaving the app. Needs Meta business verification per shop and costs per message.
- **Offline mode (PWA)** — keep taking orders during internet or power cuts, then sync. Installable on a counter tablet.
- **Urdu interface and Urdu invoices** — needs an Urdu font embedded in the PDF (the current PDF uses Helvetica, which is Latin-only).
- **Multi-branch** — one owner, several shops, stock transfers between them, combined reports.
- **Doctor referrals and commissions** — track which doctor sent which customer.
- **Repairs and warranty jobs** — frame repairs as a lightweight order type.
- **Single SaaS deployment** — instead of one deployment per shop, add `shop_id` to every table and charge a monthly subscription. Updates then reach every shop at once. This is the natural step once there are more than about 10 shops.

## Known limits in v1 (deliberate)

- WhatsApp opens a prefilled chat (`wa.me`). The customer receives a link to the PDF, not the file itself (see WhatsApp Cloud API above).
- Stock may go negative instead of blocking a sale. It shows **Recount** in red.
- Phone numbers are assumed to be in the shop's country for WhatsApp links (numbers starting with `00` are respected).
- Stock lists show 300 items per filter; search narrows the list.
- Refunds on cancelled orders are not tracked separately. Payments already taken stay in "cash collected".
