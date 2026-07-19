import { Router, Request, Response } from 'express';
import ProductModel from '../models/Product';
import mongoose from 'mongoose';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let dbProduct = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      dbProduct = await ProductModel.findById(id);
    }

    // Fallback search by short ID in case a legacy frontend link passes it
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

    // Convert specs Map to object format
    const specsObj = dbProduct.specs instanceof Map
      ? Object.fromEntries(dbProduct.specs)
      : dbProduct.specs || {};

    res.status(200).json({
      success: true,
      product: {
        id: dbProduct._id.toString(),
        name: dbProduct.name,
        category: dbProduct.category,
        subCategory: dbProduct.subCategory,
        brand: dbProduct.brand,
        discount: dbProduct.discount,
        description: dbProduct.description,
        shortDescription: dbProduct.shortDescription,
        price: dbProduct.price,
        stock: dbProduct.stock,
        roomType: dbProduct.roomType,
        material: dbProduct.material,
        color: dbProduct.color,
        width: dbProduct.width,
        height: dbProduct.height,
        length: dbProduct.length,
        sqFtCoverage: dbProduct.sqFtCoverage,
        style: dbProduct.style,
        finish: dbProduct.finish,
        image: dbProduct.image,
        gallery: dbProduct.gallery || [],
        featured: dbProduct.featured,
        trending: dbProduct.trending,
        rating: dbProduct.rating,
        reviewsCount: dbProduct.reviewsCount,
        specs: specsObj
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to retrieve product details.' } });
  }
});

export default router;
