import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCategories, fetchOrders, fetchProducts, fetchStalls } from "./data";
import { OrderCard } from "./order-card";
import { OrderExportButton } from "./order-export-button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { adjustQuantity, repeatDraft, submissionItems, type DraftItem } from "@/lib/order-draft";

export function StallPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const stalls = useQuery({ queryKey: ["stalls"], queryFn: fetchStalls });
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const [stallId, setStallId] = useState<string>("");
  const activeStall = stallId || stalls.data?.[0]?.id || "";
  const orders = useQuery({
    queryKey: ["orders", activeStall],
    queryFn: () => fetchOrders(activeStall),
    enabled: !!activeStall,
  });
  const [lines, setLines] = useState<DraftItem[]>([]);
  const [repeating, setRepeating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("new");
  const [busy, setBusy] = useState(false);

  const catName = useMemo(
    () => Object.fromEntries((cats.data ?? []).map((c) => [c.id, c.name])),
    [cats.data],
  );
  const topCats = (cats.data ?? []).filter((c) => !c.parent_id);
  const list = (products.data ?? []).filter(
    (p) =>
      p.active &&
      (filter === "all" || p.category_id === filter) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );

  function setLine(key: string, patch: Partial<DraftItem>) {
    setLines((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  function addProduct(p: NonNullable<typeof products.data>[number]) {
    if (lines.some((row) => row.product_id === p.id)) return;
    setLines((rows) => [...rows, { key: crypto.randomUUID(), product_id: p.id, product_name: p.name, unit: p.unit, qty: "1", remark: "" }]);
  }

  async function placeOrder() {
    const items = submissionItems(lines);
    if (!items.length) { toast.error("Kam se kam ek product ki quantity daalein"); return; }
    setBusy(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({ stall_id: activeStall, user_id: userId, note: note.trim() || null })
      .select()
      .single();
    if (error || !order) {
      setBusy(false);
      { toast.error(error?.message ?? "Order failed"); return; }
    }
    const { error: e2 } = await supabase
      .from("order_items")
      .insert(items.map((i) => ({ ...i, order_id: order.id })));
    setBusy(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success("Order bhej diya!");
    setLines([]);
    setNote("");
    setRepeating(false); setAdding(false);
    qc.invalidateQueries({ queryKey: ["orders"] });
    setTab("history");
  }

  function reorder(o: NonNullable<typeof orders.data>[number]) {
    setLines(repeatDraft(o.order_items));
    setRepeating(true);
    setAdding(false);
    setSearch(""); setFilter("all");
    setNote(o.note ?? "");
    setTab("new");
    toast.success("Purana order load ho gaya — check karke bhejein");
  }

  if (stalls.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!stalls.data?.length)
    return <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Aapko abhi koi stall assign nahi hua hai. Admin se sampark karein.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Stall:</span>
        <Select value={activeStall} onValueChange={(v) => { setStallId(v); setLines([]); setNote(""); setRepeating(false); setAdding(false); }}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {stalls.data.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="new">New order</TabsTrigger>
          <TabsTrigger value="history">Previous orders</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{repeating ? "Repeat order" : "Naya order"}</h2>
            <div className="flex gap-2">
              {repeating && <Button variant="outline" onClick={() => { setRepeating(false); setLines([]); setNote(""); setAdding(false); }}>Naya order</Button>}
              <Button variant="outline" onClick={() => setAdding(!adding)}><Plus className="size-4" /> Item jodein</Button>
            </div>
          </div>
          <div className="space-y-2">
            {lines.map((item, index) => (
              <div key={item.key} className="rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 font-medium">{index + 1}. {item.product_name}</div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" aria-label={`Quantity kam karein: ${item.product_name}`} title="Quantity kam karein" onClick={() => setLine(item.key, { qty: adjustQuantity(item.qty, -1) })}><Minus className="size-4" /></Button>
                    <Input aria-label={`Quantity: ${item.product_name}`} type="number" min="0" step="any" className="w-20" value={item.qty} onChange={(e) => setLine(item.key, { qty: e.target.value })} />
                    <Button size="icon" variant="outline" aria-label={`Quantity badhayein: ${item.product_name}`} title="Quantity badhayein" onClick={() => setLine(item.key, { qty: adjustQuantity(item.qty, 1) })}><Plus className="size-4" /></Button>
                    <span className="px-1 text-sm text-muted-foreground">{item.unit}</span>
                    <Button size="icon" variant="ghost" aria-label={`Item hatayein: ${item.product_name}`} title="Item hatayein" onClick={() => setLines((rows) => rows.filter((row) => row.key !== item.key))}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
                <Input className="mt-2" aria-label={`Remark: ${item.product_name}`} placeholder="Remark (optional)" value={item.remark} onChange={(e) => setLine(item.key, { remark: e.target.value })} />
              </div>
            ))}
          </div>
          {(!repeating || adding) && <>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search product…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {topCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ol className="divide-y rounded-lg border bg-card">
              {list.map((p, index) => (
                <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="font-medium">{index + 1}. {p.name}</div>
                    <div className="text-xs text-muted-foreground">{[catName[p.category_id ?? ""], catName[p.subcategory_id ?? ""]].filter(Boolean).join(" › ")} · {p.unit}</div>
                  </div>
                  <Button size="sm" variant="outline" aria-label={`Item jodein: ${p.name}`} disabled={lines.some((row) => row.product_id === p.id)} onClick={() => addProduct(p)}><Plus className="size-4" /> {lines.some((row) => row.product_id === p.id) ? "Joda gaya" : "Jodein"}</Button>
                </li>
              ))}
              {!list.length && <li className="p-3 text-muted-foreground">Koi product nahi mila.</li>}
            </ol>
          </>}
          <Textarea placeholder="Poore order ke liye note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="lg" onClick={placeOrder} disabled={busy}>Order bhejein</Button>
        </TabsContent>
        <TabsContent value="history" className="space-y-3">
          <div className="flex justify-end"><OrderExportButton orders={orders.data ?? []} /></div>
          <div className="grid gap-3 md:grid-cols-2">
          {orders.data?.map((o) => (
            <OrderCard key={o.id} order={o} actions={<Button size="sm" variant="outline" onClick={() => reorder(o)}>Repeat this order</Button>} />
          ))}
          {orders.data && !orders.data.length && <p className="text-muted-foreground">Abhi koi order nahi.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
