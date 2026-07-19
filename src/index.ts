import 'dotenv/config';
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth';
import generateRoutes from './routes/generate';
import chatRoutes from './routes/chat';
import projectRoutes from './routes/projects';
import marketplaceRoutes from './routes/marketplace';
import contactRoutes from './routes/contact';
import adminRoutes from './routes/admin';
import cartRoutes from './routes/cart';
import wishlistRoutes from './routes/wishlist';
import designRoutes from './routes/designs';
import productRoutes from './routes/products';
import adminSeedRoutes from "./routes/adminSeed";


// Initialize Express application - reload trigger
const app: Express = express();
const port = process.env.PORT || 5000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aurora-interiors';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('🍀[database]: MongoDB connected successfully.');
    await seedProducts();
    await seedDesigns();

  })
  .catch(err => {
    console.error('❌[database]: MongoDB connection failed. Storing logs and proceeding in memory...', err.message);
  });

// Security and Logging Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/products', productRoutes);

app.use("/api/seed", adminSeedRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

// Database Seeding Helper
import Product from './models/Product';
import { PRODUCTS } from './routes/marketplace';

async function seedProducts() {
  try {
    await Product.deleteMany({});
    console.log('🌱 [seed]: Cleared products collection for re-seeding.');
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('🌱 [seed]: Seeding initial products into MongoDB...');

      const seededProducts = PRODUCTS.map(p => {
        let hexId = '';
        const idStr = p.id.toString();
        if (idStr.startsWith('f') && !idStr.startsWith('fl')) {
          hexId = `f100000000000000000000${idStr.substring(1).padStart(2, '0')}`;
        } else if (idStr.startsWith('l')) {
          hexId = `1100000000000000000000${idStr.substring(1).padStart(2, '0')}`;
        } else if (idStr.startsWith('fl')) {
          hexId = `f110000000000000000000${idStr.substring(2).padStart(2, '0')}`;
        } else if (idStr.startsWith('p')) {
          hexId = `ba00000000000000000000${idStr.substring(1).padStart(2, '0')}`;
        } else if (idStr.startsWith('d')) {
          hexId = `de00000000000000000000${idStr.substring(1).padStart(2, '0')}`;
        } else {
          hexId = new mongoose.Types.ObjectId().toString();
        }

        return {
          _id: new mongoose.Types.ObjectId(hexId),
          name: p.name,
          category: p.category,
          price: p.price,
          description: p.description,
          image: p.image,
          specs: new Map(Object.entries(p.specs || {})),
          rating: p.rating,
          reviewsCount: p.reviewsCount,
          stock: 50
        };
      });

      await Product.insertMany(seededProducts);
      console.log('🌱 [seed]: Mapped & seeded mock products into MongoDB successfully.');
    } else {
      console.log(`🌱 [seed]: Product database already populated (${count} entries).`);
    }
  } catch (err) {
    console.error('🌱 [seed]: Database seeding failed:', err);
  }
}

import Design from './models/Design';

