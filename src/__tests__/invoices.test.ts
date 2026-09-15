import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Types } from "mongoose";
import { setupTestDB, teardownTestDB, clearTestDB } from "./testUtils";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { Invoice } from "../models/Invoice";
import { createOrder } from "../services/orderService";
import { Product as ProductModel } from "../models/Product";
import { aedToFils } from "../utils/money";

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearTestDB);

async function makeCustomer(shopId: string, shopName: string) {
  const user = await User.create({ role: "CUSTOMER", shopId, pinHash: "x", isActive: true });
  await Customer.create({ userId: user._id, shopName, phone: "0501111111" });
  return user;
}

async function makeProduct(name: string, price: number, unit = "KG") {
  const category = await Category.create({ name: "Vegetables", sortOrder: 1 });
  return Product.create({
    name,
    categoryId: category._id,
    priceFils: aedToFils(price),
    unit,
    allowDecimalQuantity: true,
  });
}

describe("daily invoice aggregation", () => {
  it("creates one invoice from a single order", async () => {
    const customer = await makeCustomer("AMR001", "ABC Grocery");
    const tomato = await makeProduct("Tomato", 3);

    await createOrder(customer._id.toString(), "k1", [{ productId: tomato._id.toString(), quantity: 10 }]);

    const invoices = await Invoice.find({ customerId: customer._id });
    expect(invoices).toHaveLength(1);
    expect(invoices[0].totalFils).toBe(3000);
    expect(invoices[0].invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/);
  });

  it("aggregates multiple orders from the same shop on the same day into one invoice", async () => {
    const customer = await makeCustomer("AMR001", "ABC Grocery");
    const tomato = await makeProduct("Tomato", 3);

    await createOrder(customer._id.toString(), "k1", [{ productId: tomato._id.toString(), quantity: 10 }]);
    await createOrder(customer._id.toString(), "k2", [{ productId: tomato._id.toString(), quantity: 20 }]);

    const invoices = await Invoice.find({ customerId: customer._id });
    expect(invoices).toHaveLength(1);
    expect(invoices[0].items).toHaveLength(1);
    expect(invoices[0].items[0].quantity).toBe(30);
    expect(invoices[0].items[0].totalFils).toBe(9000);
    expect(invoices[0].orderIds).toHaveLength(2);
  });

  it("creates separate invoices for different shops on the same day", async () => {
    const abc = await makeCustomer("AMR001", "ABC Grocery");
    const xyz = await makeCustomer("AMR002", "XYZ Supermarket");
    const tomato = await makeProduct("Tomato", 3);

    await createOrder(abc._id.toString(), "k1", [{ productId: tomato._id.toString(), quantity: 10 }]);
    await createOrder(xyz._id.toString(), "k2", [{ productId: tomato._id.toString(), quantity: 5 }]);

    const invoices = await Invoice.find({});
    expect(invoices).toHaveLength(2);
    const shopNames = invoices.map((i) => i.shopName).sort();
    expect(shopNames).toEqual(["ABC Grocery", "XYZ Supermarket"]);
  });

  it("creates separate invoices for the same shop on different business dates", async () => {
    const customer = await makeCustomer("AMR001", "ABC Grocery");
    const tomato = await makeProduct("Tomato", 3);

    // Simulate two different UAE business dates directly (createOrder always
    // uses "today"; the aggregation/uniqueness logic is exercised via the
    // Order model + syncInvoiceForBusinessDate directly here).
    const { syncInvoiceForBusinessDate } = await import("../services/invoiceService");
    const { Order } = await import("../models/Order");

    await Order.create({
      orderNumber: 1001,
      customerId: customer._id,
      shopNameSnapshot: "ABC Grocery",
      shopPhoneSnapshot: "0501111111",
      items: [{ productId: tomato._id, productName: "Tomato", unit: "KG", quantity: 10, unitPriceFils: 300, totalFils: 3000 }],
      totalFils: 3000,
      status: "NEW",
      businessDate: "2026-09-08",
      idempotencyKey: "d1",
    });
    await Order.create({
      orderNumber: 1002,
      customerId: customer._id,
      shopNameSnapshot: "ABC Grocery",
      shopPhoneSnapshot: "0501111111",
      items: [{ productId: tomato._id, productName: "Tomato", unit: "KG", quantity: 8, unitPriceFils: 300, totalFils: 2400 }],
      totalFils: 2400,
      status: "NEW",
      businessDate: "2026-09-09",
      idempotencyKey: "d2",
    });

    await syncInvoiceForBusinessDate(customer._id as Types.ObjectId, "2026-09-08", "ABC Grocery", "0501111111");
    await syncInvoiceForBusinessDate(customer._id as Types.ObjectId, "2026-09-09", "ABC Grocery", "0501111111");

    const invoices = await Invoice.find({ customerId: customer._id }).sort({ businessDate: 1 });
    expect(invoices).toHaveLength(2);
    expect(invoices[0].businessDate).toBe("2026-09-08");
    expect(invoices[0].totalFils).toBe(3000);
    expect(invoices[1].businessDate).toBe("2026-09-09");
    expect(invoices[1].totalFils).toBe(2400);
  });

  it("keeps a mid-day price change as separate invoice lines instead of mixing prices", async () => {
    const customer = await makeCustomer("AMR001", "ABC Grocery");
    const tomato = await makeProduct("Tomato", 3);

    await createOrder(customer._id.toString(), "k1", [{ productId: tomato._id.toString(), quantity: 10 }]);

    await ProductModel.findByIdAndUpdate(tomato._id, { priceFils: aedToFils(4) });
    await createOrder(customer._id.toString(), "k2", [{ productId: tomato._id.toString(), quantity: 5 }]);

    const invoice = await Invoice.findOne({ customerId: customer._id });
    expect(invoice!.items).toHaveLength(2);
    const total = invoice!.items.reduce((sum, i) => sum + i.totalFils, 0);
    expect(total).toBe(invoice!.totalFils);
    expect(total).toBe(10 * 300 + 5 * 400);
  });

  it("reconciles the invoice total with the sum of its orders", async () => {
    const customer = await makeCustomer("AMR001", "ABC Grocery");
    const tomato = await makeProduct("Tomato", 3);
    const potato = await makeProduct("Potato", 2);

    await createOrder(customer._id.toString(), "k1", [
      { productId: tomato._id.toString(), quantity: 10 },
      { productId: potato._id.toString(), quantity: 5 },
    ]);
    await createOrder(customer._id.toString(), "k2", [{ productId: tomato._id.toString(), quantity: 2 }]);

    const invoice = await Invoice.findOne({ customerId: customer._id });
    const { Order } = await import("../models/Order");
    const orders = await Order.find({ customerId: customer._id });
    const ordersTotal = orders.reduce((sum, o) => sum + o.totalFils, 0);

    expect(invoice!.totalFils).toBe(ordersTotal);
  });
});
