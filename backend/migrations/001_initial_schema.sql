-- WhatsFlow Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- ORGANIZATIONS
-- ─────────────────────────────────────────────
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  plan        VARCHAR(50) DEFAULT 'free',
  status      VARCHAR(50) DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(50) DEFAULT 'agent' CHECK (role IN ('owner','admin','manager','agent','developer')),
  avatar_url      VARCHAR(500),
  status          VARCHAR(50) DEFAULT 'active',
  last_login_at   TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- BUSINESSES
-- ─────────────────────────────────────────────
CREATE TABLE businesses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  industry        VARCHAR(100),
  website         VARCHAR(500),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  address         TEXT,
  logo_url        VARCHAR(500),
  status          VARCHAR(50) DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- WHATSAPP ACCOUNTS
-- NOTE: Access tokens stored AES-256-GCM encrypted
-- ─────────────────────────────────────────────
CREATE TABLE whatsapp_accounts (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id             UUID REFERENCES businesses(id) ON DELETE CASCADE,
  display_name            VARCHAR(255) NOT NULL,
  phone_number            VARCHAR(50),
  phone_number_id         VARCHAR(100) NOT NULL,   -- Meta Phone Number ID
  waba_id                 VARCHAR(100) NOT NULL,   -- WhatsApp Business Account ID
  meta_app_id             VARCHAR(100),
  api_version             VARCHAR(20) DEFAULT 'v25.0',
  
  -- TOKEN IS NEVER STORED PLAINTEXT
  encrypted_access_token  TEXT NOT NULL,   -- AES-256-GCM encrypted
  token_iv                VARCHAR(64),     -- Initialization vector
  token_auth_tag          VARCHAR(64),     -- GCM auth tag
  
  webhook_url             VARCHAR(500),
  webhook_verify_token    VARCHAR(255),    -- Stored hashed
  webhook_verified        BOOLEAN DEFAULT FALSE,
  
  status                  VARCHAR(50) DEFAULT 'pending',
  connection_error        TEXT,            -- Last error (no tokens in here)
  last_tested_at          TIMESTAMP,
  
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CONTACTS
-- ─────────────────────────────────────────────
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(50) NOT NULL,
  email           VARCHAR(255),
  company         VARCHAR(255),
  status          VARCHAR(50) DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (business_id, phone)
);

-- ─────────────────────────────────────────────
-- CONTACT TAGS
-- ─────────────────────────────────────────────
CREATE TABLE contact_tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE,
  tag         VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CONTACT GROUPS
-- ─────────────────────────────────────────────
CREATE TABLE contact_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  color       VARCHAR(20),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contact_group_members (
  group_id    UUID REFERENCES contact_groups(id) ON DELETE CASCADE,
  contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE,
  added_at    TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (group_id, contact_id)
);

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  business_id     UUID REFERENCES businesses(id),
  wa_account_id   UUID REFERENCES whatsapp_accounts(id),
  conversation_id UUID, -- Will add foreign key later
  wa_message_id   VARCHAR(255) UNIQUE,    -- Meta's message ID (meta_message_id)
  direction       VARCHAR(20) DEFAULT 'outbound',
  
  -- Recipient/Sender
  recipient_phone VARCHAR(50),
  sender_phone    VARCHAR(50),
  contact_id      UUID REFERENCES contacts(id),
  
  -- Message Content
  message_type    VARCHAR(50) NOT NULL,   -- text, template, image, etc.
  message_body    TEXT,
  template_id     UUID,
  template_name   VARCHAR(255),
  media_url       VARCHAR(500),
  
  -- Status Tracking
  status          VARCHAR(50) DEFAULT 'queued',
  error_code      VARCHAR(50),
  error_message   TEXT,                  -- Human-readable, NO tokens
  
  -- Timestamps
  queued_at       TIMESTAMP DEFAULT NOW(),
  sent_at         TIMESTAMP,
  delivered_at    TIMESTAMP,
  read_at         TIMESTAMP,
  failed_at       TIMESTAMP,
  received_at     TIMESTAMP,
  
  -- Campaign reference
  campaign_id     UUID,
  
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_wa_message_id ON messages(wa_message_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_phone);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ─────────────────────────────────────────────
-- CONVERSATIONS
-- ─────────────────────────────────────────────
CREATE TABLE conversations (
  id                                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id                    UUID REFERENCES organizations(id),
  business_id                        UUID REFERENCES businesses(id),
  wa_account_id                      UUID REFERENCES whatsapp_accounts(id),
  contact_id                         UUID REFERENCES contacts(id),
  contact_phone                      VARCHAR(50),
  status                             VARCHAR(50) DEFAULT 'active',
  direction                          VARCHAR(20),
  last_inbound_message_at            TIMESTAMP,
  last_outbound_message_at           TIMESTAMP,
  customer_service_window_started_at TIMESTAMP,
  customer_service_window_expires_at TIMESTAMP,
  last_message_id                    UUID REFERENCES messages(id),
  assigned_to                        UUID REFERENCES users(id),
  last_message_at                    TIMESTAMP,
  unread_count                       INTEGER DEFAULT 0,
  created_at                         TIMESTAMP DEFAULT NOW(),
  updated_at                         TIMESTAMP DEFAULT NOW()
);

