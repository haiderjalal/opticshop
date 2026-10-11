// Pure formatting helpers. No framework imports so `npm test` can run them directly.

const moneyFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** `Rs 1,250` / `-Rs 300`. ASCII hyphen so the Latin-only PDF font can print it. */
export function formatMoney(amount: number, currency: string): string {
  const n = Number(amount) || 0;
  return `${n < 0 ? "-" : ""}${currency} ${moneyFormat.format(Math.abs(n))}`;
}

// Dates are stored as plain `YYYY-MM-DD`; format in UTC so the day never shifts.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const shortDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatDate(iso: string | null, short = false): string {
  if (!iso) return "—";
  return (short ? shortDateFormat : dateFormat).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

/** For real timestamps (not plain dates): shown as the calendar day in the shop's timezone. */
export function formatInstant(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone }).format(new Date(iso));
}

export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

/** `2026-09` → first and last day of that month. */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

/** `2026-01`, -1 → `2025-12`. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

/** Rx powers read `+1.25` / `-0.75`; axis and PD are plain numbers. */
export function formatRx(value: number | null, signed = true): string {
  if (value === null || value === undefined) return "";
  if (!signed) return String(value);
  const fixed = Math.abs(value).toFixed(2);
  if (value === 0) return "0.00";
  return `${value > 0 ? "+" : "−"}${fixed}`;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Local numbers (`0300…`) become international (`92300…`) for wa.me links.
 * ponytail: assumes customers share the shop's country; numbers saved with
 * another country's code and no leading 0/00 get the shop's code prepended.
 */
export function toWhatsAppNumber(phone: string, countryCode: string): string {
  const digits = digitsOnly(phone);
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return countryCode + digits.slice(1);
  if (digits.startsWith(countryCode) && digits.length > countryCode.length + 8) return digits;
  return countryCode + digits;
}

export function whatsappLink(phone: string, countryCode: string, text: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone, countryCode)}?text=${encodeURIComponent(text)}`;
}

/** Drops control characters that have no business in shop records. Keeps newlines. */
export function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim();
}

/** Strips characters that carry meaning in PostgREST filter strings or LIKE patterns. */
export function toSearchTerm(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s.'-]/gu, "").trim().slice(0, 60);
}
