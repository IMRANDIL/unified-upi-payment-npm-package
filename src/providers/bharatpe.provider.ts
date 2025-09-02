// src/providers/bharatpe.provider.ts

import { ProviderError } from "../errors";
import { CreateOrderParams, OrderResponse } from "../types";
import { BaseProvider } from "./base.provider";

export class BharatPeProvider extends BaseProvider {
  private baseUrl = 'https://api.bharatpe.com';
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/merchant/upi/create-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency || 'INR',
          orderId: params.receipt || `BP_${Date.now()}`,
          customerPhone: params.customerInfo?.contact,
          customerEmail: params.customerInfo?.email,
          description: params.notes?.description,
          callbackUrl: this.options?.webhookUrl,
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Order creation failed');
      }
      
      return {
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        status: 'created',
        provider: 'bharatpe',
        createdAt: new Date(),
        upiUrl: data.upiLink,
        qrCode: data.qrCode,
        raw: data,
      };
    } catch (error: any) {
      throw new ProviderError(`BharatPe: ${error.message}`, 'bharatpe', error);
    }
  }

  
}