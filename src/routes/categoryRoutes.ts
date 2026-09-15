import { Router } from "express";
import { listCategories, createCategory, updateCategory } from "../controllers/categoryController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "../validation/product";

const router = Router();

router.get("/", requireAuth, listCategories);
router.post("/", requireAuth, requireRole("ADMIN"), validateBody(createCategorySchema), createCategory);
router.patch("/:id", requireAuth, requireRole("ADMIN"), validateBody(updateCategorySchema), updateCategory);

export default router;
