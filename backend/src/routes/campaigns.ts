import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

const router = Router();

// Get campaigns
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.query;
    const campaigns = await db('campaigns').where({ business_id: businessId }).orderBy('created_at', 'desc');
    res.json({ success: true, campaigns });
  } catch (err) {
    next(err);
  }
});

// Create campaign
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId, waAccountId, name, audienceType, audienceId, templateId } = req.body;
    const [id] = await db('campaigns').insert({
      business_id: businessId,
      wa_account_id: waAccountId,
      name,
      audience_type: audienceType,
      audience_id: audienceId,
      template_id: templateId,
      status: 'draft'
    }).returning('id');

    res.json({ success: true, id: id.id || id });
  } catch (err) {
    next(err);
  }
});

export default router;
