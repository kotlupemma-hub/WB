/**
 * WhatsFlow - Webhook Route
 * 
 * Handles incoming WhatsApp webhook events from Meta.
 * Verifies signatures and processes message status updates.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { whatsappService } from '../services/whatsapp';

const router = Router();

// ── GET /webhook/:accountId - Meta Webhook Verification ──
router.get('/:accountId', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Get the verify token for this account (from DB or env)
  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN || 'whatsflow_webhook_verify';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.warn('❌ Webhook verification failed');
    res.status(403).json({ error: 'Forbidden' });
  }
});

// ── POST /webhook/:accountId - Receive Messages/Status Updates ──
router.post('/:accountId', async (req: Request, res: Response) => {
  // Always respond 200 immediately to Meta (within 20 seconds)
  res.status(200).json({ status: 'received' });

  try {
    // Verify webhook signature from Meta
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!verifyWebhookSignature(req.body, signature)) {
      console.warn('⚠️ Invalid webhook signature from Meta');
      return;
    }

    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    await whatsappService.processWebhook(body);

  } catch (err: any) {
    // Log error but DON'T include sensitive data
    console.error('Webhook processing error:', err.message);
  }
});

/**
 * Verify that the webhook payload came from Meta
 * Using X-Hub-Signature-256 header
 */
function verifyWebhookSignature(payload: any, signature: string): boolean {
  if (!signature || !signature.startsWith('sha256=')) return false;

  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.warn('META_APP_SECRET not configured, skipping signature verification');
    return true; // In dev mode without secret
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export default router;
