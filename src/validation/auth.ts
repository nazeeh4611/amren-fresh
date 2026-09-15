import { z } from "zod";

export const customerLoginSchema = z.object({
  shopId: z.string().trim().min(1, "Shop ID is required").toUpperCase(),
  pin: z.string().trim().min(4, "PIN must be at least 4 digits").max(8, "PIN is too long"),
});

export const adminLoginSchema = z.object({
  adminId: z.string().trim().min(1, "Admin ID is required"),
  password: z.string().min(1, "Password is required"),
});
