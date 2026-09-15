import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { setupTestDB, teardownTestDB, clearTestDB } from "./testUtils";
import { createApp } from "../app";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { signToken } from "../utils/jwt";
import { createOrder } from "../services/orderService";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { aedToFils } from "../utils/money";

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearTestDB);

const app = createApp();

async function makeCustomer(shopId: string, shopName: string) {
  const user = await User.create({ role: "CUSTOMER", shopId, pinHash: "x", isActive: true });
  await Customer.create({ userId: user._id, shopName, phone: "0501111111" });
  return user;
}

async function makeAdmin(adminId = "admin") {
  return User.create({ role: "ADMIN", adminId, passwordHash: "x", isActive: true });
}

describe("permissions", () => {
  it("customer cannot access another customer's order", async () => {
    const customerA = await makeCustomer("AMR001", "ABC Grocery");
    const customerB = await makeCustomer("AMR002", "XYZ Supermarket");
    const category = await Category.create({ name: "Vegetables" });
    const product = await Product.create({ name: "Tomato", categoryId: category._id, priceFils: 300, unit: "KG" });
    const order = await createOrder(customerA._id.toString(), "k1", [{ productId: product._id.toString(), quantity: 1 }]);

    const tokenB = signToken({ userId: customerB._id.toString(), role: "CUSTOMER" });

    const res = await request(app)
      .get(`/api/orders/${order._id.toString()}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("customer cannot access admin-only endpoints", async () => {
    const customer = await makeCustomer("AMR001", "ABC Grocery");
    const token = signToken({ userId: customer._id.toString(), role: "CUSTOMER" });

    const res = await request(app).get("/api/customers").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("admin can access any customer's order", async () => {
    const customer = await makeCustomer("AMR001", "ABC Grocery");
    const admin = await makeAdmin();
    const category = await Category.create({ name: "Vegetables" });
    const product = await Product.create({ name: "Tomato", categoryId: category._id, priceFils: 300, unit: "KG" });
    const order = await createOrder(customer._id.toString(), "k1", [{ productId: product._id.toString(), quantity: 1 }]);

    const adminToken = signToken({ userId: admin._id.toString(), role: "ADMIN" });

    const res = await request(app)
      .get(`/api/orders/${order._id.toString()}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(order._id.toString());
  });

  it("rejects requests with no auth token", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("rejects requests with an invalid token", async () => {
    const res = await request(app).get("/api/orders").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});
