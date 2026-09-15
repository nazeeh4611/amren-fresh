import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { ok, ApiError } from "../utils/apiResponse";
import { Category } from "../models/Category";

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const filter = req.user?.role === "ADMIN" ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
  return ok(res, categories);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.create(req.body);
  return ok(res, category, 201);
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) throw new ApiError("Category not found.", 404);
  return ok(res, category);
});
