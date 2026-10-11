"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 700;
const format = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Animates a figure from 0 on first paint. Screen readers get the final value. */
export function CountUp({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = reduce ? 1 : Math.min(1, (now - start) / DURATION_MS);
      setShown(value * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      <span aria-hidden>
        {prefix}
        {format.format(shown)}
      </span>
      <span className="sr-only">
        {prefix}
        {format.format(value)}
      </span>
    </>
  );
}
