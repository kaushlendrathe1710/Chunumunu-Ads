import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import {
  fetchWallet as fetchWalletApi,
  fetchWalletTransactions,
  addFunds as addFundsApi,
  AddFundsPayload,
  WalletDto,
  TransactionDto,
  TransactionsPage,
} from '@/api/walletApi';
import { SmartPagination } from '@/components/ui/SmartPagination';
import AddFundsDialog from '@/components/wallet/AddFundsDialog';

export default function WalletPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletDto | null>({
    queryKey: QK.wallet(),
    placeholderData: (prev) => prev, // keep previous balance during refetch
    queryFn: async () => {
      try {
        return await fetchWalletApi();
      } catch (e: any) {
        toast.error(e.message || 'Failed to load wallet');
        return null;
      }
    },
  });

  const { data: txPage, isLoading: txLoading } = useQuery<TransactionsPage>({
    queryKey: QK.walletTx(page, pageSize),
    queryFn: async () => {
      try {
        return await fetchWalletTransactions(page, pageSize);
      } catch (e: any) {
        toast.error(e.message || 'Failed to load transactions');
        return {
          transactions: [],
          pagination: { page, limit: pageSize, total: 0, totalPages: 1, hasMore: false },
        };
      }
    },
    placeholderData: (prev) => prev, // preserve previous page data while loading
  });
  const transactions: TransactionDto[] = txPage?.transactions || [];
  const pagination = txPage?.pagination;
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const loading = walletLoading || txLoading;
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg">Loading wallet...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground">
            Manage your funds and track spending on campaigns and ads
          </p>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${parseFloat(wallet?.balance || '0').toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">{wallet?.currency || 'USD'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
          </CardContent>
        </Card>
        {/* Add Funds Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col items-center justify-between gap-2">
              <AddFundsDialog page={page} pageSize={pageSize} />
              <CardDescription>Add money to your wallet to fund campaigns and ads</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Transactions History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent transactions and spending history</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No transactions yet</div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction: TransactionDto) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`rounded-full p-2 ${
                        transaction.type === 'credit'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {transaction.type === 'credit' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {transaction.type === 'credit' ? '+' : '-'}${transaction.amount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.description || 'No description'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <Badge className={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                    {transaction.paymentMethod && (
                      <div className="text-xs text-muted-foreground">
                        {transaction.paymentMethod}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {pagination && (
            <div className="mt-6 flex justify-center">
              <SmartPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onChange={(p) => setPage(p)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
