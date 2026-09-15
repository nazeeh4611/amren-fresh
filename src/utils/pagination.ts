import type { Request } from "express";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

/** Parses ?page=&limit= query params with safe defaults/bounds - never
 *  trusts the client for an unbounded page size. */
export function getPageParams(req: Request): PageParams {
  const rawPage = parseInt(String(req.query.page ?? "1"), 10);
  const rawLimit = parseInt(String(req.query.limit ?? String(DEFAULT_LIMIT)), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  return { page, limit, skip: (page - 1) * limit };
}
