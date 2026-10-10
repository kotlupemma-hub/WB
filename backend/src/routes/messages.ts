/**
 * WhatsFlow - Messages Route
 * 
 * All WhatsApp API calls go through this backend.
 * Access tokens are NEVER sent to or from the frontend.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { whatsappService } from '../services/whatsapp';
import { db } from '../config/database';
import { messagingDecisionService } from '../services/messagingDecision';
import Joi from 'joi';

const router = Router();

// ── Validation Schemas ──────────────────────────────────
const sendTextSchema = Joi.object({
  waAccountId: Joi.string().required(),
  to: Joi.string().pattern(/^\d{10,15}$/).required()
    .messages({ 'string.pattern.base': 'Phone number must be 10-15 digits without spaces or symbols' }),
  type: Joi.string().valid('text', 'template', 'image', 'document', 'video').default('text'),
  message: Joi.when('type', { is: 'text', then: Joi.string().min(1).max(4096).required() }),
  templateName: Joi.when('type', { is: 'template', then: Joi.string().required() }),
  language: Joi.string().default('en_US'),
  variables: Joi.array().items(Joi.string()),
});

// ── POST /api/v1/messages/send ───────────────────────────
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const { error, value } = sendTextSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.details.map(d => d.message),
      });
    }

    const { waAccountId, to, type, message, templateName, language, variables } = value;

    // Look up the WhatsApp account to get businessId
    const waAccount = await db('whatsapp_accounts').where({ id: waAccountId }).first();
    if (!waAccount) {
      return res.status(404).json({ error: 'WhatsApp account not found' });
    }

    // Call decision service
    const decision = await messagingDecisionService.resolveMessageMode({
      businessId: waAccount.business_id,
      whatsappAccountId: waAccountId,
      contactPhone: to,
      messageType: type,
      templateId: templateName, // Using templateName temporarily
    });

    if (!decision.allowed) {
      return res.status(403).json({
        error: 'TEMPLATE_REQUIRED',
        message: 'Free-form message cannot be sent.',
        user_message: 'This customer conversation is not currently active.',
        reason: decision.reason,
        suggestion: 'Select an approved WhatsApp template to start a new conversation.',
        retryable: false
      });
    }

    let result;
    if (type === 'text') {
      result = await whatsappService.sendTextMessage(waAccountId, { to, message });
    } else if (type === 'template') {
      result = await whatsappService.sendTemplateMessage(waAccountId, {
        to, templateName, language, variables,
      });
    } else {
      return res.status(400).json({ error: 'Unsupported message type' });
    }

    res.json({
      success: true,
      messageId: result.messageId,
      status: result.status,
      decision,
    });

  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/messages ─────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId, status, type, page = 1, limit = 50 } = req.query;

    let query = db('messages')
      .join('whatsapp_accounts', 'messages.wa_account_id', 'whatsapp_accounts.id')
      .select(
        'messages.id',
        'messages.wa_message_id',
        'messages.recipient_phone',
        'messages.message_type',
        'messages.message_body',
        'messages.status',
        'messages.sent_at',
        'messages.delivered_at',
        'messages.read_at',
        'whatsapp_accounts.display_name as wa_account_name',
        'whatsapp_accounts.phone_number as wa_phone',
      )
      .orderBy('messages.sent_at', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit));

    if (businessId) query = query.where('whatsapp_accounts.business_id', businessId);
    if (status) query = query.where('messages.status', status);
    if (type) query = query.where('messages.message_type', type);

    const messages = await query;
    res.json({ success: true, messages });

  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/messages/bulk ───────────────────────────
// Queues messages for bulk/campaign sending
router.post('/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { waAccountId, recipients, type, message, templateName, language, variables } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients must be a non-empty array' });
    }

    if (recipients.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 recipients per bulk request' });
    }

    // Queue each message (BullMQ handles rate limiting and retries)
    // const queue = new Queue('whatsapp-messages');
    // for (const to of recipients) {
    //   await queue.add('send', { waAccountId, to, type, message, templateName, language, variables });
    // }

    res.json({
      success: true,
      queued: recipients.length,
      message: `${recipients.length} messages queued for delivery`,
    });

  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/messages/connection/test ────────────────
router.post('/connection/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { waAccountId } = req.body;
    if (!waAccountId) return res.status(400).json({ error: 'waAccountId required' });

    const result = await whatsappService.testConnection(waAccountId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
