"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BoxesIcon,
  ClipboardListIcon,
  Loader2Icon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { searchEverything, type SearchHit } from "@/features/search/actions";

const DEBOUNCE_MS = 180;

const QUICK_ACTIONS = [
  { label: "New order", href: "/orders/new", icon: PlusIcon, shortcut: "N" },
  { label: "Add expense", href: "/expenses", icon: ReceiptIcon },
  { label: "Add stock item", href: "/inventory?add=1", icon: BoxesIcon },
  { label: "Orders ready for pickup", href: "/orders?status=ready", icon: ClipboardListIcon },
];

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, startSearch] = useTransition();
  const latest = useRef("");

  // Keyboard-first counter: Ctrl/⌘+K or "/" to search, "N" for a new order.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/orders/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  useEffect(() => {
    latest.current = query;
    const timer = setTimeout(() => {
      if (query.trim().length < 2) {
        setHits([]);
        return;
      }
      startSearch(async () => {
        const result = await searchEverything(query);
        if (latest.current === query) setHits(result);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const actions = QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-md items-center gap-2 rounded-xl border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-ring/40 hover:text-foreground"
      >
        <SearchIcon className="size-4" />
        <span className="truncate">Search name, phone or order #</span>
        <kbd className="ml-auto hidden rounded-md border bg-muted px-1.5 font-mono text-[11px] sm:inline">Ctrl K</kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Find a customer by name or phone, or an order by number."
        className="sm:max-w-lg"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Name, phone or order number…"
            className="h-10 text-base"
          />
          <CommandList className="max-h-[60vh]">
            {searching && hits.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" /> Searching…
              </div>
            )}
            {!searching && query.trim().length >= 2 && hits.length === 0 && actions.length === 0 && (
              <CommandEmpty>No customer or order matches “{query}”.</CommandEmpty>
            )}
            {hits.length > 0 && (
              <CommandGroup heading="Results">
                {hits.map((hit) => (
                  <CommandItem key={`${hit.kind}-${hit.id}`} value={hit.href} onSelect={() => go(hit.href)} className="py-2.5">
                    {hit.kind === "order" ? <ClipboardListIcon /> : <UserIcon />}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{hit.title}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{hit.subtitle}</p>
                    </div>
                    {hit.status && <StatusBadge status={hit.status} className="ml-auto" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {actions.length > 0 && (
              <CommandGroup heading="Go to">
                {actions.map(({ label, href, icon: Icon, shortcut }) => (
                  <CommandItem key={href} value={href} onSelect={() => go(href)} className="py-2.5">
                    <Icon />
                    {label}
                    {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
