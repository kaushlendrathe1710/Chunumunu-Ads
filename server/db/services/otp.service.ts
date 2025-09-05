import { db } from '@server/db/connect';
import { OtpCode, InsertOtpCode } from '@shared/types/index';
import { otpCodes } from '@server/db/schema';
import { eq, and, gte } from 'drizzle-orm';

// OTP operations
export async function createOtp(insertOtp: InsertOtpCode): Promise<OtpCode> {
  // Delete any existing OTP for this email first
  await db.delete(otpCodes).where(eq(otpCodes.email, insertOtp.email));

  // Create new OTP
  const result = await db.insert(otpCodes).values(insertOtp).returning();
  return result[0];
}

export async function getOtpByEmail(email: string): Promise<OtpCode | undefined> {
  const result = await db.select().from(otpCodes).where(eq(otpCodes.email, email));
  return result[0];
}

export async function deleteOtp(emailOrId: string | number): Promise<void> {
  if (typeof emailOrId === 'number') {
    await db.delete(otpCodes).where(eq(otpCodes.id, emailOrId));
  } else {
    await db.delete(otpCodes).where(eq(otpCodes.email, emailOrId));
  }
}

export async function getValidOtp(email: string, code: string): Promise<OtpCode | undefined> {
  const result = await db
    .select()
    .from(otpCodes)
    .where(
      and(eq(otpCodes.email, email), eq(otpCodes.code, code), gte(otpCodes.expiresAt, new Date()))
    );
  return result[0];
}

export const otpService = {
  createOtp,
  getOtpByEmail,
  deleteOtp,
  getValidOtp,
};
