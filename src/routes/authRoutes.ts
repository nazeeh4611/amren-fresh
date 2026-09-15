import { Router } from "express";
import { postCustomerLogin, postAdminLogin, getMe, postLogout } from "../controllers/authController";
import { validateBody } from "../middleware/validate";
import { customerLoginSchema, adminLoginSchema } from "../validation/auth";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/customer-login", authLimiter, validateBody(customerLoginSchema), postCustomerLogin);
router.post("/admin-login", authLimiter, validateBody(adminLoginSchema), postAdminLogin);
router.post("/logout", requireAuth, postLogout);
router.get("/me", requireAuth, getMe);

export default router;
