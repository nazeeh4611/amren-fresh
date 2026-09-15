import { Schema, model, Types } from "mongoose";

export type OrderStatus = "NEW" | "COMPLETED";

export interface IOrderItem {
  productId: Types.ObjectId;
  productName: string;
  unit: string;
  quantity: number;
  unitPriceFils: number;
  totalFils: number;
}

export interface IOrder {
  _id: Types.ObjectId;
  orderNumber: number;
  customerId: Types.ObjectId;
  shopNameSnapshot: string;
  shopPhoneSnapshot: string;
  items: IOrderItem[];
  totalFils: number;
  status: OrderStatus;
  businessDate: string; // UAE YYYY-MM-DD, set at creation time
  invoiceId?: Types.ObjectId;
  idempotencyKey: string;
  notes?: string; // optional free-text note from the shop, e.g. "no small onions"
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unitPriceFils: { type: Number, required: true, min: 0 },
    totalFils: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: Number, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shopNameSnapshot: { type: String, required: true },
    shopPhoneSnapshot: { type: String, required: true },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    totalFils: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["NEW", "COMPLETED"], default: "NEW" },
    businessDate: { type: String, required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    idempotencyKey: { type: String, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, businessDate: 1 });

export const Order = model<IOrder>("Order", orderSchema);
