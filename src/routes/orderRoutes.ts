import { Router } from "express";
import { listOrders, getOrderById, postOrder, patchOrder, patchOrderStatus } from "../controllers/orderController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createOrderSchema, updateOrderSchema, updateOrderStatusSchema } from "../validation/order";
import { orderCreationLimiter } from "../middleware/rateLimit";

const router = Router();

router.use(requireAuth);
router.get("/", listOrders);
router.get("/:id", getOrderById);
router.post("/", requireRole("CUSTOMER"), orderCreationLimiter, validateBody(createOrderSchema), postOrder);
router.patch("/:id", requireRole("CUSTOMER"), validateBody(updateOrderSchema), patchOrder);
router.patch("/:id/status", requireRole("ADMIN"), validateBody(updateOrderStatusSchema), patchOrderStatus);

export default router;
