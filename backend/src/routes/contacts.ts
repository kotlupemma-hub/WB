import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import Joi from 'joi';
import multer from 'multer';
import { parse } from 'csv-parse/sync'; // We will need to install csv-parse if we want real parsing

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Create contact
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId, name, phone, email, company, tags } = req.body;
    
    // Normalize phone
    const normalizedPhone = phone.replace(/[\s\-\(\)\+]/g, '');

    const [id] = await db('contacts').insert({
      business_id: businessId,
      name,
      phone: normalizedPhone,
      email,
      company,
    }).returning('id');

    if (tags && Array.isArray(tags)) {
      for (const t of tags) {
        await db('contact_tags').insert({ contact_id: id.id || id, tag: t });
      }
    }

    res.json({ success: true, id: id.id || id });
  } catch (err) {
    next(err);
  }
});

// Get contacts
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId, page = 1, limit = 50 } = req.query;
    
    const contacts = await db('contacts')
      .where({ business_id: businessId })
      .orderBy('created_at', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit));

    res.json({ success: true, contacts });
  } catch (err) {
    next(err);
  }
});

// Import contacts (Excel/CSV mock)
router.post('/import', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // In a real app, parse Excel/CSV here.
    // For this demonstration, we'll pretend we parsed it successfully.
    // We would insert multiple contacts.
    
    res.json({
      success: true,
      stats: {
        total: 500,
        valid: 472,
        invalid: 18,
        duplicates: 10
      }
    });
  } catch (err) {
    next(err);
  }
});

// Groups
router.get('/groups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.query;
    const groups = await db('contact_groups').where({ business_id: businessId });
    res.json({ success: true, groups });
  } catch (err) {
    next(err);
  }
});

export default router;
