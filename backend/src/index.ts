/**
 * WhatsFlow Backend - Main Server
 * 
 * SECURITY NOTES:
 * - WhatsApp access tokens are NEVER sent to the frontend
 * - All tokens are stored AES-256-GCM encrypted in PostgreSQL
 * - This server acts as a secure proxy to the WhatsApp Cloud API
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ──────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow HTTP-only cookies
}));

app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests. Message sending is temporarily limited. We\'ll retry automatically.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Message sending rate limited. Please wait before sending more messages.' },
});

app.use('/api/', limiter);
app.use('/api/v1/messages/', messageLimiter);

// ── Static Frontend ──────────────────────────────────────
app.use(express.static(path.join(__dirname, '../../'), {
  index: 'index.html',
}));

// ── Webhook Endpoint (BEFORE auth middleware) ────────────
app.use('/webhook', require('./routes/webhook').default);

// ── API Routes ───────────────────────────────────────────
// import authMiddleware from './middleware/auth';
// app.use('/api/v1', authMiddleware);

app.use('/api/v1/messages',  require('./routes/messages').default);
app.use('/api/v1/contacts',  require('./routes/contacts').default);
app.use('/api/v1/templates', require('./routes/templates').default);
app.use('/api/v1/campaigns', require('./routes/campaigns').default);
app.use('/api/v1/whatsapp',  require('./routes/whatsapp').default);
app.use('/api/v1/auth',      require('./routes/auth').default);

// ── Health Check ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── Error Handler ────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err.message); // Never log tokens
  
  const userMessage = err.userMessage || getHumanReadableError(err);
  res.status(err.status || 500).json({
    error: userMessage,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

function getHumanReadableError(err: any): string {
  if (err.code === 'ECONNREFUSED') return 'Unable to connect to WhatsApp API. Please try again.';
  if (err.message?.includes('token')) return 'Your WhatsApp connection could not be authenticated. Please check the API credentials.';
  if (err.message?.includes('phone')) return 'This phone number could not be used. Please verify the number and WhatsApp availability.';
  if (err.status === 429) return 'Message sending is temporarily limited. We\'ll retry automatically.';
  return 'WhatsApp could not process this message. Please try again.';
}

// ── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 WhatsFlow Backend running on port ${PORT}`);
  console.log(`📱 WhatsApp API: ${process.env.META_API_BASE_URL || 'https://graph.facebook.com'}`);
  console.log(`🔒 Security: Credentials encrypted, tokens server-side only`);
});

export default app;
