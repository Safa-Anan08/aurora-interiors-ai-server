import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import ProductModel from '../models/Product';
import Order from '../models/Order';
import Payment from '../models/Payment';
import Cart from '../models/Cart';

const router = Router();

let stripeInstance: any = null;
const getStripe = () => {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY in environment variables.");
    }
    stripeInstance = require('stripe')(key);
  }
  return stripeInstance;
};

export interface Product {
  id: string;
  name: string;
  category: 'furniture' | 'lighting' | 'flooring' | 'paint' | 'decor';
  price: number;
  description: string;
  image: string;
  specs: Record<string, string>;
  rating: number;
  reviewsCount: number;
  notes?: string;
}

// Highly detailed realistic catalog
const PRODUCTS: Product[] = [
  // Furniture
  {
    id: 'f1',
    name: 'Astrid Bouclé Sofa',
    category: 'furniture',
    price: 1899,
    description: 'A premium, organic-shaped sofa upholstered in high-density cream bouclé fabric. Featuring sleek oak feet and high-resiliency foam padding for maximum style and comfort.',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
    specs: { Dimensions: '90" W x 38" D x 29" H', Material: 'Cream Bouclé, Solid Oak Frame', Weight: '110 lbs' },
    rating: 4.8,
    reviewsCount: 34
  },
  {
    id: 'f2',
    name: 'Nordic Oak Coffee Table',
    category: 'furniture',
    price: 649,
    description: 'Solid European white oak coffee table displaying natural wood grains and sleek joinery. A hallmark of Japandi and Scandinavian layouts.',
    image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&q=80',
    specs: { Dimensions: '47" W x 24" D x 16" H', Material: 'Solid White Oak', Finish: 'Clear Matte Polyurethane' },
    rating: 4.9,
    reviewsCount: 18
  },
  {
    id: 'f3',
    name: 'Soren Leather Lounge Chair',
    category: 'furniture',
    price: 949,
    description: 'Mid-century modern lounge chair in premium full-grain camel leather with a contoured matte black steel wireframe.',
    image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=600&q=80',
    specs: { Dimensions: '32" W x 34" D x 38" H', Material: 'Full-Grain Leather, Carbon Steel', Weight: '40 lbs' },
    rating: 4.7,
    reviewsCount: 22
  },
  {
    id: 'f4',
    name: 'Kyoto Floating Desk',
    category: 'furniture',
    price: 520,
    description: 'Minimalist space-saving wall-mounted desk in stained dark walnut, perfect for home workspaces and study corners.',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80',
    specs: { Dimensions: '40" W x 18" D x 10" H', Material: 'American Walnut Veneer', Weight: '28 lbs' },
    rating: 4.6,
    reviewsCount: 12
  },

  // Lighting
  {
    id: 'l1',
    name: 'Solace Travertine Pendant Light',
    category: 'lighting',
    price: 299,
    description: 'Sculpted from a single block of raw travertine stone, casting warm ambient downlight. Ideal for kitchen islands and dining tables.',
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=600&q=80',
    specs: { Dimensions: '6" Dia x 12" H', Canopy: '5" Dia Black Steel', CordLength: '72" Adjustable' },
    rating: 4.9,
    reviewsCount: 15
  },
  {
    id: 'l2',
    name: 'Helios Matte Black Floor Lamp',
    category: 'lighting',
    price: 349,
    description: 'Arched carbon steel floor lamp with an adjustable brass shade interior. Employs soft diffusion plates to eliminate glare.',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
    specs: { Height: '78" Max', Shade: '12" Dia', Material: 'Carbon Steel, Brass Details' },
    rating: 4.8,
    reviewsCount: 28
  },

  // Flooring & Tiles
  {
    id: 'fl1',
    name: 'Hovden Wide Oak Planks (Per Sq Ft)',
    category: 'flooring',
    price: 9.5,
    description: 'Premium engineered white oak planks, wire-brushed for tactile texture and styled with a matte finish. Underfloor heating compatible.',
    image: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=600&q=80',
    specs: { Thickness: '5/8 inch', PlankWidth: '8.5 inches', PlankLength: 'Random up to 86"' },
    rating: 4.9,
    reviewsCount: 41
  },
  {
    id: 'fl2',
    name: 'Terrazzo Grey Porcelain Tile (Per Sq Ft)',
    category: 'flooring',
    price: 7.2,
    description: 'Italian porcelain tile with beautiful composite quartz chips. Water-resistant, ideal for kitchen backsplash, bathrooms, and entry corridors.',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
    specs: { Dimensions: '24" x 24" Plaquette', Thickness: '10 mm', Texture: 'Satin Matte slip-resistant' },
    rating: 4.7,
    reviewsCount: 19
  },
  {
    id: 'fl3',
    name: 'Nordic Chevron Oak Flooring (Per Sq Ft)',
    category: 'flooring',
    price: 12.75,
    description: 'Luxury engineered European oak flooring arranged in a timeless chevron pattern. UV-cured matte finish with exceptional durability for high-end residential interiors.',
    image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=600&q=80',
    specs: {
      Thickness: '14 mm',
      PlankWidth: '4 inches',
      PlankLength: '24 inches'
    },
    rating: 5.0,
    reviewsCount: 67
  },

  {
    id: 'fl4',
    name: 'Travertine Stone Floor Tile (Per Sq Ft)',
    category: 'flooring',
    price: 15.25,
    description: 'Premium honed travertine stone flooring featuring natural beige tones and subtle veining. Ideal for luxurious living rooms, foyers, and open-concept spaces.',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80',
    specs: {
      Thickness: '12 mm',
      TileSize: '24 x 24 inches',
      Finish: 'Honed Natural'
    },
    rating: 4.9,
    reviewsCount: 54
  },
  // Paint
  {
    id: 'p1',
    name: 'Kobe Sage Matte Wall Paint (1 Gal)',
    category: 'paint',
    price: 68,
    description: 'Designer-grade low-VOC acrylic paint in a calming, muted olive-sage tone. Delivers high scrub-resistance and clean coverage.',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80',
    specs: { Finish: 'Velvet Matte', VOC: '< 5g/L (Zero VOC)', Coverage: 'Approx 350-400 sq ft', 'Hex Code': '#A3B18A', 'Shade Code': 'AR-624' },
    rating: 4.8,
    reviewsCount: 50
  },
  {
    id: 'p2',
    name: 'Alabaster Silk Wall Paint (1 Gal)',
    category: 'paint',
    price: 68,
    description: 'A warm, comforting white paint with yellow undertones. Perfect for bouncing natural sunlight without feeling sterile.',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    specs: { Finish: 'Eggshell Silk', VOC: '< 5g/L', Coverage: 'Approx 350-400 sq ft', 'Hex Code': '#FAF9F6', 'Shade Code': 'AR-001' },
    rating: 4.9,
    reviewsCount: 88
  },
  {
    id: 'p3',
    name: 'Sage Harmony Wall Paint (1 Gal)',
    category: 'paint',
    price: 72,
    description: 'A calming sage green paint that creates a relaxing and nature-inspired atmosphere for bedrooms and living spaces.',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80',
    specs: {
      Finish: 'Matte',
      VOC: '< 5g/L',
      Coverage: 'Approx 350-400 sq ft',
      'Hex Code': '#A8B59F',
      'Shade Code': 'SG-102'
    },
    rating: 4.9,
    reviewsCount: 96
  },

  {
    id: 'p4',
    name: 'Warm Linen Wall Paint (1 Gal)',
    category: 'paint',
    price: 65,
    description: 'Soft warm beige paint designed to make interiors feel cozy while complementing natural wood furniture.',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80',
    specs: {
      Finish: 'Eggshell',
      VOC: '< 5g/L',
      Coverage: 'Approx 360 sq ft',
      'Hex Code': '#E7D8C9',
      'Shade Code': 'WL-110'
    },
    rating: 4.8,
    reviewsCount: 74
  },

  {
    id: 'p5',
    name: 'Soft Ivory Premium Paint (1 Gal)',
    category: 'paint',
    price: 70,
    description: 'Elegant ivory wall paint offering exceptional stain resistance and long-lasting premium finish.',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    specs: {
      Finish: 'Silk',
      VOC: '< 5g/L',
      Coverage: 'Approx 380 sq ft',
      'Hex Code': '#F8F5F0',
      'Shade Code': 'IV-115'
    },
    rating: 5,
    reviewsCount: 112
  },

  {
    id: 'p6',
    name: 'Sandstone Beige Wall Paint (1 Gal)',
    category: 'paint',
    price: 63,
    description: 'Natural sandstone beige paint that pairs beautifully with Scandinavian and Japandi interiors.',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80',
    specs: {
      Finish: 'Matte',
      VOC: '< 5g/L',
      Coverage: 'Approx 360 sq ft',
      'Hex Code': '#D6C4A1',
      'Shade Code': 'SB-208'
    },
    rating: 4.8,
    reviewsCount: 61
  },

  {
    id: 'p7',
    name: 'Misty Grey Interior Paint (1 Gal)',
    category: 'paint',
    price: 69,
    description: 'Contemporary light grey paint that creates a sophisticated backdrop for modern furniture.',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    specs: {
      Finish: 'Eggshell',
      VOC: '< 5g/L',
      Coverage: 'Approx 370 sq ft',
      'Hex Code': '#CFCFD2',
      'Shade Code': 'MG-220'
    },
    rating: 4.9,
    reviewsCount: 83
  },

  {
    id: 'p8',
    name: 'Charcoal Accent Paint (1 Gal)',
    category: 'paint',
    price: 74,
    description: 'Deep charcoal paint ideal for feature walls, media rooms, and contemporary luxury interiors.',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80',
    specs: {
      Finish: 'Velvet Matte',
      VOC: '< 5g/L',
      Coverage: 'Approx 340 sq ft',
      'Hex Code': '#4A4A4A',
      'Shade Code': 'CH-305'
    },
    rating: 4.9,
    reviewsCount: 98
  },

  {
    id: 'p9',
    name: 'Terracotta Clay Paint (1 Gal)',
    category: 'paint',
    price: 71,
    description: 'Earthy terracotta paint inspired by Mediterranean architecture, adding warmth and character.',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    specs: {
      Finish: 'Matte',
      VOC: '< 5g/L',
      Coverage: 'Approx 350 sq ft',
      'Hex Code': '#C56F4D',
      'Shade Code': 'TC-330'
    },
    rating: 4.8,
    reviewsCount: 69
  },

  {
    id: 'p10',
    name: 'Ocean Mist Blue Paint (1 Gal)',
    category: 'paint',
    price: 73,
    description: 'A refreshing muted blue paint inspired by coastal skies for peaceful bedrooms and bathrooms.',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80',
    specs: {
      Finish: 'Silk',
      VOC: '< 5g/L',
      Coverage: 'Approx 365 sq ft',
      'Hex Code': '#AFC7D6',
      'Shade Code': 'OM-410'
    },
    rating: 5,
    reviewsCount: 91
  },

  {
    id: 'p11',
    name: 'Forest Moss Wall Paint (1 Gal)',
    category: 'paint',
    price: 70,
    description: 'Rich moss green paint that brings depth and a luxurious botanical feel to interiors.',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    specs: {
      Finish: 'Matte',
      VOC: '< 5g/L',
      Coverage: 'Approx 360 sq ft',
      'Hex Code': '#66785F',
      'Shade Code': 'FM-505'
    },
    rating: 4.9,
    reviewsCount: 79
  },

  {
    id: 'p12',
    name: 'Cashmere Cream Wall Paint (1 Gal)',
    category: 'paint',
    price: 76,
    description: 'Ultra-premium cream paint with silky texture designed for elegant luxury homes.',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80',
    specs: {
      Finish: 'Silk Luxe',
      VOC: '< 5g/L',
      Coverage: 'Approx 390 sq ft',
      'Hex Code': '#F5E8D3',
      'Shade Code': 'CC-601'
    },
    rating: 5,
    reviewsCount: 118
  },
  // Decor
  {
    id: 'd1',
    name: 'Mesa Wool Area Rug',
    category: 'decor',
    price: 499,
    description: 'Hand-woven high-pile wool area rug featuring abstract geometric patterns. Adds instant texture and sound absorption to hard floors.',
    image: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=600&q=80',
    specs: { Size: '8\' x 10\'', Material: '85% wool, 15% organic cotton', Origin: 'Hand-woven in India' },
    rating: 4.7,
    notes: 'Abstract geometric patterns',
    reviewsCount: 30
  },
  {
    id: 'd2',
    name: 'Oasis Ceramic Vase Set',
    category: 'decor',
    price: 110,
    description: 'A collection of three stoneware clay vases with ribbed silhouettes and sandy textured glazes.',
    image: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=600&q=80',
    specs: { Count: '3 Vases', Heights: '6", 9", 12"', Material: 'Stoneware Ceramic' },
    rating: 4.5,
    reviewsCount: 14
  }
];

