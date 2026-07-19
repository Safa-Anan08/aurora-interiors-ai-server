import { Schema, model, Document, Types } from 'mongoose';

export interface IWishlist extends Document {
  user: Types.ObjectId;
  products: Types.ObjectId[];
  designs: Types.ObjectId[];
}

const WishlistSchema = new Schema<IWishlist>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  products: [{ type: Schema.Types.ObjectId, ref: 'Product', default: [] }],
  designs: [{ type: Schema.Types.ObjectId, ref: 'Design', default: [] }]
});

export default model<IWishlist>('Wishlist', WishlistSchema);
