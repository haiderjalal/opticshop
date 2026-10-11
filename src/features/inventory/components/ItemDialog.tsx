"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ITEM_CATEGORIES } from "@/constants/app";
import { archiveItem, saveItem } from "@/features/inventory/actions";
import { cn } from "@/lib/utils";

import type { ActionResult, InventoryItem, ItemCategory } from "@/types/domain";

interface ItemDialogProps {
  item?: InventoryItem;
  defaultCategory?: ItemCategory;
  defaultOpen?: boolean;
  brands: string[];
}

export function ItemDialog({ item, defaultCategory = "frame", defaultOpen = false, brands }: ItemDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [category, setCategory] = useState<ItemCategory>(item?.category ?? defaultCategory);
  const editing = !!item;
  const [, action, saving] = useActionState(async (prev: ActionResult | null, form: FormData) => {
    const result = await saveItem(prev, form);
    if (!result.ok) {
      toast.error(result.message);
    } else if (editing) {
      toast.success(result.message);
      setOpen(false);
    } else {
      // Stay open: the form resets itself, ready for the next frame off the box.
      toast.success(`${result.message} Add the next one or close.`);
    }
    return result;
  }, null);
  const [archiving, startArchive] = useTransition();

  const close = (next: boolean) => {
    setOpen(next);
    // Drop ?add=1 so a refresh does not reopen the dialog.
    if (!next && defaultOpen) router.replace("/inventory");
  };

  return (
    <>
      {editing ? (
        <Button variant="ghost" size="icon" aria-label={`Edit ${item.name}`} onClick={() => setOpen(true)}>
          <PencilIcon />
        </Button>
      ) : (
        <Button size="lg" className="rounded-xl" onClick={() => setOpen(true)}>
          <PlusIcon /> Add item
        </Button>
      )}

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-lg">
          <form action={action} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit item" : "Add to stock"}</DialogTitle>
              <DialogDescription>Frames, sunglasses, lenses and accessories you keep on the shelf.</DialogDescription>
            </DialogHeader>

            <input type="hidden" name="id" value={item?.id ?? ""} />
            <input type="hidden" name="category" value={category} />
            <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-1.5">
              {(Object.keys(ITEM_CATEGORIES) as ItemCategory[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={c === category}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-sm font-medium transition-colors",
                    c === category ? "border-transparent bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {ITEM_CATEGORIES[c]}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="item-brand">Brand</Label>
                <Input id="item-brand" name="brand" list="brand-options" defaultValue={item?.brand ?? ""} autoComplete="off" autoFocus />
                <datalist id="brand-options">
                  {brands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-name">{category === "lens" || category === "contact_lens" ? "Lens type" : "Model"}</Label>
                <Input
                  id="item-name"
                  name="name"
                  required
                  defaultValue={item?.name ?? ""}
                  placeholder={category === "lens" ? "Blue cut 1.56" : "RB2140"}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="item-details">
                  Details <span className="font-normal text-muted-foreground">(colour, size, power range…)</span>
                </Label>
                <Input id="item-details" name="details" defaultValue={item?.details ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-price">Sale price</Label>
                <Input id="item-price" name="price" inputMode="decimal" defaultValue={item ? String(item.price) : ""} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-cost">Cost price</Label>
                <Input id="item-cost" name="cost" inputMode="decimal" defaultValue={item ? String(item.cost) : ""} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-qty">In stock</Label>
                <Input id="item-qty" name="qty" inputMode="numeric" defaultValue={String(item?.qty ?? 1)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-low">Warn when at or below</Label>
                <Input id="item-low" name="low_stock" inputMode="numeric" defaultValue={String(item?.low_stock ?? 2)} required />
              </div>
            </div>

            <DialogFooter className="sm:justify-between">
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={archiving}
                  onClick={() =>
                    startArchive(async () => {
                      const result = await archiveItem(item.id);
                      if (result.ok) {
                        toast.success(result.message);
                        setOpen(false);
                      } else toast.error(result.message);
                    })
                  }
                >
                  <Trash2Icon /> Remove from stock
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <DialogClose render={<Button type="button" variant="outline" />}>Close</DialogClose>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2Icon className="animate-spin" />}
                  {editing ? "Save changes" : "Add item"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
