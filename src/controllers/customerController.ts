import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { ok, ApiError } from "../utils/apiResponse";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { hashSecret } from "../services/authService";

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query as { search?: string };
  const customers = await Customer.find(
    search ? { shopName: { $regex: escapeRegex(search), $options: "i" } } : {}
  ).sort({ shopName: 1 });

  const userIds = customers.map((c) => c.userId);
  const users = await User.find({ _id: { $in: userIds } });
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const result = customers.map((c) => ({
    id: c._id.toString(),
    userId: c.userId.toString(),
    shopName: c.shopName,
    phone: c.phone,
    shopId: userMap.get(c.userId.toString())?.shopId,
    isActive: userMap.get(c.userId.toString())?.isActive ?? false,
  }));

  return ok(res, result);
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError("Customer not found.", 404);
  const user = await User.findById(customer.userId);
  return ok(res, {
    id: customer._id.toString(),
    userId: customer.userId.toString(),
    shopName: customer.shopName,
    phone: customer.phone,
    shopId: user?.shopId,
    isActive: user?.isActive ?? false,
  });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { shopName, phone, shopId, pin } = req.body;

  const existing = await User.findOne({ shopId });
  if (existing) throw new ApiError("This Shop ID is already in use.", 409);

  const pinHash = await hashSecret(pin);
  const user = await User.create({ role: "CUSTOMER", shopId, pinHash, isActive: true });
  const customer = await Customer.create({
    userId: user._id,
    shopName,
    phone,
    createdBy: req.user!.userId,
    updatedBy: req.user!.userId,
  });

  return ok(res, { id: customer._id.toString(), shopId: user.shopId, shopName, phone, isActive: true }, 201);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError("Customer not found.", 404);

  const { shopName, phone, isActive, pin } = req.body;
  if (shopName !== undefined) customer.shopName = shopName;
  if (phone !== undefined) customer.phone = phone;
  customer.updatedBy = req.user!.userId as never;
  await customer.save();

  if (isActive !== undefined || pin) {
    const update: Record<string, unknown> = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (pin) update.pinHash = await hashSecret(pin);
    await User.findByIdAndUpdate(customer.userId, update);
  }

  return ok(res, { id: customer._id.toString(), shopName: customer.shopName, phone: customer.phone });
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
