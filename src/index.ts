// src/index.ts

import { UPIConfig, CreateOrderParams, OrderResponse, ProviderName } from "./types";
import { BaseProvider } from "./providers/base.provider";
import { RazorpayProvider } from "./providers/razorpay.provider";
import { CashfreeProvider } from "./providers/cashfree.provider";
import { PhonePeProvider } from "./providers/phonepe.provider";
import { PaytmProvider } from "./providers/paytm.provider";
import { GooglePayProvider } from "./providers/googlepay.provider";
import { BharatPeProvider } from "./providers/bharatpe.provider";
import { PayUProvider } from "./providers/payu.provider";

/**
 * Constructor type for providers.
 * Matches: new (credentials, environment?, logger?, options?) => BaseProvider
 */
type ProviderCtor = new (...args: any[]) => BaseProvider;

export class UnifiedUPIPayment {
  private provider: BaseProvider;

  constructor(private config: UPIConfig) {
    this.provider = this.initializeProvider();
  }

  private initializeProvider(): BaseProvider {
    const { provider, credentials, environment } = this.config;

    // Now typed so TypeScript knows each value constructs a BaseProvider
    const providers: Record<ProviderName, ProviderCtor> = {
      razorpay: RazorpayProvider as ProviderCtor,
      cashfree: CashfreeProvider as any as ProviderCtor,
      phonepe: PhonePeProvider as any as ProviderCtor,
      paytm: PaytmProvider as any as ProviderCtor,
      googlepay: GooglePayProvider as ProviderCtor,
      bharatpe: BharatPeProvider as any as ProviderCtor,
      payu: PayUProvider as any as ProviderCtor,
    };

    const ProviderClass = providers[provider];
    if (!ProviderClass) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const loggerToPass =
      this.config.options && typeof this.config.options.logger === "object"
        ? (this.config.options.logger as any)
        : undefined;

    // Pass options as the 4th argument so providers can access webhookUrl etc.
    return new ProviderClass(
      credentials,
      environment,
      loggerToPass,
      this.config.options
    );
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
      razorpay: [
        "upi",
        "cards",
        "netbanking",
        "wallets",
        "emi",
        "international",
      ],
      cashfree: ["upi", "cards", "netbanking", "wallets", "paylater"],
      phonepe: ["upi", "cards", "wallets"],
      paytm: ["upi", "cards", "netbanking", "wallets", "paytm_wallet"],
      googlepay: ["upi"],
      bharatpe: ["upi", "qr_code"],
      payu: ["upi", "cards", "netbanking", "wallets", "emi"],
    };

    return capabilities[this.config.provider] || [];
  }
}
