"use client";

import { useEffect } from "react";
import { RotateCcwIcon } from "lucide-react";

import { LensMark } from "@/components/shared/LensMark";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The server already logged the details; this ties the screen to that log line.
    console.error("Page failed to load", error.digest);
  }, [error]);

  return (
    <div className="card-surface mx-auto mt-10 max-w-md p-8 text-center">
      <LensMark className="mx-auto mb-4 h-8 w-16" />
      <h1 className="text-2xl font-bold">This page did not load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Check the internet connection and try again. Nothing you saved has been lost.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>}
      <Button onClick={reset} size="lg" className="mt-6 rounded-xl">
        <RotateCcwIcon /> Try again
      </Button>
    </div>
  );
}
