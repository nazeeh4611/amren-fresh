import { Schema, model, Types } from "mongoose";

export interface IInvoiceItem {
  productId: Types.ObjectId;
  productName: string;
  unit: string;
  unitPriceFils: number; // a distinct line exists per (productId, unitPriceFils)
  quantity: number;
  totalFils: number;
}

export interface IInvoice {
  _id: Types.ObjectId;
  invoiceNumber: string; // INV-YYYY-00001
  customerId: Types.ObjectId;
  shopName: string; // snapshot from the first order of the business date
  shopPhone: string;
  businessDate: string; // UAE YYYY-MM-DD
  orderIds: Types.ObjectId[];
  items: IInvoiceItem[];
  totalFils: number;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    unit: { type: String, required: true },
    unitPriceFils: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    totalFils: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shopName: { type: String, required: true },
    shopPhone: { type: String, required: true },
    businessDate: { type: String, required: true },
    orderIds: [{ type: Schema.Types.ObjectId, ref: "Order" }],
    items: { type: [invoiceItemSchema], default: [] },
    totalFils: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, optimisticConcurrency: true }
);

invoiceSchema.index({ customerId: 1, businessDate: 1 }, { unique: true });
invoiceSchema.index({ businessDate: -1 });

export const Invoice = model<IInvoice>("Invoice", invoiceSchema);
