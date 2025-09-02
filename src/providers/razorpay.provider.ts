// src/providers/razorpay.provider.ts

import { ProviderError } from '../errors';
import { CreateOrderParams, OrderResponse, PaymentVerification } from '../types';
import { BaseProvider } from './base.provider';
import * as crypto from 'crypto';

export class RazorpayProvider extends BaseProvider {
  private client: any;
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const Razorpay = require('razorpay');
      this.client = new Razorpay({
        key_id: this.credentials.keyId,
        key_secret: this.credentials.keySecret,
      });
      
      const order = await this.client.orders.create({
        amount: Math.round(params.amount * 100),
        currency: params.currency || 'INR',
        receipt: params.receipt || `order_${Date.now()}`,
        notes: params.notes,
        payment_capture: 1,
        partial_payment: false,
      });
      
      return {
        orderId: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        status: 'created',
        provider: 'razorpay',
        createdAt: new Date(),
        raw: order,
      };
    } catch (error: any) {
      throw new ProviderError(`Razorpay: ${error.message}`, 'razorpay', error);
    }
  }
  
  async verifyPayment(params: PaymentVerification): Promise<boolean> {
    const signature = crypto
      .createHmac('sha256', this.credentials.keySecret!)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');
    return signature === params.signature;
  }
}