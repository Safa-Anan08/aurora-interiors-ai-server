import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  roomType: string;
  style: string;
  imageUrl: string;
  prompt?: string;
  user?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ProjectSchema: Schema = new Schema({
  name: { type: String, required: true },
  roomType: { type: String, required: true },
  style: { type: String, required: true },
  imageUrl: { type: String, required: true },
  prompt: { type: String },
  user: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model<IProject>('Project', ProjectSchema);
