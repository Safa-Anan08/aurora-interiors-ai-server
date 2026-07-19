import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  profilePic?: string;
  googleId?: string;
  createdAt: Date;
  comparePassword: (password: string) => Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  profilePic: { type: String, default: '' },
  googleId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save password hashing hook
UserSchema.pre('save', async function (this: any) {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password helper method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

export default model<IUser>('User', UserSchema);
