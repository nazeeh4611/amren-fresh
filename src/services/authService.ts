import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { ApiError } from "../utils/apiResponse";
import { signToken } from "../utils/jwt";

const SALT_ROUNDS = 10;

// Shop owners should not have to repeatedly re-authenticate (spec section 5)
// - a customer session lasts a full year rather than the shorter default
// used for admin staff accounts.
const CUSTOMER_TOKEN_EXPIRY = "365d";

export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, SALT_ROUNDS);
}

export async function customerLogin(shopId: string, pin: string) {
  const user = await User.findOne({ role: "CUSTOMER", shopId });
  if (!user || !user.pinHash) {
    throw new ApiError("Incorrect Shop ID or PIN.", 401);
  }
  if (!user.isActive) {
    throw new ApiError("This account is inactive. Please contact AMREN Fresh.", 403);
  }
  const valid = await bcrypt.compare(pin, user.pinHash);
  if (!valid) {
    throw new ApiError("Incorrect Shop ID or PIN.", 401);
  }
  const customer = await Customer.findOne({ userId: user._id });
  if (!customer) {
    throw new ApiError("Shop profile not found.", 404);
  }
  const token = signToken({ userId: user._id.toString(), role: "CUSTOMER" }, CUSTOMER_TOKEN_EXPIRY);
  return {
    token,
    user: {
      id: user._id.toString(),
      shopId: user.shopId,
      shopName: customer.shopName,
      phone: customer.phone,
    },
  };
}

export async function adminLogin(adminId: string, password: string) {
  const user = await User.findOne({ role: "ADMIN", adminId });
  if (!user || !user.passwordHash) {
    throw new ApiError("Incorrect Admin ID or password.", 401);
  }
  if (!user.isActive) {
    throw new ApiError("This account is inactive.", 403);
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError("Incorrect Admin ID or password.", 401);
  }
  const token = signToken({ userId: user._id.toString(), role: "ADMIN" });
  return {
    token,
    user: { id: user._id.toString(), adminId: user.adminId },
  };
}
