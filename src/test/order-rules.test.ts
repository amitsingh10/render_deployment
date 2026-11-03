import { describe, expect, it } from "vitest";
import { adjustQuantity, repeatDraft, submissionItems } from "@/lib/order-draft";
import { exportRows } from "@/lib/order-export";
import type { OrderRow } from "@/components/app/data";

const saved = [
  { id: "second", product_id: "p2", product_name: "Chai", unit: "cup", quantity: 3, remark: "Kam chini", position: 2 },
  { id: "first", product_id: null, product_name: "Purana item", unit: "box", quantity: 2, remark: null, position: 1 },
];

describe("Stall order rules", () => {
  it("repeats only original rows in saved serial order, including unavailable items", () => {
    expect(repeatDraft(saved).map(({ product_name, unit, qty }) => ({ product_name, unit, qty }))).toEqual([
      { product_name: "Purana item", unit: "box", qty: "2" },
      { product_name: "Chai", unit: "cup", qty: "3" },
    ]);
  });
  it("increases quantity by one", () => { expect(adjustQuantity("2", 1)).toBe("3"); });
  it("decreases quantity by one without going below zero", () => {
    expect(adjustQuantity("2", -1)).toBe("1");
    expect(adjustQuantity("0", -1)).toBe("0");
  });
  it("appends new items after repeated items and saves consecutive serial numbers", () => {
    const draft = [...repeatDraft(saved), { key: "new", product_id: "p3", product_name: "Paani", unit: "bottle", qty: "4", remark: "Thanda" }];
    expect(submissionItems(draft).map((item) => [item.product_name, item.position, item.quantity])).toEqual([
      ["Purana item", 1, 2], ["Chai", 2, 3], ["Paani", 3, 4],
    ]);
  });
  it("exports only supplied orders with their saved item sequence and remarks", () => {
    const order: OrderRow = { id: "order-1", stall_id: "stall-1", user_id: "user-1", created_at: "2026-11-03T03:00:00Z", status: "pending", note: "Jaldi", stalls: { name: "Stall 1" }, order_items: saved.map((item) => ({ ...item, order_id: "order-1" })) };
    const rows = exportRows([order]);
    expect(rows.map((row) => [row[0], row[1], ...row.slice(4)])).toEqual([
      ["order-1", "Stall 1", 1, "Purana item", 2, "box", "", "Jaldi"],
      ["order-1", "Stall 1", 2, "Chai", 3, "cup", "Kam chini", "Jaldi"],
    ]);
  });
});