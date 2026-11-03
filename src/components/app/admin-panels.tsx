import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchCategories, fetchOrders, fetchProducts, fetchStalls } from "./data";
import { OrderCard } from "./order-card";
import { createStallUser, deleteStallUser } from "@/lib/admin.functions";
import { OrderExportButton } from "./order-export-button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function AdminOrders() {
  const qc = useQueryClient();
  const stalls = useQuery({ queryKey: ["stalls"], queryFn: fetchStalls });
  const [stall, setStall] = useState("all");
  const orders = useQuery({
    queryKey: ["orders", stall],
    queryFn: () => fetchOrders(stall === "all" ? undefined : stall),
  });
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["orders"] });
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
      <Select value={stall} onValueChange={setStall}>
        <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stalls</SelectItem>
          {stalls.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <OrderExportButton orders={orders.data ?? []} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {orders.data?.map((o) => (
          <OrderCard key={o.id} order={o} actions={
            <>
              {["pending", "accepted", "delivered"].map((s) => (
                <Button key={s} size="sm" variant={o.status === s ? "default" : "outline"} className="capitalize" onClick={() => setStatus(o.id, s)}>{s}</Button>
              ))}
            </>
          } />
        ))}
        {orders.data && !orders.data.length && <p className="text-muted-foreground">Koi order nahi.</p>}
      </div>
    </div>
  );
}

