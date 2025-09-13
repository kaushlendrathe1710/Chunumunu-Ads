import axios from 'axios';

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
  const { data } = await axios.get<{ wallet: WalletDto }>('/api/wallet', { withCredentials: true });
  return data.wallet;
}

export interface TransactionsPage {
  transactions: TransactionDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

export async function fetchWalletTransactions(page = 1, limit = 10): Promise<TransactionsPage> {
  const { data } = await axios.get<TransactionsPage>(
    `/api/wallet/transactions?page=${page}&limit=${limit}`,
    { withCredentials: true }
  );
  return {
    transactions: data.transactions || [],
    pagination: data.pagination,
  };
}

export async function addFunds(payload: AddFundsPayload) {
  const { data } = await axios.post('/api/wallet/add-funds', payload, {
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}
