import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { whatsappService } from '../services/whatsapp';

const router = Router();

// Add WhatsApp account securely
router.post('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId, displayName, phoneNumber, phoneNumberId, wabaId, metaAppId, accessToken, apiVersion } = req.body;
    
    // Pass to whatsappService which encrypts and saves
    const result = await whatsappService.addAccount(businessId, {
      displayName, phoneNumber, phoneNumberId, wabaId, metaAppId, accessToken, apiVersion
    });

    res.json({ success: true, id: result.id });
  } catch (err) {
    next(err);
  }
});

// Get WhatsApp accounts
router.get('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.query;
    const accounts = await db('whatsapp_accounts')
      .where({ business_id: businessId })
      .select('id', 'display_name', 'phone_number', 'phone_number_id', 'waba_id', 'status');
    // Notice we NEVER select encrypted_access_token

    res.json({ success: true, accounts });
  } catch (err) {
    next(err);
  }
});

export default router;
