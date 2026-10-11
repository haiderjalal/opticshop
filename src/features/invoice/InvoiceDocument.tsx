import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDate, formatMoney } from "@/lib/format";

import type { Rx, RxEye, RxSource } from "@/types/domain";

export interface InvoiceData {
  shop: {
    shop_name: string;
    tagline: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    logo_url: string | null;
    brand_color: string;
    currency: string;
    invoice_note: string | null;
  };
  order: {
    order_no: number;
    order_date: string;
    delivery_date: string | null;
    status: string;
    rx: Rx | null;
    rx_source: RxSource;
    prescribed_by: string | null;
    checked_by: string | null;
    subtotal: number;
    discount: number;
    total: number;
    remarks: string | null;
  };
  customer: { name: string; phone: string; address: string | null };
  items: { description: string; qty: number; price: number }[];
  paid: number;
}

export interface LogoImage {
  data: Buffer;
  format: "png" | "jpg";
}

const INK = "#0f1b2d";
const MUTED = "#5b6b7f";
const LINE = "#dfe4ea";

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: INK },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  muted: { color: MUTED },
  bold: { fontFamily: "Helvetica-Bold" },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  label: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  section: { marginTop: 14 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderColor: LINE, paddingBottom: 4, color: MUTED, fontSize: 7.5 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: LINE, paddingVertical: 5 },
  mono: { fontFamily: "Courier" },
});

// Helvetica has no U+2212, so powers use an ASCII hyphen here.
function power(n: number | null): string {
  if (n === null) return "-";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

function eyeCells(eye: RxEye): string[] {
  const plain = (v: number | string | null) => (v === null || v === "" ? "-" : String(v));
  return [power(eye.sph), power(eye.cyl), eye.axis === null ? "-" : `${eye.axis}`, power(eye.add), plain(eye.prism), plain(eye.pd), plain(eye.hd)];
}

const RX_HEAD = ["", "SPH", "CYL", "AXIS", "ADD", "PRISM", "PD", "HD"];

export function InvoiceDocument({ data, logo }: { data: InvoiceData; logo: LogoImage | null }) {
  const { shop, order, customer, items } = data;
  const money = (n: number) => formatMoney(Number(n), shop.currency);
  const balance = Math.max(0, Number(order.total) - Number(data.paid));
  const brand = shop.brand_color;
  const rx = order.rx;

  return (
    <Document title={`Invoice ${order.order_no} - ${shop.shop_name}`} author={shop.shop_name}>
      <Page size="A5" style={s.page}>
        <View style={{ height: 4, backgroundColor: brand, marginHorizontal: -28, marginTop: -28, marginBottom: 20 }} />

        <View style={s.between}>
          <View style={[s.row, { alignItems: "center", gap: 8, maxWidth: "62%" }]}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            {logo && <Image src={logo} style={{ width: 38, height: 38, objectFit: "contain" }} />}
            <View>
              <Text style={s.h1}>{shop.shop_name}</Text>
              {shop.tagline && <Text style={s.muted}>{shop.tagline}</Text>}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.bold, { fontSize: 11, color: brand }]}>INVOICE</Text>
            <Text style={[s.mono, { fontSize: 11 }]}>#{order.order_no}</Text>
            <Text style={s.muted}>{formatDate(order.order_date)}</Text>
          </View>
        </View>

        <Text style={[s.muted, { marginTop: 6 }]}>
          {[shop.phone, shop.email, shop.address].filter(Boolean).join("  ·  ")}
        </Text>

        <View style={[s.between, s.section, { borderTopWidth: 1, borderColor: LINE, paddingTop: 10 }]}>
          <View style={{ maxWidth: "60%" }}>
            <Text style={s.label}>Billed to</Text>
            <Text style={s.bold}>{customer.name}</Text>
            <Text>{customer.phone}</Text>
            {customer.address && <Text style={s.muted}>{customer.address}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>Delivery</Text>
            <Text style={s.bold}>{formatDate(order.delivery_date)}</Text>
          </View>
        </View>

        {rx && (
          <View style={s.section}>
            <Text style={s.label}>Prescription</Text>
            <View style={s.tableHead}>
              {RX_HEAD.map((h, i) => (
                <Text key={h || "eye"} style={{ width: i === 0 ? "9%" : "13%" }}>
                  {h}
                </Text>
              ))}
            </View>
            {(["r", "l"] as const).map((eye) => (
              <View key={eye} style={s.tableRow}>
                <Text style={[s.bold, { width: "9%" }]}>{eye.toUpperCase()}</Text>
                {eyeCells(rx[eye]).map((cell, i) => (
                  <Text key={i} style={[s.mono, { width: "13%" }]}>
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
            {(order.prescribed_by || order.checked_by) && (
              <Text style={[s.muted, { marginTop: 4 }]}>
                {[order.prescribed_by && `Prescribed by ${order.prescribed_by}`, order.checked_by && `Checked by ${order.checked_by}`]
                  .filter(Boolean)
                  .join("  ·  ")}
              </Text>
            )}
          </View>
        )}

        <View style={s.section}>
          <View style={s.tableHead}>
            <Text style={{ width: "62%" }}>Item</Text>
            <Text style={{ width: "10%", textAlign: "right" }}>Qty</Text>
            <Text style={{ width: "28%", textAlign: "right" }}>Amount</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={{ width: "62%" }}>{item.description}</Text>
              <Text style={{ width: "10%", textAlign: "right" }}>{item.qty}</Text>
              <Text style={{ width: "28%", textAlign: "right" }}>{money(item.qty * Number(item.price))}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 10, marginLeft: "45%", gap: 3 }}>
          <View style={s.between}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{money(order.subtotal)}</Text>
          </View>
          {Number(order.discount) > 0 && (
            <View style={s.between}>
              <Text style={s.muted}>Discount</Text>
              <Text>-{money(order.discount)}</Text>
            </View>
          )}
          <View style={[s.between, { borderTopWidth: 1, borderColor: LINE, paddingTop: 3 }]}>
            <Text style={s.bold}>Total</Text>
            <Text style={s.bold}>{money(order.total)}</Text>
          </View>
          <View style={s.between}>
            <Text style={s.muted}>Paid</Text>
            <Text>{money(data.paid)}</Text>
          </View>
          <View style={[s.between, { backgroundColor: balance > 0 ? brand : "#0a8f73", color: "#ffffff", padding: 6, borderRadius: 4, marginTop: 4 }]}>
            <Text style={s.bold}>{balance > 0 ? "Balance due" : "Fully paid"}</Text>
            <Text style={s.bold}>{money(balance)}</Text>
          </View>
        </View>

        {order.remarks && (
          <View style={s.section}>
            <Text style={s.label}>Remarks</Text>
            <Text>{order.remarks}</Text>
          </View>
        )}

        <View style={{ position: "absolute", bottom: 24, left: 28, right: 28, borderTopWidth: 1, borderColor: LINE, paddingTop: 8 }} fixed>
          {shop.invoice_note && <Text style={[s.muted, { marginBottom: 4 }]}>{shop.invoice_note}</Text>}
          <Text style={[s.muted, { textAlign: "center" }]}>Thank you for choosing {shop.shop_name}.</Text>
        </View>
      </Page>
    </Document>
  );
}
