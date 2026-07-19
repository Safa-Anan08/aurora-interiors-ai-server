import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Cart from '../models/Cart';
import Product from '../models/Product';

const router = Router();

// Get cart
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    let cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart) {
      // Create empty cart if it doesn't exist
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
    }
    
    res.status(200).json({ success: true, cart });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to retrieve cart.' } });
  }
});

// Add or increment item in cart
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: { message: 'Product ID is required.' } });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: { message: 'Product not found.' } });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    const populatedCart = await cart.populate('items.product');

    res.status(200).json({ success: true, cart: populatedCart });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to add item to cart.' } });
  }
});

// Update item quantity
router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({ error: { message: 'Product ID and quantity are required.' } });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ error: { message: 'Cart not found.' } });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: { message: 'Product not in cart.' } });
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    const populatedCart = await cart.populate('items.product');

    res.status(200).json({ success: true, cart: populatedCart });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to update quantity.' } });
  }
});

// Delete specific item
router.delete('/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ error: { message: 'Cart not found.' } });
    }

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();
    const populatedCart = await cart.populate('items.product');

    res.status(200).json({ success: true, cart: populatedCart });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to remove item.' } });
  }
});

// Clear cart
router.delete('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const cart = await Cart.findOne({ user: userId });
    
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({ success: true, message: 'Cart cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to clear cart.' } });
  }
});

export default router;
