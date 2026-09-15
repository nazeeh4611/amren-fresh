import { Schema, model, Types } from "mongoose";

export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  searchKeywords: string[];
  categoryId: Types.ObjectId;
  imageUrl?: string;
  priceFils: number;
  unit: string; // KG, BOX, CARTON, PIECE, PACK, BAG, ...
  allowDecimalQuantity: boolean;
  isAvailable: boolean;
  isVisible: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    searchKeywords: { type: [String], default: [] },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    imageUrl: { type: String },
    priceFils: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    allowDecimalQuantity: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", searchKeywords: "text" });
productSchema.index({ categoryId: 1, isVisible: 1, isArchived: 1, sortOrder: 1 });

export const Product = model<IProduct>("Product", productSchema);
