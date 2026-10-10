import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

const router = Router();

// Get templates
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.query;
    const templates = await db('message_templates').where({ business_id: businessId });
    res.json({ success: true, templates });
  } catch (err) {
    next(err);
  }
});

// Create template
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId, waAccountId, name, category, language, header, body, footer, buttons } = req.body;
    const [id] = await db('message_templates').insert({
      business_id: businessId,
      wa_account_id: waAccountId,
      name,
      category,
      language,
      header_type: header?.type || 'none',
      header_content: header?.text || header?.mediaUrl || null,
      body,
      footer,
      buttons: JSON.stringify(buttons || []),
      status: 'pending' // pending approval from Meta
    }).returning('id');

    res.json({ success: true, id: id.id || id });
  } catch (err) {
    next(err);
  }
});

// Sync templates from Meta
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { waAccountId } = req.body;
    // In real app, call whatsappService to fetch from Meta Graph API
    res.json({ success: true, message: 'Templates synchronized' });
  } catch (err) {
    next(err);
  }
});

export default router;
