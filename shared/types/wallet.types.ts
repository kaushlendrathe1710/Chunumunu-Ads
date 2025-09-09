export interface Wallet {
  id: number;
  userId: number;
  balance: string;
  currency: string;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: number;
  walletId: number;
  type: 'credit' | 'debit';
  amount: string;
  description?: string;
  referenceId?: string;
  paymentMethod?: 'credit_card' | 'debit_card' | 'bank_transfer' | 'paypal' | 'stripe' | 'razorpay' | 'wallet' | 'manual';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  campaignId?: number;
  adId?: number;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Insert types (for creating new records)
export interface InsertWallet {
  userId: number;
  balance?: string;
  currency?: string;
  isActive?: number;
}

export interface InsertTransaction {
  walletId: number;
  type: 'credit' | 'debit';
  amount: string;
  description?: string;
  referenceId?: string;
  paymentMethod?: 'credit_card' | 'debit_card' | 'bank_transfer' | 'paypal' | 'stripe' | 'razorpay' | 'wallet' | 'manual';
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  campaignId?: number;
  adId?: number;
  metadata?: string;
}
