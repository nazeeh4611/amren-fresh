import { Types } from "mongoose";
import { Order, IOrder, IOrderItem } from "../models/Order";
import { Product } from "../models/Product";
import { Customer } from "../models/Customer";
import { getNextSequence } from "../models/Counter";
import { ApiError } from "../utils/apiResponse";
import { getUaeBusinessDate } from "../utils/timezone";
import { calculateLineTotalFils, formatAED } from "../utils/money";
import { syncInvoiceForBusinessDate } from "./invoiceService";
import { notifyAdminsOfNewOrder } from "./pushNotificationService";

interface RequestedItem {
  productId: string;
  quantity: number;
}

/**
 * Re-prices requested items from the database. Never trusts a price or total
 * coming from the client (spec section 59/95).
 */
async function buildOrderItems(requested: RequestedItem[]): Promise<IOrderItem[]> {
  const productIds = requested.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const items: IOrderItem[] = [];
  for (const req of requested) {
    const product = productMap.get(req.productId);
    if (!product || product.isArchived || !product.isVisible) {
      throw new ApiError("One of the selected products is no longer available.", 422);
    }
    if (!product.isAvailable) {
      throw new ApiError(`${product.name} is currently unavailable.`, 422);
    }
    if (!product.allowDecimalQuantity && !Number.isInteger(req.quantity)) {
      throw new ApiError(`${product.name} does not support decimal quantities.`, 422);
    }
    if (req.quantity <= 0) {
      throw new ApiError("Quantity must be greater than zero.", 422);
    }

    const unitPriceFils = product.priceFils;
    const totalFils = calculateLineTotalFils(req.quantity, unitPriceFils);

    items.push({
      productId: product._id,
      productName: product.name,
      unit: product.unit,
      quantity: req.quantity,
      unitPriceFils,
      totalFils,
    });
  }
  return items;
}

export async function createOrder(
  customerUserId: string,
  idempotencyKey: string,
  requestedItems: RequestedItem[],
  notes?: string
): Promise<IOrder> {
  const existing = await Order.findOne({ customerId: customerUserId, idempotencyKey });
  if (existing) return existing;

  const customer = await Customer.findOne({ userId: customerUserId });
  if (!customer) throw new ApiError("Shop profile not found.", 404);

  const items = await buildOrderItems(requestedItems);
  const totalFils = items.reduce((sum, i) => sum + i.totalFils, 0);
  const businessDate = getUaeBusinessDate();
  const orderNumber = await getNextSequence("orderNumber");

  let order: IOrder;
  try {
    order = await Order.create({
      orderNumber,
      customerId: customerUserId,
      shopNameSnapshot: customer.shopName,
      shopPhoneSnapshot: customer.phone,
      items,
      totalFils,
      status: "NEW",
      businessDate,
      idempotencyKey,
      notes,
    });
  } catch (err: unknown) {
    // Concurrent duplicate submission with the same idempotency key.
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
      const raceWinner = await Order.findOne({ customerId: customerUserId, idempotencyKey });
      if (raceWinner) return raceWinner;
    }
    throw err;
  }

  await syncInvoiceForBusinessDate(
    new Types.ObjectId(customerUserId),
    businessDate,
    customer.shopName,
    customer.phone
  );

  notifyAdminsOfNewOrder(customer.shopName, order.orderNumber, formatAED(order.totalFils)).catch(() => {
    /* best-effort */
  });

  return order;
}

export async function updateOrderItems(
  orderId: string,
  customerUserId: string,
  requestedItems: RequestedItem[],
  notes?: string
): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError("Order not found.", 404);
  if (order.customerId.toString() !== customerUserId) {
    throw new ApiError("You do not have permission to do this.", 403);
  }
  if (order.status === "COMPLETED") {
    throw new ApiError("This order can no longer be edited.", 422);
  }

  const customer = await Customer.findOne({ userId: customerUserId });
  if (!customer) throw new ApiError("Shop profile not found.", 404);

  const items = await buildOrderItems(requestedItems);
  const totalFils = items.reduce((sum, i) => sum + i.totalFils, 0);

  order.items = items;
  order.totalFils = totalFils;
  if (notes !== undefined) order.notes = notes;
  await order.save();

  await syncInvoiceForBusinessDate(
    new Types.ObjectId(customerUserId),
    order.businessDate,
    customer.shopName,
    customer.phone
  );

  return order;
}

export async function markOrderCompleted(orderId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError("Order not found.", 404);
  if (order.status === "COMPLETED") return order;
  order.status = "COMPLETED";
  await order.save();
  return order;
}
