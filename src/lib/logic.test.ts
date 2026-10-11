// Run with `npm test` (Node's built-in runner, no extra dependencies).
import { test } from "node:test";
import assert from "node:assert/strict";

import { addDays, formatMoney, formatRx, monthRange, toSearchTerm, toWhatsAppNumber } from "./format.ts";
import { orderSchema, type OrderFormValues } from "./validations/order.schema.ts";

const emptyEye = { sph: "", cyl: "", axis: "", add: "", prism: "", pd: "", hd: "" };

function order(overrides: Partial<OrderFormValues> = {}): OrderFormValues {
  return {
    phone: "0300-1234567",
    name: " Ayesha Khan ",
    address: "",
    rx_source: "own",
    rx: { r: { ...emptyEye }, l: { ...emptyEye } },
    prescribed_by: "",
    checked_by: "",
    items: [
      { item_id: "", description: "Ray-Ban RB2140", qty: "1", price: "8000" },
      { item_id: "", description: "", qty: "1", price: "" },
    ],
    lens_source: "stock",
    lab_name: "",
    order_date: "2026-09-27",
    delivery_date: "2026-09-30",
    discount: "500",
    advance: "3000",
    method: "cash",
    remarks: "",
    ...overrides,
  };
}

test("formatting helpers", () => {
  assert.equal(formatMoney(-2360, "Rs"), "-Rs 2,360");
  assert.equal(formatMoney(1250.5, "Rs"), "Rs 1,250.5");
  assert.equal(formatRx(1.25), "+1.25");
  assert.equal(formatRx(-0.75), "−0.75");
  assert.equal(formatRx(null), "");
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.deepEqual(monthRange("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
  assert.equal(toWhatsAppNumber("0300-1234567", "92"), "923001234567");
  assert.equal(toWhatsAppNumber("+92 300 1234567", "92"), "923001234567");
  assert.equal(toWhatsAppNumber("00447700900123", "92"), "447700900123");
  assert.equal(toSearchTerm("ali),order_no.eq.1%"), "aliorderno.eq.1");
});

test("valid order normalises input and drops blank lines", () => {
  const parsed = orderSchema.parse(order());
  assert.equal(parsed.phone, "03001234567");
  assert.equal(parsed.name, "Ayesha Khan");
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].price, 8000);
  assert.equal(parsed.discount, 500);
});

test("business rules are enforced", () => {
  const issues = (o: OrderFormValues) =>
    orderSchema.safeParse(o).error?.issues.map((i) => i.path.join(".")) ?? [];

  assert.deepEqual(issues(order({ advance: "7600" })), ["advance"]);
  assert.deepEqual(issues(order({ discount: "9000", advance: "0" })), ["discount"]);
  assert.deepEqual(issues(order({ delivery_date: "2026-09-01" })), ["delivery_date"]);
  assert.deepEqual(issues(order({ items: [{ item_id: "", description: "", qty: "1", price: "" }] })), ["items"]);
  const priceNoDescription = [{ item_id: "", description: "", qty: "1", price: "500" }];
  assert.deepEqual(issues(order({ items: priceNoDescription, discount: "0", advance: "0" })), [
    "items.0.description",
  ]);

  const cylWithoutAxis = order({ rx: { r: { ...emptyEye, cyl: "-1.25" }, l: { ...emptyEye } } });
  assert.deepEqual(issues(cylWithoutAxis), ["rx.r.axis"]);

  const badAxis = order({ rx: { r: { ...emptyEye, cyl: "-1", axis: "181" }, l: { ...emptyEye } } });
  assert.deepEqual(issues(badAxis), ["rx.r.axis"]);
});
