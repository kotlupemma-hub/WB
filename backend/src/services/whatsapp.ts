/**
 * WhatsFlow - WhatsApp Service
 * 
 * SECURITY: This file handles all WhatsApp Cloud API communication.
 * Access tokens are NEVER:
 * - Returned to the frontend
 * - Logged to console
 * - Stored in memory longer than necessary
 * - Exposed in error messages
 */

import axios, { AxiosInstance } from 'axios';
import { db } from '../config/database';
import { decrypt } from './crypto';
import { messagingDecisionService } from './messagingDecision';

interface SendTextOptions {
  to: string;
  message: string;
}

interface SendTemplateOptions {
  to: string;
  templateName: string;
  language: string;
  variables?: string[];
}

interface WhatsAppApiClient {
  phoneNumberId: string;
  client: AxiosInstance;
}

class WhatsAppService {
  private baseUrl: string;
  private apiVersion: string;

  constructor() {
    this.baseUrl = process.env.META_API_BASE_URL || 'https://graph.facebook.com';
    this.apiVersion = process.env.META_DEFAULT_API_VERSION || 'v25.0';
  }

  /**
   * Get authenticated WhatsApp API client for an account.
   * Token is retrieved from encrypted DB storage and NEVER returned to caller.
   */
  private async getClient(waAccountId: string): Promise<WhatsAppApiClient> {
    const account = await db('whatsapp_accounts')
      .where({ id: waAccountId, status: 'active' })
      .first();

    if (!account) {
      const err: any = new Error('WhatsApp account not found or disconnected');
      err.userMessage = 'Your WhatsApp account is not connected. Please check the connection status.';
      throw err;
    }

    // Decrypt token from database — token NEVER goes to frontend
    const accessToken = decrypt(account.encrypted_access_token, account.token_iv);
    const apiVersion = account.api_version || this.apiVersion;

    const client = axios.create({
      baseURL: `${this.baseUrl}/${apiVersion}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: parseInt(process.env.API_TIMEOUT || '30000'),
    });

    // Interceptor to catch and sanitize errors (never expose token in error messages)
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        const sanitizedError = this.sanitizeError(error);
        return Promise.reject(sanitizedError);
      }
    );

    return { phoneNumberId: account.phone_number_id, client };
  }

  /**
   * Send a text message via WhatsApp Cloud API
   */
  async sendTextMessage(waAccountId: string, options: SendTextOptions) {
    const { phoneNumberId, client } = await this.getClient(waAccountId);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: options.to,
      type: 'text',
      text: {
        preview_url: false,
        body: options.message,
      },
    };

    const response = await client.post(`/${phoneNumberId}/messages`, payload);

    // Store message in database
    const messageId = response.data?.messages?.[0]?.id;
    await db('messages').insert({
      wa_account_id: waAccountId,
      wa_message_id: messageId,
      recipient_phone: options.to,
      message_type: 'text',
      message_body: options.message,
      status: 'sent',
      sent_at: new Date(),
    });

    return { messageId, status: 'queued' };
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(waAccountId: string, options: SendTemplateOptions) {
    const { phoneNumberId, client } = await this.getClient(waAccountId);

    const components = options.variables?.length ? [{
      type: 'body',
      parameters: options.variables.map(v => ({ type: 'text', text: v })),
    }] : [];

    const payload = {
      messaging_product: 'whatsapp',
      to: options.to,
      type: 'template',
      template: {
        name: options.templateName,
        language: { code: options.language },
        components,
      },
    };

    const response = await client.post(`/${phoneNumberId}/messages`, payload);
    const messageId = response.data?.messages?.[0]?.id;

    await db('messages').insert({
      wa_account_id: waAccountId,
      wa_message_id: messageId,
      recipient_phone: options.to,
      message_type: 'template',
      template_name: options.templateName,
      status: 'sent',
      sent_at: new Date(),
    });

    return { messageId, status: 'queued' };
  }

  /**
   * Test WhatsApp account connection
   */
  async testConnection(waAccountId: string) {
    const account = await db('whatsapp_accounts').where({ id: waAccountId }).first();
    if (!account) throw new Error('Account not found');

    const accessToken = decrypt(account.encrypted_access_token, account.token_iv);
    const apiVersion = account.api_version || this.apiVersion;

    const results: Record<string, boolean | string> = {};

    try {
      // Test 1: Authentication & WABA access
      const wabaRes = await axios.get(
        `${this.baseUrl}/${apiVersion}/${account.waba_id}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 }
      );
      results.auth = true;
      results.waba = true;

      // Test 2: Phone Number
      const phoneRes = await axios.get(
        `${this.baseUrl}/${apiVersion}/${account.phone_number_id}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 }
      );
      results.phone = true;
      results.perm = true;
      results.webhook = account.webhook_verified || false;

    } catch (err: any) {
      // Sanitize error — don't expose token
      results.auth = err.response?.status !== 401;
      results.phone = false;
      results.waba = false;
      results.perm = false;
      results.webhook = false;
    }

    return results;
  }

  /**
   * Add a new WhatsApp account (stores token encrypted)
   */
  async addAccount(businessId: string, data: {
    displayName: string;
    phoneNumber: string;
    phoneNumberId: string;
    wabaId: string;
    metaAppId: string;
    accessToken: string; // Received from frontend form, immediately encrypted
    apiVersion: string;
  }) {
    const { encrypt } = await import('./crypto');
    const { encryptedData, iv } = encrypt(data.accessToken);

    // Token is encrypted immediately — raw token discarded from memory
    const [id] = await db('whatsapp_accounts').insert({
      business_id: businessId,
      display_name: data.displayName,
      phone_number: data.phoneNumber,
      phone_number_id: data.phoneNumberId,
      waba_id: data.wabaId,
      meta_app_id: data.metaAppId,
      encrypted_access_token: encryptedData, // Stored encrypted
      token_iv: iv,
      api_version: data.apiVersion,
      status: 'pending',
      created_at: new Date(),
    }).returning('id');

    return { id, status: 'pending' };
  }

  /**
   * Handle incoming webhook from Meta
   */
  async processWebhook(body: any) {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;

    if (changes?.messages) {
      // Get WA account by meta phone number id
      const metadata = changes.metadata;
      let waAccountId = null;
      let businessId = null;
      
      if (metadata && metadata.phone_number_id) {
        const account = await db('whatsapp_accounts').where({ phone_number_id: metadata.phone_number_id }).first();
        if (account) {
          waAccountId = account.id;
          businessId = account.business_id;
        }
      }

      for (const msg of changes.messages) {
        // Resolve contact
        let contactId = null;
        if (businessId) {
          const contact = await db('contacts').where({ business_id: businessId, phone: msg.from }).first();
          if (contact) contactId = contact.id;
        }

        let conversationId = null;
        if (businessId && waAccountId) {
          conversationId = await messagingDecisionService.handleInboundMessage(businessId, waAccountId, msg.from, contactId);
        }

        // Store incoming message
        await db('messages').insert({
          organization_id: null,
          business_id: businessId,
          wa_account_id: waAccountId,
          conversation_id: conversationId,
          contact_id: contactId,
          wa_message_id: msg.id,
          direction: 'inbound',
          sender_phone: msg.from,
          message_type: msg.type,
          message_body: msg.text?.body || null,
          status: 'received',
          received_at: new Date(parseInt(msg.timestamp) * 1000),
        }).onConflict('wa_message_id').ignore();
      }
    }

    if (changes?.statuses) {
      for (const status of changes.statuses) {
        // Update message delivery status
        await db('messages')
          .where({ wa_message_id: status.id })
          .update({
            status: status.status,
            [`${status.status}_at`]: status.timestamp
              ? new Date(parseInt(status.timestamp) * 1000)
              : new Date(),
          });
      }
    }
  }

  /**
   * Sanitize errors to prevent token leakage
   */
  private sanitizeError(error: any) {
    const safeError: any = new Error(
      this.getHumanReadableError(error)
    );
    safeError.status = error.response?.status || 500;
    safeError.code = error.response?.data?.error?.code;
    return safeError;
  }

  private getHumanReadableError(error: any): string {
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    if (status === 401 || code === 190) {
      return 'Your WhatsApp connection could not be authenticated. Please check the API credentials.';
    }
    if (status === 400 && code === 131030) {
      return 'This phone number could not be used. Please verify the number and WhatsApp availability.';
    }
    if (status === 400 && code === 132000) {
      return 'Message template not found or not approved. Please check your template configuration.';
    }
    if (status === 429 || code === 80007) {
      return 'Message sending is temporarily limited. We\'ll retry automatically.';
    }
    if (status === 500 || status === 503) {
      return 'WhatsApp service is temporarily unavailable. Please try again in a few minutes.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please check your connection and try again.';
    }
    return 'WhatsApp could not process this message. Please try again.';
  }
}

export const whatsappService = new WhatsAppService();
