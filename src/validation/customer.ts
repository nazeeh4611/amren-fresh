import { z } from "zod";

export const createCustomerSchema = z.object({
  shopName: z.string().trim().min(1, "Shop name is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  shopId: z.string().trim().min(1, "Shop ID is required").toUpperCase(),
  pin: z.string().trim().min(4, "PIN must be at least 4 digits").max(8, "PIN is too long"),
});

export const updateCustomerSchema = z.object({
  shopName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  pin: z.string().trim().min(4).max(8).optional(),
});
