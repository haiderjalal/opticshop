import type { Metadata } from "next";
import Image from "next/image";
import { Fragment, type CSSProperties } from "react";

import { LensMark } from "@/components/shared/LensMark";
import { LoginForm } from "@/features/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in" };

interface Branding {
  shop_name: string;
  tagline: string | null;
  logo_url: string | null;
  brand_color: string;
}

const HEADLINE_WORDS = "Every frame, every lens, every sale — at the counter.".split(" ");

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("shop_branding");
  const brand = (data as Branding | null) ?? { shop_name: "OpticShop", tagline: null, logo_url: null, brand_color: "#0f1b2d" };

  return (
    <main
      className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]"
      style={{ "--brand": brand.brand_color } as CSSProperties}
    >
      <section className="relative isolate flex min-h-56 flex-col justify-between overflow-hidden bg-primary p-8 text-primary-foreground lg:min-h-dvh lg:p-12">
        {/* A coating reflex drifting behind the brand, and a large lens outline drawing itself on. */}
        <div
          aria-hidden
          className="drift absolute -right-4 bottom-40 -z-10 hidden size-72 rounded-full opacity-60 blur-2xl coating lg:block"
          style={{ animationDelay: "-5s" }}
        />
        <LensMark animated className="float absolute -right-10 -bottom-6 -z-10 h-44 w-80 opacity-[0.14] lg:-right-16 lg:bottom-10 lg:h-72 lg:w-[30rem]" />

        <div className="flex items-center gap-3">
          {brand.logo_url ? (
            <Image src={brand.logo_url} alt="" width={44} height={44} className="size-11 rounded-xl bg-white object-contain p-1" />
          ) : (
            <LensMark className="h-7 w-14" />
          )}
          <span className="font-heading text-lg font-semibold">{brand.shop_name}</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-heading text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
            {HEADLINE_WORDS.map((word, i) => (
              <Fragment key={`${word}-${i}`}>
                <span className="word-in" style={{ "--i": i } as CSSProperties}>
                  {word}
                </span>
                {i < HEADLINE_WORDS.length - 1 && " "}
              </Fragment>
            ))}
          </h1>
          {brand.tagline && <p className="fade-up mt-4 text-lg text-white/70">{brand.tagline}</p>}
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="page-enter w-full max-w-sm" style={{ animationDelay: "120ms" }}>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
