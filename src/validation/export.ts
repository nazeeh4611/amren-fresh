import { z } from "zod";

export const invoiceExportQuerySchema = z.object({
  range: z.enum(["day", "week", "month", "year"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
  format: z.enum(["pdf", "excel"]),
});
