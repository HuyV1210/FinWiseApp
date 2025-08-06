
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Get currency symbol from code
const getCurrencySymbol = (currency: string) => {
  try {
    return (0).toLocaleString('en', { style: 'currency', currency }).replace(/\d|[.,\s]/g, '');
  } catch {
    return currency;
  }
};

export const formatCurrencyShort = (amount: number, currency: string = 'USD'): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  } else if (amount >= 1) {
    return `${amount.toFixed(0)}`;
  } else if (amount > 0) {
    return `${amount.toFixed(2)}`;
  } else {
    return '0';
  }
};

export const formatCurrencyWithCommas = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};