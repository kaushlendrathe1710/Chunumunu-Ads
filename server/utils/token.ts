import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Get JWT secret from environment or use a default for development
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-for-dev-only';

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a signed impression token that contains the impression ID and expiration
 */
export function generateImpressionToken(impressionId: number, expiresAt: Date): string {
  const payload = {
    impressionId,
    expiresAt: expiresAt.toISOString(),
    type: 'impression',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000), // seconds until expiration
  });
}

/**
 * Verify and decode an impression token
 */
export function verifyImpressionToken(
  token: string
): { impressionId: number; expiresAt: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.type !== 'impression') {
      return null;
    }

    return {
      impressionId: decoded.impressionId,
      expiresAt: decoded.expiresAt,
    };
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Generate a simple UUID-based token (alternative to signed tokens)
 */
export function generateSimpleToken(): string {
  return generateUUID();
}

/**
 * Generate a secure random token for impression tracking
 * Uses crypto.randomBytes for additional security
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token for storage (if we want to store hashed versions)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify if a token matches its hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  return hashToken(token) === hash;
}
