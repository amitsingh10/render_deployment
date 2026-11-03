import { Badge } from "@/components/ui/badge";
import type { OrderRow } from "./data";
import type { ReactNode } from "react";
import { orderedItems } from "@/lib/order-draft";

export function OrderCard({ order, actions }: { order: OrderRow; actions?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">{order.stalls?.name ?? "Stall"}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString("en-IN")}
          </div>
        </div>
        <Badge variant={order.status === "delivered" ? "secondary" : "default"} className="capitalize">
          {order.status}
        </Badge>
      </div>
      <ul className="mt-3 divide-y text-sm">
        {orderedItems(order.order_items).map((it, index) => (
          <li key={it.id} className="py-1.5">
            <div className="flex justify-between gap-2">
              <span>{index + 1}. {it.product_name}</span>
              <span className="font-medium">{it.quantity} {it.unit}</span>
            </div>
            {it.remark && <div className="text-xs text-accent-foreground bg-accent rounded px-2 py-0.5 mt-1">💬 {it.remark}</div>}
          </li>
        ))}
      </ul>
      {order.note && <p className="mt-2 text-sm text-muted-foreground">Note: {order.note}</p>}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
