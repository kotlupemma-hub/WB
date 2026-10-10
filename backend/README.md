# WhatsFlow Backend

A secure Node.js/Express backend for the WhatsFlow WhatsApp Business Messaging Platform.

## Stack
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via pg/knex)
- **Queue**: BullMQ + Redis
- **Auth**: JWT + HTTP-only cookies
- **Encryption**: AES-256 for credential storage

## Setup

```bash
npm install
cp .env.example .env
# Fill in your credentials in .env
npm run dev
```

## Structure
```
backend/
├── src/
│   ├── index.ts          # Entry point
│   ├── config/           # Configuration
│   ├── routes/           # API routes
│   │   ├── messages.ts   # Message sending
│   │   ├── contacts.ts   # Contact management
│   │   ├── templates.ts  # Template management
│   │   ├── campaigns.ts  # Campaign management
│   │   ├── whatsapp.ts   # WhatsApp account management
│   │   └── webhook.ts    # WhatsApp webhook handler
│   ├── services/
│   │   ├── whatsapp.ts   # WhatsApp Cloud API integration
│   │   ├── queue.ts      # Message queue (BullMQ)
│   │   ├── crypto.ts     # Credential encryption
│   │   └── auth.ts       # Authentication
│   ├── models/           # Database models
│   └── middleware/       # Auth, rate limiting, etc.
├── migrations/           # Database migrations
└── .env.example
```

## Security
- Access tokens NEVER sent to frontend
- All tokens encrypted with AES-256-GCM before database storage
- HTTP-only session cookies
- CSRF protection on all state-changing endpoints
- Rate limiting on all API endpoints
- Input validation on all endpoints
- Webhook signature verification