// Get marketplace catalog from MongoDB (paginated)
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 12, search = '', category = 'all' } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skipCount = (pageNum - 1) * limitNum;

    // Build query filter
    const query: any = {};
    if (category && category !== 'all') {
      query.category = category as string;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } }
      ];
    }

    const [dbProducts, totalItems] = await Promise.all([
      ProductModel.find(query).sort({ createdAt: -1 }).skip(skipCount).limit(limitNum),
      ProductModel.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    const mappedProducts = dbProducts.map(p => ({
      id: p._id.toString(),
      name: p.name,
      category: p.category,
      price: p.price,
      description: p.description,
      image: p.image,
      specs: Object.fromEntries(p.specs || new Map()),
      rating: p.rating,
      reviewsCount: p.reviewsCount
    }));

    res.status(200).json({
      data: mappedProducts,
      currentPage: pageNum,
      totalPages,
      totalItems,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1
    });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to retrieve products from database.' } });
  }
});

// Get a single product details by ID or short ID fallback
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    let dbProduct = null;

    // Check if ID is a valid 24-character hex ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      dbProduct = await ProductModel.findById(id);
    }

    // Fallback search by short ID in case a frontend component passes it
    if (!dbProduct) {
      const shortIdPatterns: Record<string, string> = {
        'f1': 'f10000000000000000000001',
        'f2': 'f10000000000000000000002',
        'f3': 'f10000000000000000000003',
        'f4': 'f10000000000000000000004',
        'l1': '110000000000000000000001',
        'l2': '110000000000000000000002',
        'fl1': 'f11000000000000000000001',
        'fl2': 'f11000000000000000000002',
        'p1': 'ba0000000000000000000001',
        'p2': 'ba0000000000000000000002',
        'd1': 'de0000000000000000000001',
        'd2': 'de0000000000000000000002'
      };
      const hexId = shortIdPatterns[id];
      if (hexId) {
        dbProduct = await ProductModel.findById(hexId);
      }
    }

    if (!dbProduct) {
      return res.status(404).json({ error: { message: 'Product not found.' } });
    }

    res.status(200).json({
      success: true,
      product: {
        id: dbProduct._id.toString(),
        name: dbProduct.name,
        category: dbProduct.category,
        price: dbProduct.price,
        description: dbProduct.description,
        image: dbProduct.image,
        specs: Object.fromEntries(dbProduct.specs || new Map()),
        rating: dbProduct.rating,
        reviewsCount: dbProduct.reviewsCount,
        stock: dbProduct.stock !== undefined ? dbProduct.stock : 50
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to retrieve product details.' } });
  }
});

