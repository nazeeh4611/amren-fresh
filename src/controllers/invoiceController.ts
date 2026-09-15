import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { ok, ApiError } from "../utils/apiResponse";
import { Invoice } from "../models/Invoice";
import { generateInvoicePdf } from "../services/pdfService";
import { generateInvoiceExcelReport, generateInvoiceListPdf } from "../services/exportService";
import { computeDateRange, formatRangeLabel, type ExportRange } from "../utils/dateRange";
import { getPageParams } from "../utils/pagination";

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const { date, shopName, invoiceNumber } = req.query as {
    date?: string;
    shopName?: string;
    invoiceNumber?: string;
  };
  const filter: Record<string, unknown> = {};

  if (req.user!.role === "CUSTOMER") {
    filter.customerId = req.user!.userId;
  } else {
    if (shopName) filter.shopName = { $regex: escapeRegex(shopName), $options: "i" };
    if (invoiceNumber) filter.invoiceNumber = { $regex: escapeRegex(invoiceNumber), $options: "i" };
  }

  if (date) filter.businessDate = date;

  const { limit, skip, page } = getPageParams(req);
  const [invoices, total] = await Promise.all([
    Invoice.find(filter).sort({ businessDate: -1, shopName: 1 }).skip(skip).limit(limit),
    Invoice.countDocuments(filter),
  ]);

  res.setHeader("X-Total-Count", String(total));
  res.setHeader("X-Page", String(page));
  res.setHeader("X-Has-More", String(skip + invoices.length < total));
  return ok(res, invoices);
});

export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError("Invoice not found.", 404);
  if (req.user!.role === "CUSTOMER" && invoice.customerId.toString() !== req.user!.userId) {
    throw new ApiError("You do not have permission to do this.", 403);
  }
  return ok(res, invoice);
});

export const getInvoicePdfById = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError("Invoice not found.", 404);
  if (req.user!.role === "CUSTOMER" && invoice.customerId.toString() !== req.user!.userId) {
    throw new ApiError("You do not have permission to do this.", 403);
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  const doc = generateInvoicePdf(invoice);
  doc.pipe(res);
});

export const exportInvoices = asyncHandler(async (req: Request, res: Response) => {
  const { range, date, format } = req.query as unknown as {
    range: ExportRange;
    date: string;
    format: "pdf" | "excel";
  };

  const { start, end } = computeDateRange(range, date);
  const invoices = await Invoice.find({ businessDate: { $gte: start, $lte: end } }).sort({
    businessDate: 1,
    shopName: 1,
  });

  const rangeLabel = formatRangeLabel(range, start, end);
  const filenameSafeLabel = `${range}-${start}${start !== end ? `_to_${end}` : ""}`;

  if (format === "excel") {
    const buffer = await generateInvoiceExcelReport(invoices, rangeLabel);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="invoices-${filenameSafeLabel}.xlsx"`);
    return res.send(Buffer.from(buffer));
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoices-${filenameSafeLabel}.pdf"`);
  const doc = generateInvoiceListPdf(invoices, rangeLabel);
  doc.pipe(res);
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
