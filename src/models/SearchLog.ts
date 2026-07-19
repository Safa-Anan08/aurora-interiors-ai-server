import { Schema, model, Document } from 'mongoose';

export interface ISearchLog extends Document {
  keyword: string;
  roomType: string;
  color: string;
  material: string;
  furniture: string;
  resultsCount: number;
  createdAt: Date;
}

const SearchLogSchema = new Schema<ISearchLog>({
  keyword: { type: String, default: '', index: true },
  roomType: { type: String, default: '', index: true },
  color: { type: String, default: '', index: true },
  material: { type: String, default: '', index: true },
  furniture: { type: String, default: '', index: true },
  resultsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default model<ISearchLog>('SearchLog', SearchLogSchema);