// Stripe checkout endpoint
router.post('/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: { message: 'Shopping cart items are required.' } });
    }

    // 1. Verify items and construct order items & line items
    const orderItems = [];
    const lineItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const dbProduct = await ProductModel.findById(item.id);
      if (!dbProduct) {
        return res.status(404).json({ error: { message: `Product ${item.name} not found in catalog.` } });
      }

      orderItems.push({
        product: dbProduct._id,
        quantity: item.quantity,
        price: dbProduct.price
      });

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: dbProduct.name,
            images: [dbProduct.image]
          },
          unit_amount: Math.round(dbProduct.price * 100)
        },
        quantity: item.quantity
      });

      calculatedTotal += dbProduct.price * item.quantity;
    }

    // 2. Create a pending Order in MongoDB
    const order = new Order({
      user: userId,
      items: orderItems,
      total: calculatedTotal,
      status: 'pending',
      paymentIntentId: 'pending_stripe_session' // Placeholder
    });
    await order.save();

    // 3. Create Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      client_reference_id: userId,
      metadata: {
        orderId: order._id.toString(),
        userId: userId
      },
      success_url: `${req.headers.origin || 'http://localhost:3000'}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}/checkout-cancel`
    });

    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
      paymentReference: session.id
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: { message: error.message || 'Payment system error.' } });
  }
});

