export type DraftItem = { key: string; product_id: string | null; product_name: string; unit: string; qty: string; remark: string };
type SavedItem = { id: string; product_id: string | null; product_name: string; unit: string; quantity: number; remark: string | null; position?: number };

export function orderedItems<T extends { position?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function repeatDraft(items: SavedItem[]): DraftItem[] {
  return orderedItems(items).map((item) => ({ key: item.id, product_id: item.product_id, product_name: item.product_name, unit: item.unit, qty: String(item.quantity), remark: item.remark ?? "" }));
}

export function adjustQuantity(value: string, delta: number) {
  const qty = Number(value);
  return String(Math.max(0, Math.round(((Number.isFinite(qty) ? qty : 0) + delta) * 1000) / 1000));
}

export function submissionItems(items: DraftItem[]) {
  return items.filter((item) => Number.isFinite(Number(item.qty)) && Number(item.qty) > 0).map((item, index) => ({
    product_id: item.product_id, product_name: item.product_name, unit: item.unit,
    quantity: Number(item.qty), remark: item.remark.trim() || null, position: index + 1,
  }));
}