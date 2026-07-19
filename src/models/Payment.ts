import { Schema, model, Document, Types } from 'mongoose';

export interface IPurchasedProductItem {
  product: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IPayment extends Document {
  user: Types.ObjectId;
  order: Types.ObjectId;
  purchasedProducts: IPurchasedProductItem[];
  subtotal: number;
  total: number;
  stripeSessionId: string;
  paymentIntentId: string;
  paymentStatus: string;
  paymentDate: Date;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  purchasedProducts: [
    {
      product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  stripeSessionId: { type: String, required: true, unique: true },
  paymentIntentId: { type: String, required: true },
  paymentStatus: { type: String, required: true, default: 'succeeded' },
  paymentDate: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default model<IPayment>('Payment', PaymentSchema);
