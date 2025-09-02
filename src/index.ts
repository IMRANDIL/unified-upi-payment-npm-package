// src/index.ts

import { UPIConfig, CreateOrderParams, OrderResponse } from './types';
import { BaseProvider } from './providers/base.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { CashfreeProvider } from './providers/cashfree.provider';
import { PhonePeProvider } from './providers/phonepe.provider';
import { PaytmProvider } from './providers/paytm.provider';
import { GooglePayProvider } from './providers/googlepay.provider';
import { BharatPeProvider } from './providers/bharatpe.provider';
import { PayUProvider } from './providers/payu.provider';

export class UnifiedUPIPayment {
  private provider: BaseProvider;
  
  constructor(private config: UPIConfig) {
    this.provider = this.initializeProvider();
  }
  
  private initializeProvider(): BaseProvider {
    const { provider, credentials, environment } = this.config;
    
    const providers = {
      razorpay: RazorpayProvider,
      cashfree: CashfreeProvider,
      phonepe: PhonePeProvider,
      paytm: PaytmProvider,
      googlepay: GooglePayProvider,
      bharatpe: BharatPeProvider,
      payu: PayUProvider,
    };
    
    const ProviderClass = providers[provider];
    
    if (!ProviderClass) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    
    return new ProviderClass(credentials, environment, this.config.options?.logger);
  }
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    return this.provider.createOrder(params);
  }
  
  async verifyPayment(params: any): Promise<boolean> {
    return this.provider.verifyPayment(params);
  }
  
  generateUPILink(params: any): string {
    return this.provider.generateUPILink(params);
  }
  
  async generateQRCode(params: any): Promise<string> {
    return this.provider.generateQRCode(params);
  }
  
  // Provider-specific features
  getProviderCapabilities(): string[] {
    const capabilities: Record<string, string[]> = {
      razorpay: ['upi', 'cards', 'netbanking', 'wallets', 'emi', 'international'],
      cashfree: ['upi', 'cards', 'netbanking', 'wallets', 'paylater'],
      phonepe: ['upi', 'cards', 'wallets'],
      paytm: ['upi', 'cards', 'netbanking', 'wallets', 'paytm_wallet'],
      googlepay: ['upi'],
      bharatpe: ['upi', 'qr_code'],
      payu: ['upi', 'cards', 'netbanking', 'wallets', 'emi'],
    };
    
    return capabilities[this.config.provider] || [];
  }
}