import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: 'furniture' | 'lighting' | 'flooring' | 'paint' | 'decor';
  subCategory: string;
  brand: string;
  discount: number;
  description: string;
  shortDescription: string;
  price: number;
  stock: number;
  roomType: string;
  material: string;
  color: string;
  width: number;
  height: number;
  length: number;
  sqFtCoverage: number;
  style: string;
  finish: string;
  image: string;
  gallery: string[];
  featured: boolean;
  trending: boolean;
  rating: number;
  reviewsCount: number;
  specs: Map<string, string>;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['furniture', 'lighting', 'flooring', 'paint', 'decor'],
    index: true
  },
  subCategory: { type: String, default: '' },
  brand: { type: String, default: '' },
  discount: { type: Number, default: 0 },
  description: { type: String, required: true },
  shortDescription: { type: String, default: '' },
  price: { type: Number, required: true },
  stock: { type: Number, default: 50 },
  roomType: { type: String, default: '' },
  material: { type: String, default: '' },
  color: { type: String, default: '' },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  length: { type: Number, default: 0 },
  sqFtCoverage: { type: Number, default: 0 },
  style: { type: String, default: '' },
  finish: { type: String, default: '' },
  image: { type: String, required: true },
  gallery: { type: [String], default: [] },
  featured: { type: Boolean, default: false },
  trending: { type: Boolean, default: false },
  rating: { type: Number, default: 5.0 },
  reviewsCount: { type: Number, default: 0 },
  specs: { type: Map, of: String, default: {} },
  createdAt: { type: Date, default: Date.now }
});

export default model<IProduct>('Product', ProductSchema);
