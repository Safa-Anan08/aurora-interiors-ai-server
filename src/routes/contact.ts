import { Router, Request, Response } from 'express';
import Contact from '../models/Contact';

const router = Router();

// POST /api/contact - Submit contact form
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: { message: 'All fields are required.' } });
    }

    const contact = new Contact({ name, email, subject, message });
    await contact.save();

    res.status(201).json({ success: true, contact });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to submit contact message.' } });
  }
});

export default router;
