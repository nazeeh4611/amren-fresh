import { Router } from "express";
import { listProducts, createProduct, updateProduct, archiveProduct } from "../controllers/productController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createProductSchema, updateProductSchema } from "../validation/product";

const router = Router();

router.get("/", requireAuth, listProducts);
router.post("/", requireAuth, requireRole("ADMIN"), validateBody(createProductSchema), createProduct);
router.patch("/:id", requireAuth, requireRole("ADMIN"), validateBody(updateProductSchema), updateProduct);
router.delete("/:id", requireAuth, requireRole("ADMIN"), archiveProduct);

export default router;
