import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { ok } from "../utils/apiResponse";
import { customerLogin, adminLogin } from "../services/authService";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { ApiError } from "../utils/apiResponse";

export const postCustomerLogin = asyncHandler(async (req: Request, res: Response) => {
  const { shopId, pin } = req.body;
  const result = await customerLogin(shopId, pin);
  return ok(res, result);
});

export const postAdminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { adminId, password } = req.body;
  const result = await adminLogin(adminId, password);
  return ok(res, result);
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) throw new ApiError("Not found.", 404);

  if (user.role === "CUSTOMER") {
    const customer = await Customer.findOne({ userId: user._id });
    return ok(res, {
      id: user._id.toString(),
      role: user.role,
      shopId: user.shopId,
      shopName: customer?.shopName,
      phone: customer?.phone,
    });
  }

  return ok(res, { id: user._id.toString(), role: user.role, adminId: user.adminId });
});

export const postLogout = asyncHandler(async (_req: Request, res: Response) => {
  // JWTs are stateless; the client simply discards the token.
  return ok(res, { loggedOut: true });
});