async function seedDesigns() {
  try {
    await Design.deleteMany({});
    console.log('🌱 [seed]: Cleared designs collection for re-seeding.');
    const count = await Design.countDocuments();
    if (count === 0) {
      console.log('🌱 [seed]: Seeding initial designs into MongoDB...');

      const seededDesigns = [
        {
          _id: new mongoose.Types.ObjectId("d10000000000000000000001"),
          title: 'Japandi Study Cabin',
          style: 'Japandi',
          roomType: 'Home Office',
          desc: 'This study fuses modern Japanese wabi-sabi simplicity with warm Scandinavian wood tones to establish a creative refuge.',
          img: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
          layoutSteps: [
            "Place the floating walnut desk adjacent to direct window light.",
            "Incorporate green foliage in ribbed stoneware ceramic vases.",
            "Use warm beige Alabaster paint as the room base tone.",
            "Lay out a hand-woven Mesa wool area rug beneath the study chair."
          ],
          colors: [
            { name: 'Warm Alabaster', hex: '#f5f5f4' },
            { name: 'Japandi Oak', hex: '#b45309' },
            { name: 'Charcoal Accent', hex: '#374151' }
          ],
          recommendedProductIds: [
            'f10000000000000000000002', // f2
            'f10000000000000000000004', // f4
            'ba0000000000000000000002', // p2
            'de0000000000000000000002'  // d2
          ],
          gallery: [
            'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80'
          ],
          specifications: ['Dimensions: 12\' x 10\'', 'Desk: 40" W Kyoto Floating Desk', 'Flooring: Japandi Oak Planks'],
          budget: 'moderate',
          materials: ['Solid White Oak', 'Walnut Veneer', 'Bouclé Fabric', 'Wool'],
          furniture: ['Kyoto Floating Desk', 'Astrid Bouclé Sofa', 'Soren Leather Lounge Chair'],
          tags: ['Workspace', 'Japandi', 'Minimalist', 'Cozy'],
          featured: true,
          published: true
        },
        {
          _id: new mongoose.Types.ObjectId("d10000000000000000000002"),
          title: 'Scandinavian Cozy Living',
          style: 'Scandinavian',
          roomType: 'Living Room',
          desc: 'Cozy textiles, light oak flooring, and bright ambient lighting built for relaxation. It highlights natural textures and a calm neutral background.',
          img: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
          layoutSteps: [
            "Center the cream bouclé sofa as the room focal node.",
            "Situate the Nordic Oak Coffee Table in front of the sofa.",
            "Hang travertine stone pendant light fixtures above key reading corners.",
            "Employ low-VOC Alabaster white paint on all walls to capture ambient light."
          ],
          colors: [
            { name: 'Soft Alabaster', hex: '#f5f5f4' },
            { name: 'Cozy Cream', hex: '#fef08a' },
            { name: 'Slate Gray', hex: '#6b7280' }
          ],
          recommendedProductIds: [
            'f10000000000000000000001', // f1
            'f10000000000000000000002', // f2
            '110000000000000000000001', // l1
            'ba0000000000000000000002', // p2
            'de0000000000000000000001'  // d1
          ],
          gallery: [
            'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'
          ],
          specifications: ['Dimensions: 16\' x 14\'', 'Sofa: Astrid Bouclé Sofa', 'Coffee Table: Nordic Oak'],
          budget: 'premium',
          materials: ['Cozy Bouclé', 'Nordic Light Oak', 'Travertine Stone', 'Natural Wool'],
          furniture: ['Astrid Bouclé Sofa', 'Nordic Oak Coffee Table'],
          tags: ['Cozy', 'Lounge', 'Scandinavian', 'Bright'],
          featured: true,
          published: true
        },
        {
          _id: new mongoose.Types.ObjectId("d10000000000000000000003"),
          title: 'Industrial Warehouse Bedroom',
          style: 'Industrial',
          roomType: 'Bedroom',
          desc: 'A rugged yet refined warehouse look, incorporating textured concrete, distressed leather lounge seats, and warm Edison light bulbs.',
          img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
          layoutSteps: [
            "Position the Soren Leather Lounge Chair in the corner adjacent to floor windows.",
            "Install the Helios Matte Black Floor Lamp next to the bed structure.",
            "Incorporate Terrazzo porcelain floor tiles to create a sleek warehouse base.",
            "Employ Kobe Sage Green as an accent on the brick wall sections."
          ],
          colors: [
            { name: 'Kobe Sage', hex: '#5f6f65' },
            { name: 'Steel Black', hex: '#18181b' },
            { name: 'Rust Camel', hex: '#b45309' }
          ],
          recommendedProductIds: [
            'f10000000000000000000003', // f3
            '110000000000000000000002', // l2
            'f11000000000000000000002', // fl2
            'ba0000000000000000000001'  // p1
          ],
          gallery: [
            'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80'
          ],
          specifications: ['Dimensions: 14\' x 12\'', 'Lighting: Helios Matte Floor Lamp', 'Flooring: Terrazzo Tiles'],
          budget: 'moderate',
          materials: ['Distressed Leather', 'Matte Black Steel', 'Concrete', 'Porcelain'],
          furniture: ['Soren Leather Lounge Chair'],
          tags: ['Rugged', 'Warehouse', 'Industrial', 'Edison'],
          featured: true,
          published: true
        },
        {
          _id: new mongoose.Types.ObjectId("d10000000000000000000004"),
          title: 'Bohemian Botanist Dining',
          style: 'Bohemian',
          roomType: 'Dining Room',
          desc: 'Woven rattan, warm clay textures, and hanging cascading greens combined to produce a lush botanical escape.',
          img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
          layoutSteps: [
            "Center the oak dining table under the hanging cascading greens.",
            "Place the woven rattan chairs around the dining table.",
            "Use warm clay textures for table styling accessories.",
            "Install soft warm lighting fixtures to set a cozy dining mood."
          ],
          colors: [
            { name: 'Warm Ochre', hex: '#d97706' },
            { name: 'Clay Terracotta', hex: '#ca8a04' },
            { name: 'Olive Leaf', hex: '#65a30d' }
          ],
          recommendedProductIds: [
            'f10000000000000000000002', // f2
            '110000000000000000000001', // l1
            'de0000000000000000000002'  // d2
          ],
          gallery: [
            'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'
          ],
          specifications: ['Dimensions: 12\' x 12\'', 'Lighting: Solace Travertine', 'Theme: Botanical Dining'],
          budget: 'budget',
          materials: ['Woven Rattan', 'Teak Wood', 'Earthenware Clay', 'Linen'],
          furniture: ['Nordic Oak Coffee Table'],
          tags: ['Botanical', 'Boho', 'Rattan', 'Plants'],
          featured: false,
          published: true
        },
        {
          _id: new mongoose.Types.ObjectId("d10000000000000000000005"),
          title: 'Minimalist Monochromatic Bedroom',
          style: 'Minimalist',
          roomType: 'Bedroom',
          desc: 'Sleek storage cabinets, high-contrast grays, and hidden LED lighting tracks for an ultra-modern aesthetic.',
          img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
          layoutSteps: [
            "Mount hidden LED lighting tracks along the ceiling line.",
            "Position the sleek dark storage cabinets flush against the wall.",
            "Arrange high-contrast grays in the bed linen layers.",
            "Place a low profile platform bed frame centered in the room."
          ],
          colors: [
            { name: 'Monochrome Slate', hex: '#4b5563' },
            { name: 'Pure White', hex: '#ffffff' },
            { name: 'Deep Coal', hex: '#1f2937' }
          ],
          recommendedProductIds: [
            'f10000000000000000000003', // f3
            '110000000000000000000002', // l2
            'ba0000000000000000000002'  // p2
          ],
          gallery: [
            'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80'
          ],
          specifications: ['Dimensions: 15\' x 13\'', 'Lighting: Helios Matte Floor Lamp', 'Theme: Monochromatic'],
          budget: 'premium',
          materials: ['Brushed Steel', 'Glass', 'Polished Concrete', 'Leather'],
          furniture: ['Soren Leather Lounge Chair'],
          tags: ['Monochromatic', 'Sleek', 'LED', 'Minimalist'],
          featured: false,
          published: true
        }
      ];

      await Design.insertMany(seededDesigns);
      console.log('🌱 [seed]: Seeded default design presets into MongoDB successfully.');
    } else {
      console.log(`🌱 [seed]: Design database already populated (${count} entries).`);
    }
  } catch (err) {
    console.error('🌱 [seed]: Design database seeding failed:', err);
  }
}

