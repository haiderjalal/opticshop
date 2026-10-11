import { createElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { InvoiceDocument, type InvoiceData, type LogoImage } from "@/features/invoice/InvoiceDocument";
import { logger } from "@/lib/logger";
import { supabaseEnv } from "@/lib/supabase/env";

const LOGO_TIMEOUT_MS = 3000;

/** A slow or broken logo must never stop the invoice from rendering. */
async function fetchLogo(url: string | null): Promise<LogoImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(LOGO_TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (data[0] === 0x89 && data[1] === 0x50) return { data, format: "png" };
    if (data[0] === 0xff && data[1] === 0xd8) return { data, format: "jpg" };
    return null;
  } catch (error) {
    logger.warn("Invoice logo unavailable", { detail: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// Public: the random token in the URL is the only credential (it is what gets sent on WhatsApp).
export async function GET(_request: Request, { params }: RouteContext<"/i/[token]">) {
  const { token } = await params;
  if (!z.uuid().safeParse(token).success) return new Response("Invoice not found.", { status: 404 });

  const { url, key } = supabaseEnv();
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("invoice_by_token", { p_token: token });

  if (error) {
    logger.error("Invoice lookup failed", { code: error.code });
    return new Response("Unable to load this invoice right now.", { status: 500 });
  }
  if (!data) return new Response("Invoice not found.", { status: 404 });

  const invoice = data as InvoiceData;
  const logo = await fetchLogo(invoice.shop.logo_url);
  const pdf = await renderToBuffer(
    createElement(InvoiceDocument, { data: invoice, logo }) as React.ReactElement<DocumentProps>,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Invoice-${invoice.order.order_no}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
