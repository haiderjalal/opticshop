"use client";

import { useId, useRef, useState, type ComponentProps, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 180;

interface SuggestInputProps<T> extends Omit<ComponentProps<"input">, "onSelect"> {
  fetchSuggestions: (query: string) => Promise<T[]>;
  renderSuggestion: (item: T) => ReactNode;
  getKey: (item: T) => string;
  onPick: (item: T) => void;
  minChars?: number;
}

/**
 * Text input with server-backed suggestions (ARIA combobox).
 * Works with react-hook-form `register` — typed text stays the field value,
 * picking a suggestion calls `onPick` so the caller can fill related fields.
 */
export function SuggestInput<T>({
  fetchSuggestions,
  renderSuggestion,
  getKey,
  onPick,
  minChars = 2,
  onChange,
  onBlur,
  onKeyDown,
  className,
  ...inputProps
}: SuggestInputProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requestId = useRef(0);
  const listId = useId();

  const lookup = (value: string) => {
    clearTimeout(timer.current);
    if (value.trim().length < minChars) {
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const id = ++requestId.current;
      const result = await fetchSuggestions(value);
      if (id !== requestId.current) return; // a newer keystroke won
      setItems(result);
      setActive(0);
      setOpen(result.length > 0);
    }, DEBOUNCE_MS);
  };

  // Also cancels a lookup still in flight, so a slow response cannot reopen the list.
  const close = () => {
    requestId.current++;
    clearTimeout(timer.current);
    setOpen(false);
  };

  const pick = (item: T) => {
    close();
    onPick(item);
  };

  return (
    <div className="relative">
      <Input
        {...inputProps}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        className={className}
        onChange={(e) => {
          onChange?.(e);
          lookup(e.target.value);
        }}
        onBlur={(e) => {
          onBlur?.(e);
          close();
        }}
        onKeyDown={(e) => {
          if (open && items.length > 0) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const step = e.key === "ArrowDown" ? 1 : -1;
              setActive((a) => (a + step + items.length) % items.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              if (e.key === "Enter") e.preventDefault();
              pick(items[active]);
              return;
            }
          }
          if (e.key === "Escape") {
            if (open) e.preventDefault();
            close();
            return;
          }
          onKeyDown?.(e);
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1.5 max-h-80 w-full min-w-72 overflow-y-auto rounded-xl border bg-popover p-1 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-1"
        >
          {items.map((item, i) => (
            <li
              key={getKey(item)}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input does not blur first
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("cursor-pointer rounded-lg px-2.5 py-2 text-sm", i === active && "bg-muted")}
            >
              {renderSuggestion(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
