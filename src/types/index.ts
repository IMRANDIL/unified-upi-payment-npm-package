import { Logger } from "../utils";

export type ProviderName = 'razorpay' | 'cashfree' | 'phonepe' | 'paytm' | 'googlepay' | 'bharatpe' | 'payu';

export interface ProviderCredentials {
  // Razorpay
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  
  // Cashfree
  appId?: string;
  secretKey?: string;
  
  // PhonePe
  merchantId?: string;
  saltKey?: string;
  saltIndex?: number;
  
  // Paytm
  mid?: string;
  merchantKey?: string;
  website?: string;
  
  // Google Pay
  merchantName?: string;
  merchantUPI?: string;
  merchantCode?: string;
  
  // BharatPe
  apiKey?: string;
  
  // PayU
  merchantSalt?: string;
}

export interface UPIConfig {
  provider: ProviderName;
  credentials: ProviderCredentials;
  environment?: 'production' | 'sandbox';
  options?: {
    timeout?: number;
    retryCount?: number;
    logger?: boolean | Logger;
    webhookUrl?: string;
  };
}

export interface CustomerInfo {
  name?: string;
  email?: string;
  contact?: string;
  upiId?: string;
}

export interface CreateOrderParams {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
  customerInfo?: CustomerInfo;
  returnUrl?: string;
  description?: string;
}

export interface OrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  status: 'created' | 'attempted' | 'paid' | 'failed';
  provider: string;
  createdAt: Date;
  paymentUrl?: string;
  upiUrl?: string;
  qrCode?: string;
  txnToken?: string;
  paymentSessionId?: string;
  raw?: any;
}

export interface PaymentVerification {
  paymentId: string;
  orderId: string;
  signature: string;
  payload?: any;
  status?: string;
  email?: string;
  firstname?: string;
  productinfo?: string;
  amount?: number;
  txnid?: string;
  hash?: string;
}

export interface UPILinkParams {
  pa: string;  // Payee address (VPA)
  pn: string;  // Payee name
  am: string;  // Amount
  cu?: string; // Currency (default: INR)
  tn?: string; // Transaction note
  tr?: string; // Transaction reference ID
  mc?: string; // Merchant code
  url?: string; // Reference URL
}

export interface RefundParams {
  paymentId: string;
  amount?: number;
  notes?: Record<string, any>;
  receipt?: string;
}

export interface TransactionStatus {
  status: 'success' | 'failed' | 'pending' | 'processing';
  paymentId?: string;
  orderId: string;
  amount: number;
  method?: string;
  errorCode?: string;
  errorDescription?: string;
}

export interface WebhookPayload {
  event: string;
  payload: any;
  signature?: string;
}
