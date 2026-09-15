import { z } from "zod";

export const productUnits = ["KG", "BOX", "CARTON", "PIECE", "PACK", "BAG"] as const;

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  categoryId: z.string().min(1, "Category is required"),
  imageUrl: z.string().trim().optional(),
  price: z.number().nonnegative("Price must be zero or more"),
  unit: z.string().trim().min(1, "Unit is required"),
  allowDecimalQuantity: z.boolean().optional().default(false),
  isAvailable: z.boolean().optional().default(true),
  isVisible: z.boolean().optional().default(true),
  sortOrder: z.number().optional().default(0),
  searchKeywords: z.array(z.string()).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  imageUrl: z.string().trim().optional(),
  sortOrder: z.number().optional().default(0),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});
