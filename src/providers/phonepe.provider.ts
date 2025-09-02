// src/providers/phonepe.provider.ts

import { ProviderError } from "../errors";
import { CreateOrderParams, OrderResponse, PaymentVerification } from "../types";
import { BaseProvider } from "./base.provider";

export class PhonePeProvider extends BaseProvider {
  private baseUrl: string;
  
  constructor(credentials: any, environment = 'production', logger?: any) {
    super(credentials, environment, logger);
    this.baseUrl = environment === 'production'
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/hermes';
  }
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const transactionId = `TXN_${Date.now()}`;
      
      const payload = {
        merchantId: this.credentials.merchantId,
        merchantTransactionId: transactionId,
        merchantUserId: params.customerInfo?.contact || 'guest',
        amount: params.amount * 100, // In paise
        redirectUrl: params.returnUrl,
        redirectMode: 'POST',
        callbackUrl: this.options?.webhookUrl,
        mobileNumber: params.customerInfo?.contact,
        paymentInstrument: {
          type: 'UPI_COLLECT',
          targetApp: 'com.phonepe.app',
          vpa: params.customerInfo?.upiId,
        },
      };
      
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const checksum = this.generateChecksum(base64Payload);
      
      const response = await fetch(`${this.baseUrl}/pg/v1/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': `${checksum}###${this.credentials.saltIndex}`,
        },
        body: JSON.stringify({
          request: base64Payload,
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Order creation failed');
      }
      
      return {
        orderId: transactionId,
        amount: params.amount,
        currency: 'INR',
        status: 'created',
        provider: 'phonepe',
        createdAt: new Date(),
        paymentUrl: data.data.instrumentResponse.redirectInfo.url,
        raw: data,
      };
    } catch (error: any) {
      throw new ProviderError(`PhonePe: ${error.message}`, 'phonepe', error);
    }
  }
  
  private generateChecksum(payload: string): string {
    const string = `${payload}/pg/v1/pay${this.credentials.saltKey}`;
    return crypto.createHash('sha256').update(string).digest('hex');
  }
  
  async verifyPayment(params: PaymentVerification): Promise<boolean> {
    const string = `${params.payload}/pg/v1/status/${this.credentials.merchantId}/${params.orderId}${this.credentials.saltKey}`;
    const checksum = crypto.createHash('sha256').update(string).digest('hex');
    return checksum === params.signature;
  }
}