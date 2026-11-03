import { supabase } from "@/integrations/supabase/client";

export async function fetchStalls() {
  const { data, error } = await supabase.from("stalls").select("*").order("name");
  if (error) throw error;
  return data;
}
export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data;
}
export async function fetchProducts() {
  const { data, error } = await supabase.from("products").select("*").order("name");
  if (error) throw error;
  return data;
}
export async function fetchOrders(stallId?: string) {
  let q = supabase
    .from("orders")
    .select("*, stalls(name), order_items(*)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (stallId) q = q.eq("stall_id", stallId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
export type OrderRow = Awaited<ReturnType<typeof fetchOrders>>[number];