export function AdminStalls() {
  const qc = useQueryClient();
  const stalls = useQuery({ queryKey: ["stalls"], queryFn: fetchStalls });
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("stalls").insert({ name: name.trim(), location: location.trim() || null });
    if (error) { toast.error(error.message); return; }
    setName(""); setLocation("");
    qc.invalidateQueries({ queryKey: ["stalls"] });
  }
  async function remove(id: string) {
    if (!confirm("Stall delete karein? Iske orders bhi hat jayenge.")) return;
    const { error } = await supabase.from("stalls").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["stalls"] });
  }
  return (
    <Section title="Stalls">
      <form onSubmit={add} className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Stall name" value={name} onChange={(e) => setName(e.target.value)} required className="w-56" />
        <Input placeholder="Location / Platform" value={location} onChange={(e) => setLocation(e.target.value)} className="w-56" />
        <Button type="submit">Add stall</Button>
      </form>
      <ul className="divide-y">
        {stalls.data?.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2">
            <span><b>{s.name}</b> <span className="text-sm text-muted-foreground">{s.location}</span></span>
            <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>Delete</Button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function AdminCatalog() {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const [catName, setCatName] = useState("");
  const [parent, setParent] = useState("none");
  const [p, setP] = useState({ name: "", unit: "pcs", category: "", sub: "none" });
  const top = (cats.data ?? []).filter((c) => !c.parent_id);
  const subsOf = (id: string) => (cats.data ?? []).filter((c) => c.parent_id === id);
  const nameOf = (id: string | null) => cats.data?.find((c) => c.id === id)?.name;

  async function addCat(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("categories").insert({ name: catName.trim(), parent_id: parent === "none" ? null : parent });
    if (error) { toast.error(error.message); return; }
    setCatName("");
    qc.invalidateQueries({ queryKey: ["categories"] });
  }
  async function delCat(id: string) {
    if (!confirm("Category delete karein?")) return;
    await supabase.from("categories").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["categories"] });
  }
  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("products").insert({
      name: p.name.trim(), unit: p.unit.trim() || "pcs",
      category_id: p.category || null, subcategory_id: p.sub === "none" ? null : p.sub,
    });
    if (error) { toast.error(error.message); return; }
    setP({ ...p, name: "" });
    qc.invalidateQueries({ queryKey: ["products"] });
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("products").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["products"] });
  }
  async function delProduct(id: string) {
    if (!confirm("Product delete karein?")) return;
    await supabase.from("products").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
      <Section title="Categories & Subcategories">
        <form onSubmit={addCat} className="mb-4 flex flex-wrap gap-2">
          <Input placeholder="Name" value={catName} onChange={(e) => setCatName(e.target.value)} required className="w-40" />
          <Select value={parent} onValueChange={setParent}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Main category</SelectItem>
              {top.map((c) => <SelectItem key={c.id} value={c.id}>Sub of: {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit">Add</Button>
        </form>
        <ul className="space-y-2 text-sm">
          {top.map((c) => (
            <li key={c.id}>
              <div className="flex justify-between font-medium">{c.name}<button className="text-xs text-destructive" onClick={() => delCat(c.id)}>delete</button></div>
              <ul className="ml-4 text-muted-foreground">
                {subsOf(c.id).map((s) => (
                  <li key={s.id} className="flex justify-between">› {s.name}<button className="text-xs text-destructive" onClick={() => delCat(s.id)}>delete</button></li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Products">
        <form onSubmit={addProduct} className="mb-4 flex flex-wrap gap-2">
          <Input placeholder="Product name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required className="w-44" />
          <Input placeholder="Unit (kg, pcs, box)" value={p.unit} onChange={(e) => setP({ ...p, unit: e.target.value })} className="w-32" />
          <Select value={p.category} onValueChange={(v) => setP({ ...p, category: v, sub: "none" })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{top.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={p.sub} onValueChange={(v) => setP({ ...p, sub: v })} disabled={!p.category}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Subcategory" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No subcategory</SelectItem>
              {subsOf(p.category).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit">Add product</Button>
        </form>
        <ul className="divide-y text-sm">
          {products.data?.map((pr) => (
            <li key={pr.id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <div className={pr.active ? "font-medium" : "font-medium line-through text-muted-foreground"}>{pr.name} <span className="text-muted-foreground">({pr.unit})</span></div>
                <div className="text-xs text-muted-foreground">{[nameOf(pr.category_id), nameOf(pr.subcategory_id)].filter(Boolean).join(" › ")}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => toggle(pr.id, !pr.active)}>{pr.active ? "Hide" : "Show"}</Button>
                <Button size="sm" variant="ghost" onClick={() => delProduct(pr.id)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export function AdminUsers() {
  const qc = useQueryClient();
  const create = useServerFn(createStallUser);
  const del = useServerFn(deleteStallUser);
  const stalls = useQuery({ queryKey: ["stalls"], queryFn: fetchStalls });
  const users = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: links }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
        supabase.from("user_stalls").select("*"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        isAdmin: roles?.some((r) => r.user_id === p.id && r.role === "admin"),
        stallIds: (links ?? []).filter((l) => l.user_id === p.id).map((l) => l.stall_id),
      }));
    },
  });
  const [form, setForm] = useState({ fullName: "", username: "", password: "" });
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: { ...form, stallIds: picked } });
      toast.success("User ban gaya");
      setForm({ fullName: "", username: "", password: "" });
      setPicked([]);
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggleStall(userId: string, stallId: string, on: boolean) {
    const { error } = on
      ? await supabase.from("user_stalls").insert({ user_id: userId, stall_id: stallId })
      : await supabase.from("user_stalls").delete().eq("user_id", userId).eq("stall_id", stallId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["users"] });
  }
  async function remove(id: string) {
    if (!confirm("User delete karein?")) return;
    try { await del({ data: { userId: id } }); qc.invalidateQueries({ queryKey: ["users"] }); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
      <Section title="Naya stall login banayein">
        <form onSubmit={submit} className="space-y-2">
          <Input placeholder="Stall / user naam" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <Input placeholder="Login ID (jaise stall1)" autoCapitalize="none" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <Input type="password" autoComplete="new-password" placeholder="Password (min 6)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          <div className="text-sm font-medium pt-1">Stalls assign karein:</div>
          <div className="flex flex-wrap gap-3">
            {stalls.data?.map((s) => (
              <label key={s.id} className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={picked.includes(s.id)} onCheckedChange={(c) => setPicked(c ? [...picked, s.id] : picked.filter((x) => x !== s.id))} />
                {s.name}
              </label>
            ))}
            {!stalls.data?.length && <span className="text-sm text-muted-foreground">Pehle stall banayein.</span>}
          </div>
          <Button type="submit" disabled={busy}>Create user</Button>
        </form>
      </Section>
      <Section title="Users">
        <ul className="divide-y">
          {users.data?.map((u) => (
            <li key={u.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{u.full_name || u.email} {u.isAdmin && <span className="ml-1 rounded bg-primary px-1.5 text-xs text-primary-foreground">Admin</span>}</div>
                  <div className="text-xs text-muted-foreground">{u.username ? `Login ID: ${u.username}` : u.email}</div>
                </div>
                {!u.isAdmin && <Button size="sm" variant="ghost" onClick={() => remove(u.id)}>Delete</Button>}
              </div>
              {!u.isAdmin && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {stalls.data?.map((s) => (
                    <label key={s.id} className="flex items-center gap-1.5 text-sm">
                      <Checkbox checked={u.stallIds.includes(s.id)} onCheckedChange={(c) => toggleStall(u.id, s.id, !!c)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