// Stripe checkout success verification
router.post('/checkout-success', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user?.id;

    if (!sessionId) {
      return res.status(400).json({ error: { message: 'Stripe Session ID is required.' } });
    }

    // Retrieve the Stripe checkout session
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: { message: 'Payment verification failed. Session is unpaid.' } });
    }

    const orderId = session.metadata.orderId;
    if (!orderId) {
      return res.status(400).json({ error: { message: 'Order reference not found in Stripe session.' } });
    }

    // Check if a payment for this session already exists (prevent duplicate processing)
    let payment = await Payment.findOne({ stripeSessionId: sessionId });
    let order = await Order.findById(orderId).populate('items.product');

    if (payment && order) {
      return res.status(200).json({
        success: true,
        message: 'Order already processed.',
        order,
        payment
      });
    }

    if (!order) {
      return res.status(404).json({ error: { message: 'Order reference not found in database.' } });
    }

    // 1. Update Order status & paymentIntentId
    order.status = 'processing';
    order.paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
    await order.save();

    // 2. Log Payment details
    const purchasedProducts = order.items.map((item: any) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.price,
      quantity: item.quantity
    }));

    payment = new Payment({
      user: userId,
      order: order._id,
      purchasedProducts,
      subtotal: order.total,
      total: order.total,
      stripeSessionId: sessionId,
      paymentIntentId: order.paymentIntentId,
      paymentStatus: 'succeeded',
      paymentDate: new Date()
    });
    await payment.save();

    // 3. Clear the User's Cart
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });

    res.status(200).json({
      success: true,
      order,
      payment
    });

  } catch (error: any) {
    console.error('Success handler error:', error);
    res.status(500).json({ error: { message: error.message || 'Payment confirmation error.' } });
  }
});

// Get logged-in user's orders
router.get('/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ user: req.user?.id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || 'Failed to retrieve orders.' } });
  }
});

// Get logged-in user's payment history
router.get('/payments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const payments = await Payment.find({ user: req.user?.id })
      .populate({
        path: 'order',
        populate: { path: 'items.product' }
      })
      .sort({ paymentDate: -1 });
    res.status(200).json({ success: true, payments });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || 'Failed to retrieve payment history.' } });
  }
});

export default router;
export { PRODUCTS };
