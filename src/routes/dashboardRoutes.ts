import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { getDashboardSummary } from "../controllers/dashboardController";

const router = Router();

router.get("/summary", requireAuth, requireRole("ADMIN"), getDashboardSummary);

export default router;
