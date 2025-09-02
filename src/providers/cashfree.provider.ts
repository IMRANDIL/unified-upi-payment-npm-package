// src/providers/cashfree.provider.ts

import { ProviderError } from "../errors";
import { CreateOrderParams, OrderResponse, PaymentVerification } from "../types";
import { BaseProvider } from "./base.provider";

export class CashfreeProvider extends BaseProvider {
  private baseUrl: string;
  
  constructor(credentials: any, environment = 'production', logger?: any) {
    super(credentials, environment, logger);
    this.baseUrl = environment === 'production' 
      ? 'https://api.cashfree.com'
      : 'https://sandbox.cashfree.com';
  }
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/pg/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.credentials.appId!,
          'x-client-secret': this.credentials.secretKey!,
          'x-api-version': '2023-08-01',
        },
        body: JSON.stringify({
          order_id: params.receipt || `order_${Date.now()}`,
          order_amount: params.amount,
          order_currency: params.currency || 'INR',
          customer_details: {
            customer_id: params.customerInfo?.contact || 'guest',
            customer_email: params.customerInfo?.email,
            customer_phone: params.customerInfo?.contact,
            customer_name: params.customerInfo?.name,
          },
          order_meta: {
            return_url: params.returnUrl,
            notify_url: this.options?.webhookUrl,
            payment_methods: 'upi',
          },
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Order creation failed');
      }
      
      return {
        orderId: data.order_id,
        amount: data.order_amount,
        currency: data.order_currency,
        status: 'created',
        provider: 'cashfree',
        createdAt: new Date(data.created_at),
        paymentSessionId: data.payment_session_id,
        raw: data,
      };
    } catch (error: any) {
      throw new ProviderError(`Cashfree: ${error.message}`, 'cashfree', error);
    }
  }
  
  async verifyPayment(params: PaymentVerification): Promise<boolean> {
    const data = params.orderId + params.paymentId;
    const signature = crypto
      .createHmac('sha256', this.credentials.secretKey!)
      .update(data)
      .digest('base64');
    return signature === params.signature;
  }
}