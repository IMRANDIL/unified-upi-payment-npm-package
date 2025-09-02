import { UPIConfig, CreateOrderParams, UPILinkParams } from '../types';
import { ValidationError } from '../errors';

export function validateConfig(config: UPIConfig): void {
  if (!config.provider) {
    throw new ValidationError('Provider is required');
  }

  const validProviders = ['razorpay', 'cashfree', 'phonepe', 'paytm', 'googlepay', 'bharatpe', 'payu'];
  if (!validProviders.includes(config.provider)) {
    throw new ValidationError(`Invalid provider: ${config.provider}. Must be one of: ${validProviders.join(', ')}`);
  }

  if (!config.credentials || typeof config.credentials !== 'object') {
    throw new ValidationError('Credentials are required');
  }

  // Provider-specific credential validation
  switch (config.provider) {
    case 'razorpay':
      if (!config.credentials.keyId || !config.credentials.keySecret) {
        throw new ValidationError('Razorpay requires keyId and keySecret');
      }
      break;
    case 'cashfree':
      if (!config.credentials.appId || !config.credentials.secretKey) {
        throw new ValidationError('Cashfree requires appId and secretKey');
      }
      break;
    case 'phonepe':
      if (!config.credentials.merchantId || !config.credentials.saltKey) {
        throw new ValidationError('PhonePe requires merchantId and saltKey');
      }
      break;
    case 'paytm':
      if (!config.credentials.mid || !config.credentials.merchantKey) {
        throw new ValidationError('Paytm requires mid and merchantKey');
      }
      break;
    case 'googlepay':
      if (!config.credentials.merchantUPI || !config.credentials.merchantName) {
        throw new ValidationError('Google Pay requires merchantUPI and merchantName');
      }
      break;
    case 'bharatpe':
      if (!config.credentials.apiKey) {
        throw new ValidationError('BharatPe requires apiKey');
      }
      break;
    case 'payu':
      if (!config.credentials.keyId || !config.credentials.merchantSalt) {
        throw new ValidationError('PayU requires merchantKey and merchantSalt');
      }
      break;
  }
}

export function validateOrderParams(params: CreateOrderParams): void {
  if (!params.amount || params.amount <= 0) {
    throw new ValidationError('Amount must be greater than 0');
  }

  if (params.currency && params.currency !== 'INR') {
    throw new ValidationError('Currently only INR currency is supported');
  }

  if (params.customerInfo?.email && !isValidEmail(params.customerInfo.email)) {
    throw new ValidationError('Invalid email address');
  }

  if (params.customerInfo?.contact && !isValidPhone(params.customerInfo.contact)) {
    throw new ValidationError('Invalid phone number');
  }
}

export function validateUPIParams(params: UPILinkParams): void {
  if (!params.pa) {
    throw new ValidationError('Payee address (pa) is required');
  }

  if (!params.pn) {
    throw new ValidationError('Payee name (pn) is required');
  }

  if (!params.am || parseFloat(params.am) <= 0) {
    throw new ValidationError('Amount must be greater than 0');
  }

  if (!isValidUPI(params.pa)) {
    throw new ValidationError('Invalid UPI address format');
  }
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

function isValidUPI(upi: string): boolean {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return upiRegex.test(upi);
}