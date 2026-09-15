import { Schema, model, Types } from "mongoose";

export type UserRole = "ADMIN" | "CUSTOMER";

export interface IWebPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface IUser {
  _id: Types.ObjectId;
  role: UserRole;
  shopId?: string; // customers only, e.g. AMR001
  adminId?: string; // admins only
  pinHash?: string; // customers only
  passwordHash?: string; // admins only
  isActive: boolean;
  pushTokens: string[]; // Expo push tokens registered by this user's devices
  webPushSubscriptions: IWebPushSubscription[]; // browser push subscriptions (admin dashboard)
  createdAt: Date;
  updatedAt: Date;
}

const webPushSubscriptionSchema = new Schema<IWebPushSubscription>(
  {
    endpoint: { type: String, required: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    role: { type: String, enum: ["ADMIN", "CUSTOMER"], required: true },
    shopId: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    adminId: { type: String, unique: true, sparse: true, trim: true },
    pinHash: { type: String },
    passwordHash: { type: String },
    isActive: { type: Boolean, default: true },
    pushTokens: { type: [String], default: [] },
    webPushSubscriptions: { type: [webPushSubscriptionSchema], default: [] },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
