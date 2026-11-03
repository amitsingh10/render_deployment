import type { OrderRow } from "@/components/app/data";
import { orderedItems } from "./order-draft";

export function exportRows(orders: OrderRow[]) {
  return orders.flatMap((order) => orderedItems(order.order_items).map((item, index) => [
    order.id, order.stalls?.name ?? "Stall", new Date(order.created_at), order.status,
    index + 1, item.product_name, item.quantity, item.unit, item.remark ?? "", order.note ?? "",
  ]));
}

export async function exportOrders(orders: OrderRow[]) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Orders");
  sheet.columns = [
    { header: "Order ID", width: 38 }, { header: "Stall", width: 24 },
    { header: "Date / Time", width: 23 }, { header: "Status", width: 14 },
    { header: "Serial No.", width: 12 }, { header: "Product", width: 30 },
    { header: "Quantity", width: 14 }, { header: "Unit", width: 12 },
    { header: "Item Remark", width: 36 }, { header: "Order Note", width: 36 },
  ];
  sheet.addRows(exportRows(orders));
  sheet.eachRow((row, rowNumber) => {
    row.font = { name: "Arial", size: 11, bold: rowNumber === 1 };
    row.alignment = { vertical: "top", wrapText: true };
  });
  sheet.getColumn(3).numFmt = "dd-mmm-yyyy hh:mm";
  sheet.getColumn(7).numFmt = '0.###';
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = "A1:J1";
  const bytes = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `Sswastik-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}