import { Router } from "express";
import { listCustomers, getCustomer, createCustomer, updateCustomer } from "../controllers/customerController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createCustomerSchema, updateCustomerSchema } from "../validation/customer";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));
router.get("/", listCustomers);
router.get("/:id", getCustomer);
router.post("/", validateBody(createCustomerSchema), createCustomer);
router.patch("/:id", validateBody(updateCustomerSchema), updateCustomer);

export default router;
