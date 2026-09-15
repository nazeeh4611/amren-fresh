import { Router } from "express";
import { listInvoices, getInvoiceById, getInvoicePdfById, exportInvoices } from "../controllers/invoiceController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import { invoiceExportQuerySchema } from "../validation/export";

const router = Router();

router.use(requireAuth);
// Registered before "/:id" - otherwise Express would treat "export" as an
// invoice id and fail with an invalid-ObjectId error.
router.get("/export", requireRole("ADMIN"), validateQuery(invoiceExportQuerySchema), exportInvoices);
router.get("/", listInvoices);
router.get("/:id", getInvoiceById);
router.get("/:id/pdf", getInvoicePdfById);

export default router;
