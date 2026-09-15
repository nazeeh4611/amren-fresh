import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { IInvoice } from "../models/Invoice";
import { filsToAed, formatAED } from "../utils/money";
import { formatUaeDateDisplay } from "../utils/timezone";

export async function generateInvoiceExcelReport(invoices: IInvoice[], rangeLabel: string): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AMREN Fresh";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Invoice #", key: "invoiceNumber", width: 18 },
    { header: "Shop", key: "shop", width: 26 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Total (AED)", key: "total", width: 14 },
  ];
  summarySheet.getRow(1).font = { bold: true };

  let grandTotalFils = 0;
  for (const invoice of invoices) {
    summarySheet.addRow({
      date: formatUaeDateDisplay(invoice.businessDate),
      invoiceNumber: invoice.invoiceNumber,
      shop: invoice.shopName,
      phone: invoice.shopPhone,
      total: filsToAed(invoice.totalFils),
    });
    grandTotalFils += invoice.totalFils;
  }
  summarySheet.getColumn("total").numFmt = "#,##0.00";

  const totalRow = summarySheet.addRow({ shop: "GRAND TOTAL", total: filsToAed(grandTotalFils) });
  totalRow.font = { bold: true };

  const itemsSheet = workbook.addWorksheet("Line Items");
  itemsSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Invoice #", key: "invoiceNumber", width: 18 },
    { header: "Shop", key: "shop", width: 26 },
    { header: "Product", key: "product", width: 24 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Unit Price (AED)", key: "unitPrice", width: 16 },
    { header: "Line Total (AED)", key: "lineTotal", width: 16 },
  ];
  itemsSheet.getRow(1).font = { bold: true };

  for (const invoice of invoices) {
    for (const item of invoice.items) {
      itemsSheet.addRow({
        date: formatUaeDateDisplay(invoice.businessDate),
        invoiceNumber: invoice.invoiceNumber,
        shop: invoice.shopName,
        product: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: filsToAed(item.unitPriceFils),
        lineTotal: filsToAed(item.totalFils),
      });
    }
  }
  itemsSheet.getColumn("unitPrice").numFmt = "#,##0.00";
  itemsSheet.getColumn("lineTotal").numFmt = "#,##0.00";

  return workbook.xlsx.writeBuffer();
}

export function generateInvoiceListPdf(invoices: IInvoice[], rangeLabel: string): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  doc.fontSize(18).text("AMREN FRESH", { align: "left" });
  doc.fontSize(10).fillColor("#555").text("Wholesale Fruits, Vegetables & Plastic Products");
  doc.moveDown(0.5);
  doc.fillColor("#000").fontSize(13).text(`Invoice Report: ${rangeLabel}`);
  doc.fontSize(10).fillColor("#555").text(`${invoices.length} invoice(s)`);
  doc.moveDown(1);
  doc.fillColor("#000");

  const colDate = 50;
  const colInvoice = 130;
  const colShop = 260;
  const colTotal = 470;
  const rowHeight = 20;
  const bottomMargin = 780;

  function drawHeader(): number {
    const y = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Date", colDate, y);
    doc.text("Invoice #", colInvoice, y);
    doc.text("Shop", colShop, y);
    doc.text("Total", colTotal, y);
    doc.font("Helvetica");
    doc.moveTo(50, y + 16).lineTo(545, y + 16).stroke();
    return y + 24;
  }

  let y = drawHeader();
  let grandTotalFils = 0;

  for (const invoice of invoices) {
    if (y > bottomMargin) {
      doc.addPage();
      y = drawHeader();
    }
    doc.fontSize(10);
    doc.text(formatUaeDateDisplay(invoice.businessDate), colDate, y, { width: 75 });
    doc.text(invoice.invoiceNumber, colInvoice, y, { width: 120 });
    doc.text(invoice.shopName, colShop, y, { width: 200 });
    doc.text(formatAED(invoice.totalFils), colTotal, y);
    grandTotalFils += invoice.totalFils;
    y += rowHeight;
  }

  doc.moveTo(50, y + 4).lineTo(545, y + 4).stroke();
  y += 14;
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("GRAND TOTAL", colShop, y);
  doc.text(formatAED(grandTotalFils), colTotal, y);

  doc.end();
  return doc;
}
