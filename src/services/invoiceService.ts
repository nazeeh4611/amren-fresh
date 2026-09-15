import { Types } from "mongoose";
import { Invoice, IInvoiceItem } from "../models/Invoice";
import { Order, IOrder } from "../models/Order";
import { getNextSequence } from "../models/Counter";

/**
 * Invoices are recomputed from scratch from all of a customer's orders for a
 * given UAE business date, rather than incrementally patched. This keeps the
 * invoice always reconcilable with its orders (see spec section 55) and makes
 * concurrent order placement safe: whichever recompute writes last always
 * queries the freshest set of orders, and optimistic-concurrency retries
 * guarantee no write is based on stale data.
 */

function aggregateItemsFromOrders(orders: IOrder[]): IInvoiceItem[] {
  const lines = new Map<string, IInvoiceItem>();

  for (const order of orders) {
    for (const item of order.items) {
      // A distinct invoice line per (product, unit price) so a mid-day price
      // change never mixes two different prices into one quantity/total.
      const key = `${item.productId.toString()}:${item.unitPriceFils}`;
      const existing = lines.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.totalFils += item.totalFils;
      } else {
        lines.set(key, {
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          unitPriceFils: item.unitPriceFils,
          quantity: item.quantity,
          totalFils: item.totalFils,
        });
      }
    }
  }

  return Array.from(lines.values());
}

async function generateInvoiceNumber(businessDate: string): Promise<string> {
  const year = businessDate.slice(0, 4);
  const seq = await getNextSequence(`invoiceNumber:${year}`);
  return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

const MAX_RETRIES = 8;

/**
 * Recomputes and persists the single daily invoice for (customerId, businessDate)
 * from all orders that exist for that shop/day. Safe to call repeatedly and
 * concurrently - always converges to the correct aggregate.
 */
export async function syncInvoiceForBusinessDate(
  customerId: Types.ObjectId,
  businessDate: string,
  shopName: string,
  shopPhone: string
): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const orders = await Order.find({ customerId, businessDate }).lean();
    if (orders.length === 0) return;

    const items = aggregateItemsFromOrders(orders as unknown as IOrder[]);
    const totalFils = items.reduce((sum, i) => sum + i.totalFils, 0);
    const orderIds = orders.map((o) => o._id);

    const existing = await Invoice.findOne({ customerId, businessDate });

    if (!existing) {
      const invoiceNumber = await generateInvoiceNumber(businessDate);
      try {
        await Invoice.create({
          invoiceNumber,
          customerId,
          shopName,
          shopPhone,
          businessDate,
          orderIds,
          items,
          totalFils,
        });
        return;
      } catch (err: unknown) {
        // Another concurrent request created the invoice first - retry, this
        // time we will find it via findOne above and fall into the update path.
        if (isDuplicateKeyError(err)) continue;
        throw err;
      }
    }

    existing.orderIds = orderIds;
    existing.items = items;
    existing.totalFils = totalFils;
    try {
      await existing.save(); // optimistic concurrency guards against a stale overwrite
      return;
    } catch (err: unknown) {
      if (isVersionError(err)) continue;
      throw err;
    }
  }

  throw new Error(`Failed to sync invoice for customer ${customerId} on ${businessDate} after ${MAX_RETRIES} attempts`);
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

function isVersionError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "VersionError";
}
