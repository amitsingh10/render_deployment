import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportOrders } from "@/lib/order-export";
import type { OrderRow } from "./data";

export function OrderExportButton({ orders }: { orders: OrderRow[] }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      await exportOrders(orders);
    } catch {
      toast.error("Excel download nahi hua. Dobara koshish karein.");
    } finally {
      setBusy(false);
    }
  }
  return <Button variant="outline" size="sm" disabled={busy || !orders.length} onClick={download}>
    {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
    Excel export
  </Button>;
}