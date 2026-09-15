import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { ok } from "../utils/apiResponse";
import { Order } from "../models/Order";
import { Invoice } from "../models/Invoice";
import { getUaeBusinessDate } from "../utils/timezone";

export const getDashboardSummary = asyncHandler(async (_req: Request, res: Response) => {
  const today = getUaeBusinessDate();

  const [newOrders, completedOrders, invoicesToday, todaysInvoices] = await Promise.all([
    Order.countDocuments({ businessDate: today, status: "NEW" }),
    Order.countDocuments({ businessDate: today, status: "COMPLETED" }),
    Invoice.countDocuments({ businessDate: today }),
    Invoice.find({ businessDate: today }).select("totalFils"),
  ]);

  const todaysSalesFils = todaysInvoices.reduce((sum, inv) => sum + inv.totalFils, 0);

  return ok(res, {
    date: today,
    newOrders,
    completedOrders,
    invoicesToday,
    todaysSalesFils,
  });
});
