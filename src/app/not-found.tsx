import Link from "next/link";

import { LensMark } from "@/components/shared/LensMark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="grid min-h-[70dvh] place-items-center p-6">
      <div className="text-center">
        <LensMark className="mx-auto mb-5 h-10 w-20" />
        <h1 className="text-3xl font-bold">Out of focus</h1>
        <p className="mt-2 text-muted-foreground">This order, customer or page does not exist.</p>
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-xl")}>
          Back to today
        </Link>
      </div>
    </main>
  );
}
