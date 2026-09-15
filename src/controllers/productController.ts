import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { ok, ApiError } from "../utils/apiResponse";
import { Product } from "../models/Product";
import { aedToFils } from "../utils/money";

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user?.role === "ADMIN";
  const { search, categoryId } = req.query as { search?: string; categoryId?: string };

  const filter: Record<string, unknown> = isAdmin ? { isArchived: false } : { isVisible: true, isArchived: false };
  if (categoryId) filter.categoryId = categoryId;
  if (search && search.trim()) {
    filter.$or = [
      { name: { $regex: escapeRegex(search.trim()), $options: "i" } },
      { searchKeywords: { $regex: escapeRegex(search.trim()), $options: "i" } },
    ];
  }

  const products = await Product.find(filter).sort({ sortOrder: 1, name: 1 });
  return ok(res, products);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body;
  const product = await Product.create({
    ...body,
    priceFils: aedToFils(body.price),
    createdBy: req.user!.userId,
    updatedBy: req.user!.userId,
  });
  return ok(res, product, 201);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body;
  const update: Record<string, unknown> = { ...body, updatedBy: req.user!.userId };
  if (typeof body.price === "number") {
    update.priceFils = aedToFils(body.price);
    delete update.price;
  }
  const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!product) throw new ApiError("Product not found.", 404);
  return ok(res, product);
});

/** Soft delete: archived products are hidden from customers but preserved
 *  for historical order/invoice integrity (spec section 36/87). */
export const archiveProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isArchived: true, isVisible: false, updatedBy: req.user!.userId },
    { new: true }
  );
  if (!product) throw new ApiError("Product not found.", 404);
  return ok(res, product);
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
