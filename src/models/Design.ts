import { Schema, model, Document } from "mongoose";

export interface IColorSwatch {
  name: string;
  hex: string;
}

export interface IDesign extends Document {
  title: string;
  style: string;
  roomType: string;
  desc: string;
  img: string;

  budget: "budget" | "moderate" | "premium";

  featured: boolean;
  published: boolean;

  layoutSteps: string[];
  specifications: string[];
  materials: string[];
  furniture: string[];
  gallery: string[];
  tags: string[];

  colors: IColorSwatch[];

  recommendedProductIds: Schema.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const DesignSchema = new Schema<IDesign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    style: {
      type: String,
      required: true,
    },

    roomType: {
      type: String,
      required: true,
    },

    desc: {
      type: String,
      required: true,
    },

    img: {
      type: String,
      required: true,
    },

    budget: {
      type: String,
      enum: ["budget", "moderate", "premium"],
      default: "moderate",
    },

    featured: {
      type: Boolean,
      default: false,
    },

    published: {
      type: Boolean,
      default: true,
    },

    layoutSteps: {
      type: [String],
      default: [],
    },

    specifications: {
      type: [String],
      default: [],
    },

    materials: {
      type: [String],
      default: [],
    },

    furniture: {
      type: [String],
      default: [],
    },

    gallery: {
      type: [String],
      default: [],
    },

    tags: {
      type: [String],
      default: [],
    },

    colors: [
      {
        name: {
          type: String,
          required: true,
        },
        hex: {
          type: String,
          required: true,
        },
      },
    ],

    recommendedProductIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default model<IDesign>("Design", DesignSchema);