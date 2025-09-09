import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'react-toastify';

interface Wallet {
  id: number;
  balance: string;
  currency: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
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

interface AddFundsData {
  amount: number;
  description: string;
  paymentMethod: string;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFundsModalOpen, setAddFundsModalOpen] = useState(false);
  const [formData, setFormData] = useState<AddFundsData>({
    amount: 0,
    description: '',
    paymentMethod: 'stripe',
  });

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await fetch('/api/wallet', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setWallet(data.wallet);
      } else {
        console.error('Failed to fetch wallet:', response.status);
        toast.error('Failed to load wallet');
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      toast.error('Failed to load wallet');
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/wallet/transactions', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        console.error('Failed to fetch transactions:', response.status);
        toast.error('Failed to load transactions');
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      const response = await fetch('/api/wallet/add-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Funds added successfully');
        setAddFundsModalOpen(false);
        setFormData({ amount: 0, description: '', paymentMethod: 'stripe' });
        // Refresh wallet and transactions
        await fetchWallet();
        await fetchTransactions();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to add funds');
      }
    } catch (error) {
      console.error('Add funds error:', error);
      toast.error('Failed to add funds');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {transactions
                .filter((t) => t.type === 'debit' && t.status === 'completed')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total campaign and ad spending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Added</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {transactions
                .filter((t) => t.type === 'credit' && t.status === 'completed')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total funds added</p>
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
      </div>

      {/* Add Funds Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add Funds</CardTitle>
              <CardDescription>Add money to your wallet to fund campaigns and ads</CardDescription>
            </div>
            <Dialog open={addFundsModalOpen} onOpenChange={setAddFundsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Funds to Wallet</DialogTitle>
                  <DialogDescription>
                    Add money to your wallet to use for campaigns and ads
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddFunds} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Amount (USD)</label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.amount || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="Enter amount"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Payment Method</label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Credit/Debit Card (Stripe)</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Description (Optional)</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter description"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddFundsModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Add Funds</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

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
              {transactions.map((transaction) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
