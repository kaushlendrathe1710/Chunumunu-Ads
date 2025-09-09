import { db } from '@server/db';
import { wallets, transactions } from '@server/db/schema/wallet.schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export interface CreateWalletData {
  userId: number;
  balance?: string;
  currency?: string;
}

export interface CreateTransactionData {
  walletId: number;
  type: 'credit' | 'debit';
  amount: string;
  description?: string;
  referenceId?: string;
  paymentMethod?:
    | 'credit_card'
    | 'debit_card'
    | 'bank_transfer'
    | 'paypal'
    | 'stripe'
    | 'razorpay'
    | 'wallet'
    | 'manual';
  campaignId?: number;
  adId?: number;
  metadata?: string;
}

export class WalletService {
  // Wallet methods
  static async createWallet(walletData: CreateWalletData) {
    const [wallet] = await db
      .insert(wallets)
      .values({
        ...walletData,
        balance: walletData.balance || '0.00',
        currency: walletData.currency || 'USD',
      })
      .returning();

    return wallet;
  }

  static async getWalletByUserId(userId: number) {
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    return wallet;
  }

  static async getOrCreateWallet(userId: number) {
    let wallet = await this.getWalletByUserId(userId);

    if (!wallet) {
      wallet = await this.createWallet({ userId });
    }

    return wallet;
  }

  static async updateBalance(walletId: number, newBalance: string) {
    const [updatedWallet] = await db
      .update(wallets)
      .set({
        balance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, walletId))
      .returning();

    return updatedWallet;
  }

  // Transaction methods
  static async createTransaction(transactionData: CreateTransactionData) {
    return await db.transaction(async (tx) => {
      // Create the transaction record
      const [transaction] = await tx.insert(transactions).values(transactionData).returning();

      // Update wallet balance
      const wallet = await tx.query.wallets.findFirst({
        where: eq(wallets.id, transactionData.walletId),
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const currentBalance = parseFloat(wallet.balance);
      const transactionAmount = parseFloat(transactionData.amount);

      let newBalance: number;
      if (transactionData.type === 'credit') {
        newBalance = currentBalance + transactionAmount;
      } else {
        newBalance = currentBalance - transactionAmount;

        // Check for sufficient balance
        if (newBalance < 0) {
          throw new Error('Insufficient balance');
        }
      }

      await tx
        .update(wallets)
        .set({
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, transactionData.walletId));

      // Update transaction status to completed
      const [completedTransaction] = await tx
        .update(transactions)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, transaction.id))
        .returning();

      return completedTransaction;
    });
  }

  static async getTransactionHistory(walletId: number, limit = 50, offset = 0) {
    const transactionHistory = await db.query.transactions.findMany({
      where: eq(transactions.walletId, walletId),
      orderBy: [desc(transactions.createdAt)],
      limit,
      offset,
    });

    return transactionHistory;
  }

  static async getTransactionById(transactionId: number) {
    const transaction = await db.query.transactions.findFirst({
      where: eq(transactions.id, transactionId),
    });

    return transaction;
  }

  // Budget management methods
  static async deductCampaignBudget(
    userId: number,
    campaignId: number,
    amount: string,
    description: string
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    const transaction = await this.createTransaction({
      walletId: wallet.id,
      type: 'debit',
      amount,
      description,
      campaignId,
      paymentMethod: 'wallet',
    });

    return transaction;
  }

  static async deductAdBudget(
    userId: number,
    adId: number,
    campaignId: number,
    amount: string,
    description: string
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    const transaction = await this.createTransaction({
      walletId: wallet.id,
      type: 'debit',
      amount,
      description,
      campaignId,
      adId,
      paymentMethod: 'wallet',
    });

    return transaction;
  }

  static async addFunds(
    userId: number,
    amount: string,
    description: string,
    paymentMethod: string,
    referenceId?: string
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    const transaction = await this.createTransaction({
      walletId: wallet.id,
      type: 'credit',
      amount,
      description,
      paymentMethod: paymentMethod as any,
      referenceId,
    });

    return transaction;
  }

  // Get campaign spending
  static async getCampaignSpending(campaignId: number) {
    const result = await db
      .select({
        totalSpent: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.campaignId, campaignId),
          eq(transactions.type, 'debit'),
          eq(transactions.status, 'completed')
        )
      );

    return parseFloat(result[0]?.totalSpent || '0');
  }

  // Get ad spending
  static async getAdSpending(adId: number) {
    const result = await db
      .select({
        totalSpent: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.adId, adId),
          eq(transactions.type, 'debit'),
          eq(transactions.status, 'completed')
        )
      );

    return parseFloat(result[0]?.totalSpent || '0');
  }

  // Refund methods for when campaigns/ads are deleted
  static async refundCampaignBudget(
    userId: number,
    campaignId: number,
    amount: string,
    description: string
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    const transaction = await this.createTransaction({
      walletId: wallet.id,
      type: 'credit',
      amount,
      description,
      campaignId,
      paymentMethod: 'wallet',
    });

    return transaction;
  }

  static async refundAdBudget(
    userId: number,
    adId: number,
    campaignId: number,
    amount: string,
    description: string
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    const transaction = await this.createTransaction({
      walletId: wallet.id,
      type: 'credit',
      amount,
      description,
      campaignId,
      adId,
      paymentMethod: 'wallet',
    });

    return transaction;
  }
}
