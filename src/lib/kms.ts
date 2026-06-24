import crypto from "crypto";

// This is a mock KMS implementation for encrypting/decrypting broker API keys.
// In a real production environment, this would integrate with AWS KMS, Google Cloud KMS, or HashiCorp Vault.

const MOCK_KMS_KEY = process.env.KMS_SECRET_KEY || "0123456789abcdef0123456789abcdef"; // 32 byte key
const ALGORITHM = "aes-256-gcm";

/**
 * Encrypts a sensitive string (like a broker API secret) using the mock KMS.
 * @param plaintext The plain text secret to encrypt
 * @returns A base64 encoded string containing the iv, auth tag, and encrypted data
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(MOCK_KMS_KEY), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData
  const payload = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  return Buffer.from(payload).toString('base64');
}

/**
 * Decrypts a previously encrypted secret.
 * @param ciphertext The base64 encoded ciphertext string
 * @returns The decrypted plain text secret
 */
export async function decryptSecret(ciphertext: string): Promise<string> {
  const payload = Buffer.from(ciphertext, 'base64').toString('utf8');
  const [ivHex, authTagHex, encryptedHex] = payload.split(':');
  
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(MOCK_KMS_KEY), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
