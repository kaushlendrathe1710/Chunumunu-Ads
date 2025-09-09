import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All wallet routes require authentication
router.use(authenticate);

// Wallet management routes
router.get('/', WalletController.getWallet);
router.get('/balance', WalletController.getWalletBalance);
router.post('/add-funds', WalletController.addFunds);

// Transaction routes
router.get('/transactions', WalletController.getTransactions);
router.get('/transactions/:transactionId', WalletController.getTransaction);

export default router;
