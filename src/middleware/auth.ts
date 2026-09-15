import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { fail } from "../utils/apiResponse";
import type { UserRole } from "../models/User";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { userId: string; role: UserRole };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return fail(res, "Your session has expired. Please log in again.", 401);
  }
  try {
    const token = header.slice("Bearer ".length);
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    return fail(res, "Your session has expired. Please log in again.", 401);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, "You do not have permission to do this.", 403);
    }
    next();
  };
}
