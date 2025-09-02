export * from './validator';
export * from './crypto';
export * from './qrcode';
export * from './logger';
export * from './retry';

export function formatAmount(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function parseAmount(amount: string | number): number {
  if (typeof amount === 'number') return amount;
  
  // Remove currency symbols and commas
  const cleaned = amount.replace(/[₹,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  
  return parsed;
}

export function generateOrderId(prefix = 'ORDER'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}

export function isValidUPIId(upiId: string): boolean {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return upiRegex.test(upiId);
}

export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Remove country code if present
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.substring(2);
  }
  
  return cleaned;
}
