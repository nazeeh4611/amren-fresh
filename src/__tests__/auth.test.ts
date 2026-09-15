import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDB, teardownTestDB, clearTestDB } from "./testUtils";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { hashSecret, customerLogin, adminLogin } from "../services/authService";
import { ApiError } from "../utils/apiResponse";

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearTestDB);

async function createCustomerUser(shopId: string, pin: string, isActive = true) {
  const pinHash = await hashSecret(pin);
  const user = await User.create({ role: "CUSTOMER", shopId, pinHash, isActive });
  await Customer.create({ userId: user._id, shopName: "ABC Grocery", phone: "0501111111" });
  return user;
}

describe("customer login", () => {
  it("succeeds with the correct Shop ID and PIN", async () => {
    await createCustomerUser("AMR001", "1234");
    const result = await customerLogin("AMR001", "1234");
    expect(result.token).toBeTruthy();
    expect(result.user.shopName).toBe("ABC Grocery");
  });

  it("rejects an incorrect PIN", async () => {
    await createCustomerUser("AMR001", "1234");
    await expect(customerLogin("AMR001", "9999")).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects an unknown Shop ID", async () => {
    await expect(customerLogin("AMR999", "1234")).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects an inactive shop even with the correct PIN", async () => {
    await createCustomerUser("AMR001", "1234", false);
    await expect(customerLogin("AMR001", "1234")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("admin login", () => {
  it("succeeds with the correct admin credentials", async () => {
    const passwordHash = await hashSecret("Admin@123");
    await User.create({ role: "ADMIN", adminId: "admin", passwordHash, isActive: true });
    const result = await adminLogin("admin", "Admin@123");
    expect(result.token).toBeTruthy();
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await hashSecret("Admin@123");
    await User.create({ role: "ADMIN", adminId: "admin", passwordHash, isActive: true });
    await expect(adminLogin("admin", "wrong")).rejects.toBeInstanceOf(ApiError);
  });
});
