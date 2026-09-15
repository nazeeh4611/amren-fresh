import { connectDB, disconnectDB } from "../config/db";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { hashSecret } from "../services/authService";
import { aedToFils } from "../utils/money";

async function seed() {
  await connectDB();

  console.log("[seed] clearing existing dev collections...");
  await Promise.all([
    User.deleteMany({}),
    Customer.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
  ]);

  console.log("[seed] creating admin account...");
  const adminPasswordHash = await hashSecret("Admin@123");
  await User.create({ role: "ADMIN", adminId: "admin", passwordHash: adminPasswordHash, isActive: true });

  console.log("[seed] creating categories...");
  const [vegetables, fruits, plastic] = await Category.create([
    { name: "Vegetables", sortOrder: 1 },
    { name: "Fruits", sortOrder: 2 },
    { name: "Plastic", sortOrder: 3 },
  ]);

  console.log("[seed] creating products...");
  await Product.create([
    { name: "Tomato", categoryId: vegetables._id, priceFils: aedToFils(3), unit: "KG", allowDecimalQuantity: true, sortOrder: 1, searchKeywords: ["tomato", "tamatar"] },
    { name: "Potato", categoryId: vegetables._id, priceFils: aedToFils(3), unit: "KG", allowDecimalQuantity: true, sortOrder: 2, searchKeywords: ["potato", "aloo"] },
    { name: "Onion", categoryId: vegetables._id, priceFils: aedToFils(2.5), unit: "KG", allowDecimalQuantity: true, sortOrder: 3, searchKeywords: ["onion", "pyaz"] },
    { name: "Carrot", categoryId: vegetables._id, priceFils: aedToFils(4), unit: "KG", allowDecimalQuantity: true, sortOrder: 4 },
    { name: "Banana", categoryId: fruits._id, priceFils: aedToFils(15), unit: "BOX", sortOrder: 1 },
    { name: "Apple", categoryId: fruits._id, priceFils: aedToFils(25), unit: "BOX", sortOrder: 2 },
    { name: "Orange", categoryId: fruits._id, priceFils: aedToFils(20), unit: "BOX", sortOrder: 3 },
    { name: "Plastic Bags", categoryId: plastic._id, priceFils: aedToFils(12), unit: "PACK", sortOrder: 1 },
    { name: "Plastic Containers", categoryId: plastic._id, priceFils: aedToFils(30), unit: "CARTON", sortOrder: 2 },
  ]);

  console.log("[seed] creating sample customers...");
  const customers = [
    { shopId: "AMR001", shopName: "ABC Grocery", phone: "0501111111", pin: "1234" },
    { shopId: "AMR002", shopName: "XYZ Supermarket", phone: "0502222222", pin: "1234" },
    { shopId: "AMR003", shopName: "Fresh Mart", phone: "0503333333", pin: "1234" },
  ];
  for (const c of customers) {
    const pinHash = await hashSecret(c.pin);
    const user = await User.create({ role: "CUSTOMER", shopId: c.shopId, pinHash, isActive: true });
    await Customer.create({ userId: user._id, shopName: c.shopName, phone: c.phone });
  }

  console.log("[seed] done.");
  console.log("[seed] Admin login: adminId=admin password=Admin@123");
  console.log("[seed] Customer logins: AMR001/1234, AMR002/1234, AMR003/1234");

  await disconnectDB();
}

seed().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
