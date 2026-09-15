import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDB, teardownTestDB, clearTestDB } from "./testUtils";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { createOrder, updateOrderItems } from "../services/orderService";
import { ApiError } from "../utils/apiResponse";
import { aedToFils } from "../utils/money";

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearTestDB);

async function makeCustomer(shopId = "AMR001") {
  const user = await User.create({ role: "CUSTOMER", shopId, pinHash: "x", isActive: true });
  await Customer.create({ userId: user._id, shopName: `${shopId} Grocery`, phone: "0501111111" });
  return user;
}

async function makeProduct(overrides: Partial<{ name: string; price: number; unit: string; isAvailable: boolean; isVisible: boolean; allowDecimalQuantity: boolean }> = {}) {
  const category = await Category.create({ name: "Vegetables", sortOrder: 1 });
  return Product.create({
    name: overrides.name ?? "Tomato",
    categoryId: category._id,
    priceFils: aedToFils(overrides.price ?? 3),
    unit: overrides.unit ?? "KG",
    isAvailable: overrides.isAvailable ?? true,
    isVisible: overrides.isVisible ?? true,
    allowDecimalQuantity: overrides.allowDecimalQuantity ?? true,
  });
}

describe("createOrder", () => {
  it("creates an order and snapshots current price/name/shop info", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ price: 3 });

    const order = await createOrder(customer._id.toString(), "key-1", [
      { productId: product._id.toString(), quantity: 10 },
    ]);

    expect(order.items[0].unitPriceFils).toBe(300);
    expect(order.items[0].totalFils).toBe(3000);
    expect(order.shopNameSnapshot).toBe("AMR001 Grocery");
    expect(order.status).toBe("NEW");
  });

  it("rejects ordering an out-of-stock product", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ isAvailable: false });

    await expect(
      createOrder(customer._id.toString(), "key-1", [{ productId: product._id.toString(), quantity: 1 }])
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects ordering a hidden product", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ isVisible: false });

    await expect(
      createOrder(customer._id.toString(), "key-1", [{ productId: product._id.toString(), quantity: 1 }])
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects a decimal quantity for a product that doesn't allow it", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ allowDecimalQuantity: false, unit: "BOX" });

    await expect(
      createOrder(customer._id.toString(), "key-1", [{ productId: product._id.toString(), quantity: 2.5 }])
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects a zero or negative quantity", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct();
    await expect(
      createOrder(customer._id.toString(), "key-1", [{ productId: product._id.toString(), quantity: 0 }])
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("prevents duplicate orders from a repeated idempotency key (double-tap protection)", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct();

    const first = await createOrder(customer._id.toString(), "same-key", [
      { productId: product._id.toString(), quantity: 5 },
    ]);
    const second = await createOrder(customer._id.toString(), "same-key", [
      { productId: product._id.toString(), quantity: 5 },
    ]);

    expect(first._id.toString()).toBe(second._id.toString());
    const count = await Order.countDocuments({ customerId: customer._id });
    expect(count).toBe(1);
  });

  it("ignores a client-supplied price and always uses the current product price", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ price: 3 });

    // requestedItems only ever carries productId/quantity - there is no price
    // field to tamper with, but we assert the server-computed price is used.
    const order = await createOrder(customer._id.toString(), "key-1", [
      { productId: product._id.toString(), quantity: 1 },
    ]);
    expect(order.items[0].unitPriceFils).toBe(300);
  });
});

describe("updateOrderItems", () => {
  it("allows editing a NEW order", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct({ price: 3 });
    const order = await createOrder(customer._id.toString(), "key-1", [
      { productId: product._id.toString(), quantity: 5 },
    ]);

    const updated = await updateOrderItems(order._id.toString(), customer._id.toString(), [
      { productId: product._id.toString(), quantity: 10 },
    ]);
    expect(updated.totalFils).toBe(3000);
  });

  it("rejects editing a COMPLETED order", async () => {
    const customer = await makeCustomer();
    const product = await makeProduct();
    const order = await createOrder(customer._id.toString(), "key-1", [
      { productId: product._id.toString(), quantity: 5 },
    ]);
    await Order.updateOne({ _id: order._id }, { status: "COMPLETED" });

    await expect(
      updateOrderItems(order._id.toString(), customer._id.toString(), [
        { productId: product._id.toString(), quantity: 1 },
      ])
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects editing another customer's order", async () => {
    const customerA = await makeCustomer("AMR001");
    const customerB = await makeCustomer("AMR002");
    const product = await makeProduct();
    const order = await createOrder(customerA._id.toString(), "key-1", [
      { productId: product._id.toString(), quantity: 5 },
    ]);

    await expect(
      updateOrderItems(order._id.toString(), customerB._id.toString(), [
        { productId: product._id.toString(), quantity: 1 },
      ])
    ).rejects.toBeInstanceOf(ApiError);
  });
});
