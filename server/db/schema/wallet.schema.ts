import { pgTable, text, serial, timestamp, integer, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

// Transaction type enum
export const transactionTypeEnum = pgEnum('transaction_type', ['credit', 'debit']);

// Transaction status enum
export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'completed',
  'failed',
  'cancelled',
  'refunded',
]);

// Payment method enum
export const paymentMethodEnum = pgEnum('payment_method', [
  'credit_card',
  'debit_card',
  'bank_transfer',
  'paypal',
  'stripe',
  'razorpay',
  'wallet',
  'manual',
]);

export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull().unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  balance: decimal('balance', { precision: 10, scale: 2 }).notNull().default('0.00'),
  currency: text('currency').notNull().default('USD'),
  isActive: integer('is_active').default(1), // 1 for active, 0 for inactive
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id')
    .notNull()
    .references(() => wallets.id, { onDelete: 'cascade' }),
  type: transactionTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  referenceId: text('reference_id'), // payment gateway transaction ID
  paymentMethod: paymentMethodEnum('payment_method'),
  status: transactionStatusEnum('status').notNull().default('pending'),
  campaignId: integer('campaign_id'), // optional reference to campaign if transaction is for ad spend
  adId: integer('ad_id'), // optional reference to ad if transaction is for specific ad
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
