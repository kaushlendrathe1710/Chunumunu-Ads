import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import { addFunds as addFundsApi, AddFundsPayload } from '@/api/walletApi';
import { toast } from 'react-toastify';

// Types now imported from walletApi
interface AddFundsData extends AddFundsPayload {}

const AddFundsDialog = ({ page, pageSize }: { page: number; pageSize: number }) => {
  const [addFundsModalOpen, setAddFundsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<AddFundsData>({
    amount: 0,
    description: '',
    paymentMethod: 'stripe',
  });
  const addFundsMutation = useMutation({
    mutationFn: (payload: AddFundsPayload) => addFundsApi(payload),
    onSuccess: async () => {
      toast.success('Funds added successfully');
      setAddFundsModalOpen(false);
      setFormData({ amount: 0, description: '', paymentMethod: 'stripe' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK.wallet() }),
        queryClient.invalidateQueries({ queryKey: QK.walletTx(page, pageSize) }),
      ]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to add funds');
    },
  });
  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    addFundsMutation.mutate({
      amount: formData.amount,
      description: formData.description,
      paymentMethod: formData.paymentMethod,
    });
  };
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  return (
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
            <Button type="button" variant="outline" onClick={() => setAddFundsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addFundsMutation.isPending}>
              {addFundsMutation.isPending ? 'Adding...' : 'Add Funds'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFundsDialog;
