import { db } from '../config/database';

export interface MessageDecisionRequest {
  businessId: string;
  whatsappAccountId: string;
  contactId?: string;
  contactPhone: string;
  messageType: string;
  templateId?: string;
}

export interface MessageDecisionResult {
  allowed: boolean;
  mode: 'CUSTOMER_SERVICE_REPLY' | 'BUSINESS_INITIATED';
  templateRequired: boolean;
  conversationStatus: 'ACTIVE' | 'EXPIRED' | 'NONE';
  reason: string | null;
  conversationId?: string;
}

export class MessagingDecisionService {
  /**
   * Determine the mode and rules for an outgoing message.
   */
  async resolveMessageMode(req: MessageDecisionRequest): Promise<MessageDecisionResult> {
    // 1. Find existing conversation with this phone/contact for this WA account
    let conversation = null;
    if (req.contactId) {
      conversation = await db('conversations')
        .where({ business_id: req.businessId, wa_account_id: req.whatsappAccountId, contact_id: req.contactId })
        .first();
    } else {
      conversation = await db('conversations')
        .where({ business_id: req.businessId, wa_account_id: req.whatsappAccountId, contact_phone: req.contactPhone })
        .first();
    }

    const now = new Date();
    let isCustomerServiceWindowActive = false;

    if (conversation && conversation.customer_service_window_expires_at) {
      const expiresAt = new Date(conversation.customer_service_window_expires_at);
      if (expiresAt > now) {
        isCustomerServiceWindowActive = true;
      }
    }

    // 2. Decide Mode
    if (isCustomerServiceWindowActive) {
      return {
        allowed: true,
        mode: 'CUSTOMER_SERVICE_REPLY',
        templateRequired: false,
        conversationStatus: 'ACTIVE',
        reason: null,
        conversationId: conversation.id,
      };
    } else {
      // EXPIRED or NONE -> Business Initiated -> Template Required
      if (req.messageType !== 'template' || !req.templateId) {
        return {
          allowed: false,
          mode: 'BUSINESS_INITIATED',
          templateRequired: true,
          conversationStatus: conversation ? 'EXPIRED' : 'NONE',
          reason: 'An approved template is required to start a new conversation or reply outside the 24-hour window.',
          conversationId: conversation?.id,
        };
      } else {
        // Here we'd verify the template is approved, handled by the caller or a separate check.
        return {
          allowed: true,
          mode: 'BUSINESS_INITIATED',
          templateRequired: true,
          conversationStatus: conversation ? 'EXPIRED' : 'NONE',
          reason: null,
          conversationId: conversation?.id,
        };
      }
    }
  }

  /**
   * Updates conversation window based on an incoming message.
   * WhatsApp standard rules: 24-hour customer service window starts when customer messages business.
   */
  async handleInboundMessage(businessId: string, waAccountId: string, contactPhone: string, contactId?: string) {
    let conversation = await db('conversations')
      .where({ business_id: businessId, wa_account_id: waAccountId, contact_phone: contactPhone })
      .first();

    const now = new Date();
    // Customer service window expires in 24 hours
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (conversation) {
      await db('conversations').where({ id: conversation.id }).update({
        last_inbound_message_at: now,
        last_message_at: now,
        customer_service_window_started_at: now,
        customer_service_window_expires_at: expiresAt,
        status: 'active',
        updated_at: now,
      });
      return conversation.id;
    } else {
      const [id] = await db('conversations').insert({
        business_id: businessId,
        wa_account_id: waAccountId,
        contact_id: contactId,
        contact_phone: contactPhone,
        status: 'active',
        direction: 'inbound',
        last_inbound_message_at: now,
        last_message_at: now,
        customer_service_window_started_at: now,
        customer_service_window_expires_at: expiresAt,
      }).returning('id');
      return id;
    }
  }
}

export const messagingDecisionService = new MessagingDecisionService();
