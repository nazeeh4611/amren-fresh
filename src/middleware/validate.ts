import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { fail } from "../utils/apiResponse";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors[0]?.message ?? "Invalid request.";
      return fail(res, message, 422);
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.errors[0]?.message ?? "Invalid request.";
      return fail(res, message, 422);
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
