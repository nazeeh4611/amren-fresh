import type { Request, Response, NextFunction } from "express";
import { ApiError, fail } from "../utils/apiResponse";

export function notFoundHandler(req: Request, res: Response) {
  return fail(res, "Not found.", 404);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    return fail(res, err.message, err.status);
  }
  // eslint-disable-next-line no-console
  console.error("[error]", err);
  return fail(res, "Something went wrong. Please try again.", 500);
}

export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
