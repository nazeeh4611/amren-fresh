import PDFDocument from "pdfkit";
import type { IInvoice } from "../models/Invoice";
import { formatAED } from "../utils/money";
import { formatUaeDateDisplay } from "../utils/timezone";

export function generateInvoicePdf(invoice: IInvoice): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  doc.fontSize(20).text("AMREN FRESH", { align: "left" });
  doc.fontSize(10).fillColor("#555").text("Wholesale Fruits, Vegetables & Plastic Products");
  doc.moveDown(1.5);

  doc.fillColor("#000").fontSize(12).text(`Invoice No: ${invoice.invoiceNumber}`);
  doc.text(`Date: ${formatUaeDateDisplay(invoice.businessDate)}`);
  doc.moveDown(1);

  doc.fontSize(11).text("SHOP", { underline: true });
  doc.fontSize(12).text(invoice.shopName);
  doc.text(invoice.shopPhone);
  doc.moveDown(1);

  const tableTop = doc.y;
  const colProduct = 50;
  const colQty = 300;
  const colAmount = 420;

  doc.fontSize(11).text("Product", colProduct, tableTop);
  doc.text("Qty", colQty, tableTop);
  doc.text("Amount", colAmount, tableTop);
  doc.moveTo(50, tableTop + 18).lineTo(545, tableTop + 18).stroke();

  let y = tableTop + 26;
  doc.fontSize(11);
  for (const item of invoice.items) {
    doc.text(item.productName, colProduct, y, { width: 240 });
    doc.text(`${trimQty(item.quantity)} ${item.unit}`, colQty, y);
    doc.text(formatAED(item.totalFils), colAmount, y);
    y += 20;
  }

  doc.moveTo(50, y + 4).lineTo(545, y + 4).stroke();
  y += 14;
  doc.fontSize(13).text("TOTAL", colProduct, y);
  doc.text(formatAED(invoice.totalFils), colAmount, y);

  doc.end();
  return doc;
}

function trimQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
