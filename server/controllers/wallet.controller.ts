import { Response } from 'express';
import { z } from 'zod';
import { WalletService } from '../db/services/wallet.service';
import { AuthenticatedRequest } from '../types';

// Validation schemas
const addFundsSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
  paymentMethod: z.enum([
    'credit_card',
    'debit_card',
    'bank_transfer',
    'paypal',
    'stripe',
    'razorpay',
  ]),
  referenceId: z.string().optional(),
});

const transactionQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});

export class WalletController {
  static async getWallet(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const wallet = await WalletService.getOrCreateWallet(userId);

      res.json({
        wallet: {
          id: wallet.id,
          balance: wallet.balance,
          currency: wallet.currency,
          isActive: wallet.isActive,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({ error: 'Failed to fetch wallet' });
    }
  }

  static async addFunds(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = addFundsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const userId = req.user!.id;
      const { amount, description, paymentMethod, referenceId } = validation.data;

      const transaction = await WalletService.addFunds(
        userId,
        amount.toString(),
        description || `Added funds via ${paymentMethod}`,
        paymentMethod,
        referenceId
      );

      res.status(201).json({
        message: 'Funds added successfully',
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          status: transaction.status,
          createdAt: transaction.createdAt,
        },
      });
    } catch (error) {
      console.error('Add funds error:', error);

      if (error instanceof Error && error.message === 'Insufficient balance') {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      res.status(500).json({ error: 'Failed to add funds' });
    }
  }

  static async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = transactionQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const userId = req.user!.id;
      const { page, limit } = validation.data;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const wallet = await WalletService.getOrCreateWallet(userId);
      const [transactions, totalCount] = await Promise.all([
        WalletService.getTransactionHistory(wallet.id, limitNum, offset),
        WalletService.getTransactionCount(wallet.id),
      ]);

      res.json({
        transactions: transactions.map((transaction) => ({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          status: transaction.status,
          paymentMethod: transaction.paymentMethod,
          campaignId: transaction.campaignId,
          adId: transaction.adId,
          createdAt: transaction.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum) || 1,
          hasMore: pageNum * limitNum < totalCount,
        },
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  static async getTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { transactionId } = req.params;
      const userId = req.user!.id;

      // First verify that the transaction belongs to the user's wallet
      const wallet = await WalletService.getOrCreateWallet(userId);
      const transaction = await WalletService.getTransactionById(parseInt(transactionId));

      if (!transaction || transaction.walletId !== wallet.id) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json({
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          status: transaction.status,
          paymentMethod: transaction.paymentMethod,
          referenceId: transaction.referenceId,
          campaignId: transaction.campaignId,
          adId: transaction.adId,
          metadata: transaction.metadata,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  }

  static async getWalletBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const wallet = await WalletService.getOrCreateWallet(userId);

      res.json({
        balance: wallet.balance,
        currency: wallet.currency,
      });
    } catch (error) {
      console.error('Get wallet balance error:', error);
      res.status(500).json({ error: 'Failed to fetch wallet balance' });
    }
  }
}
