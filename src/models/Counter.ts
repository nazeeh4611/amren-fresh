import { Schema, model } from "mongoose";

/**
 * Generic atomic sequence counter, keyed by an arbitrary id
 * (e.g. "orderNumber" or "invoiceNumber:2026").
 */
export interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model<ICounter>("Counter", counterSchema);

export async function getNextSequence(key: string): Promise<number> {
  const result = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}
