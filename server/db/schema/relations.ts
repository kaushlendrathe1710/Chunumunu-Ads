import { relations } from 'drizzle-orm';
import { users, otpCodes, session } from './user.schema';

// OTP codes table relations (standalone table for email verification)
export const otpCodesRelations = relations(otpCodes, () => ({}));

// Session table relations (standalone table for express-session)
export const sessionRelations = relations(session, () => ({}));
