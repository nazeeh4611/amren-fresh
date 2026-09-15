import { Schema, model, Types } from "mongoose";

export interface ICustomer {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  shopName: string;
  phone: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    shopName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

customerSchema.index({ shopName: "text" });

export const Customer = model<ICustomer>("Customer", customerSchema);
