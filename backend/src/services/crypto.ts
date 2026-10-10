/**
 * WhatsFlow - Credential Encryption Service
 * 
 * All WhatsApp access tokens and sensitive credentials are encrypted
 * using AES-256-GCM before storage and decrypted server-side only.
 * 
 * SECURITY: Encryption key MUST be stored in server environment variable.
 * Never commit the actual key to version control.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Cannot encrypt credentials.');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes).`);
  }
  return key;
}

export interface EncryptResult {
  encryptedData: string; // hex-encoded encrypted ciphertext
  iv: string;            // hex-encoded initialization vector
  authTag: string;       // hex-encoded GCM auth tag
}

/**
 * Encrypt sensitive data (access tokens, secrets)
 * @param plaintext - The sensitive value to encrypt
 * @returns Encrypted data with IV and auth tag (safe to store in DB)
 */
export function encrypt(plaintext: string): EncryptResult {
  if (!plaintext) throw new Error('Cannot encrypt empty value');

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16); // 128-bit IV for GCM
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Zero out plaintext from memory as quickly as possible
  // (TypeScript strings are immutable, but we can null the reference)
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt sensitive data
 * @param encryptedData - hex-encoded ciphertext
 * @param ivHex - hex-encoded IV
 * @param authTagHex - hex-encoded auth tag
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string, ivHex: string, authTagHex?: string): string {
  if (!encryptedData || !ivHex) throw new Error('Missing encrypted data or IV');

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  if (authTagHex) {
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  }

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a cryptographically secure random token for webhooks etc.
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive values for comparison (e.g., API keys) without storing plaintext
 */
export function hash(value: string): string {
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

/**
 * Mask a token for display (never show full token)
 * Example: "EAAH..." -> "•••••••••••••••••sk4x"
 */
export function maskToken(token: string): string {
  if (!token || token.length < 8) return '••••••••';
  return '•'.repeat(20) + token.slice(-4);
}
