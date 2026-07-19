import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Wishlist from '../models/Wishlist';
import Product from '../models/Product';

const router = Router();

// Get wishlist
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    let wishlist = await Wishlist.findOne({ user: userId }).populate('products');
    
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [], designs: [] });
      await wishlist.save();
    }
    
    res.status(200).json({ success: true, wishlist });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to retrieve wishlist.' } });
  }
});

// Add to wishlist
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: { message: 'Product ID is required.' } });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: { message: 'Product not found.' } });
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [], designs: [] });
    }

    if (wishlist.products.some(p => p.toString() === productId)) {
      return res.status(400).json({ error: { message: 'Product already in wishlist.' } });
    }

    wishlist.products.push(productId);
    await wishlist.save();
    const populatedWishlist = await wishlist.populate('products');

    res.status(200).json({ success: true, wishlist: populatedWishlist });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to add to wishlist.' } });
  }
});

// Delete from wishlist
router.delete('/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res.status(404).json({ error: { message: 'Wishlist not found.' } });
    }

    wishlist.products = wishlist.products.filter(p => p.toString() !== productId);
    await wishlist.save();
    const populatedWishlist = await wishlist.populate('products');

    res.status(200).json({ success: true, wishlist: populatedWishlist });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to remove from wishlist.' } });
  }
});

export default router;
