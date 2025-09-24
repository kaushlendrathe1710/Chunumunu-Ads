import { apiClient } from './apiClient';

export interface WalletDto {
  id: number;
  balance: string;
  currency: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionDto {
  id: number;
  type: 'credit' | 'debit';
  amount: string;
  description?: string;
  status: string;
  paymentMethod?: string;
  campaignId?: number;
  adId?: number;
  createdAt: string;
}

export interface AddFundsPayload {
  amount: number;
  description?: string;
  paymentMethod: string;
}

export async function fetchWallet() {
  const { data } = await apiClient.get<{ wallet: WalletDto }>('/wallet');
  return data.wallet;
}

export interface TransactionsPage {
  transactions: TransactionDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

export async function fetchWalletTransactions(page = 1, limit = 10): Promise<TransactionsPage> {
  const { data } = await apiClient.get<TransactionsPage>(
    `/wallet/transactions?page=${page}&limit=${limit}`
  );
  return {
    transactions: data.transactions || [],
    pagination: data.pagination,
  };
}

export async function addFunds(payload: AddFundsPayload) {
  const { data } = await apiClient.post('/wallet/add-funds', payload);
  return data;
}
