import { Router, Request, Response } from 'express';
import Design from '../models/Design';
import mongoose from 'mongoose';

const router = Router();

// GET all designs (paginated)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search = '', style = 'all', page = 1, limit = 9 } = req.query;

    const query: any = { published: true };

    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { desc: { $regex: search as string, $options: 'i' } }
      ];
    }

    if (style && style !== 'all') {
      query.style = { $regex: new RegExp(`^${style}$`, 'i') };
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skipCount = (pageNum - 1) * limitNum;

    const [designs, totalItems] = await Promise.all([
      Design.find(query).sort({ createdAt: -1 }).skip(skipCount).limit(limitNum),
      Design.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      success: true,
      designs,
      currentPage: pageNum,
      totalPages,
      totalItems,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
      // legacy compat
      pagination: {
        total: totalItems,
        page: pageNum,
        pages: totalPages
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to fetch designs.' } });
  }
});

// GET single design
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: { message: 'Design not found.' } });
    }

    const design = await Design.findById(id).populate('recommendedProductIds');
    if (!design) {
      return res.status(404).json({ error: { message: 'Design not found.' } });
    }

    res.status(200).json({ success: true, design });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to fetch design details.' } });
  }
});

export default router;
