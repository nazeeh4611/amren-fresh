import { z } from "zod";

const notesSchema = z.string().trim().max(500, "Note is too long").optional();

export const createOrderSchema = z.object({
  idempotencyKey: z.string().trim().min(1, "Missing idempotency key"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive("Quantity must be greater than zero"),
      })
    )
    .min(1, "Order must contain at least one item"),
  notes: notesSchema,
});

export const updateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive("Quantity must be greater than zero"),
      })
    )
    .min(1, "Order must contain at least one item"),
  notes: notesSchema,
});

export const updateOrderStatusSchema = z.object({
  status: z.literal("COMPLETED"),
});