ALTER TABLE messages ADD CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id);

-- ─────────────────────────────────────────────
-- MESSAGE TEMPLATES
-- ─────────────────────────────────────────────
CREATE TABLE message_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  wa_account_id   UUID REFERENCES whatsapp_accounts(id),
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100),        -- MARKETING, UTILITY, AUTHENTICATION
  language        VARCHAR(20),
  
  -- Template Structure
  header_type     VARCHAR(50),         -- text, image, video, document, none
  header_content  TEXT,
  body            TEXT NOT NULL,
  footer          TEXT,
  buttons         JSONB,
  
  -- Meta Status
  meta_template_id VARCHAR(255),
  status          VARCHAR(50) DEFAULT 'draft',
  rejection_reason TEXT,
  
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CAMPAIGNS
-- ─────────────────────────────────────────────
CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  wa_account_id   UUID REFERENCES whatsapp_accounts(id),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  template_id     UUID REFERENCES message_templates(id),
  audience_type   VARCHAR(50),         -- group, all, custom
  audience_id     UUID,                -- Contact group ID if audience_type=group
  status          VARCHAR(50) DEFAULT 'draft',
  scheduled_at    TIMESTAMP,
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  
  -- Statistics
  total_recipients  INTEGER DEFAULT 0,
  queued_count      INTEGER DEFAULT 0,
  sent_count        INTEGER DEFAULT 0,
  delivered_count   INTEGER DEFAULT 0,
  read_count        INTEGER DEFAULT 0,
  failed_count      INTEGER DEFAULT 0,
  
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE campaign_recipients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id  UUID REFERENCES contacts(id),
  phone       VARCHAR(50) NOT NULL,
  message_id  UUID REFERENCES messages(id),
  status      VARCHAR(50) DEFAULT 'queued',
  variables   JSONB,
  processed_at TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- WEBHOOK EVENTS
-- ─────────────────────────────────────────────
CREATE TABLE webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wa_account_id   UUID,
  event_type      VARCHAR(100),
  payload         JSONB,               -- Raw webhook payload (sanitized)
  processed       BOOLEAN DEFAULT FALSE,
  error           TEXT,
  received_at     TIMESTAMP DEFAULT NOW(),
  processed_at    TIMESTAMP
);

-- ─────────────────────────────────────────────
-- API KEYS
-- ─────────────────────────────────────────────
CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  key_hash        VARCHAR(255) NOT NULL,  -- SHA-256 hash, never store plaintext
  key_prefix      VARCHAR(20),            -- First 8 chars for identification
  status          VARCHAR(50) DEFAULT 'active',
  last_used_at    TIMESTAMP,
  expires_at      TIMESTAMP,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(255) NOT NULL,
  resource    VARCHAR(255),
  resource_id UUID,
  details     JSONB,                   -- Must NOT contain tokens/secrets
  ip_address  INET,
  status      VARCHAR(50) DEFAULT 'success',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50),
  title       VARCHAR(255),
  message     TEXT,
  read        BOOLEAN DEFAULT FALSE,
  action_url  VARCHAR(500),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_contacts_business ON contacts(business_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_messages_campaign ON messages(campaign_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
