import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { ok, ApiError } from "../utils/apiResponse";
import { Order } from "../models/Order";
import { createOrder, updateOrderItems, markOrderCompleted } from "../services/orderService";
import { getPageParams } from "../utils/pagination";

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, search } = req.query as { status?: string; search?: string };
  const filter: Record<string, unknown> = {};

  if (req.user!.role === "CUSTOMER") {
    filter.customerId = req.user!.userId;
  } else if (search && search.trim()) {
    const s = search.trim();
    const asNumber = Number(s);
    filter.$or = [
      { shopNameSnapshot: { $regex: escapeRegex(s), $options: "i" } },
      ...(Number.isFinite(asNumber) ? [{ orderNumber: asNumber }] : []),
    ];
  }

  if (status === "NEW" || status === "COMPLETED") filter.status = status;

  const { limit, skip, page } = getPageParams(req);
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.setHeader("X-Total-Count", String(total));
  res.setHeader("X-Page", String(page));
  res.setHeader("X-Has-More", String(skip + orders.length < total));
  return ok(res, orders);
});

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError("Order not found.", 404);
  if (req.user!.role === "CUSTOMER" && order.customerId.toString() !== req.user!.userId) {
    throw new ApiError("You do not have permission to do this.", 403);
  }
  return ok(res, order);
});

export const postOrder = asyncHandler(async (req: Request, res: Response) => {
  const { idempotencyKey, items, notes } = req.body;
  const order = await createOrder(req.user!.userId, idempotencyKey, items, notes);
  return ok(res, order, 201);
});

export const patchOrder = asyncHandler(async (req: Request, res: Response) => {
  const { items, notes } = req.body;
  const order = await updateOrderItems(req.params.id, req.user!.userId, items, notes);
  return ok(res, order);
});

export const patchOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await markOrderCompleted(req.params.id);
  return ok(res, order);
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
