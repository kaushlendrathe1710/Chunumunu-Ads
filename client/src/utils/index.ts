export function getCampaignAvailableBalance(budget: number, spend: number): number | 'Unlimited' {
  if (budget === -1) return 'Unlimited';
  return Math.max(0, budget - spend);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}
