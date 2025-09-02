import { ProviderError } from "../errors";
import { 
  CreateOrderParams, 
  OrderResponse, 
  PaymentVerification,
  RefundParams,
  TransactionStatus,
  WebhookPayload
} from "../types";
import { BaseProvider } from "./base.provider";
import { hmacSha256 } from "../utils/crypto";

export class RazorpayProvider extends BaseProvider {
  private client: any;
  private baseUrl = 'https://api.razorpay.com/v1';
  
  constructor(credentials: any, environment = 'production', logger?: any, options?: any) {
    super(credentials, environment, logger, options);
    this.initializeClient();
  }
  
  private initializeClient(): void {
    try {
      // If Razorpay SDK is available, use it
      if (typeof require !== 'undefined') {
        try {
          const Razorpay = require('razorpay');
          this.client = new Razorpay({
            key_id: this.credentials.keyId,
            key_secret: this.credentials.keySecret,
          });
        } catch (e) {
          // SDK not available, will use REST API
          this.client = null;
        }
      }
    } catch (error) {
      this.log('warn', 'Razorpay SDK not available, using REST API');
    }
  }
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      let order: any;
      
      if (this.client) {
        // Use SDK if available
        order = await this.client.orders.create({
          amount: Math.round(params.amount * 100),
          currency: params.currency || 'INR',
          receipt: params.receipt || `order_${Date.now()}`,
          notes: params.notes || {},
          payment_capture: 1,
        });
      } else {
        // Use REST API
        const response = await fetch(`${this.baseUrl}/orders`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${this.credentials.keyId}:${this.credentials.keySecret}`).toString('base64'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(params.amount * 100),
            currency: params.currency || 'INR',
            receipt: params.receipt || `order_${Date.now()}`,
            notes: params.notes || {},
            payment_capture: 1,
          }),
        });
        
        order = await response.json();
      }
      
      return {
        orderId: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        status: 'created',
        provider: 'razorpay',
        createdAt: new Date(order.created_at * 1000),
        raw: order,
      };
    } catch (error: any) {
      throw new ProviderError(`Razorpay: ${error.message}`, 'razorpay', error);
    }
  }
  
  async verifyPayment(params: PaymentVerification): Promise<boolean> {
    try {
      const generatedSignature = hmacSha256(
        `${params.orderId}|${params.paymentId}`,
        this.credentials.keySecret!
      );
      
      return generatedSignature === params.signature;
    } catch (error: any) {
      this.log('error', 'Payment verification failed', error);
      return false;
    }
  }

  async getTransactionStatus(orderId: string): Promise<TransactionStatus> {
    try {
      let order: any;
      let payments: any;
      
      if (this.client) {
        order = await this.client.orders.fetch(orderId);
        payments = await this.client.orders.fetchPayments(orderId);
      } else {
        // Use REST API
        const orderResponse = await fetch(`${this.baseUrl}/orders/${orderId}`, {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${this.credentials.keyId}:${this.credentials.keySecret}`).toString('base64'),
          },
        });
        order = await orderResponse.json();
        
        const paymentsResponse = await fetch(`${this.baseUrl}/orders/${orderId}/payments`, {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${this.credentials.keyId}:${this.credentials.keySecret}`).toString('base64'),
          },
        });
        payments = await paymentsResponse.json();
      }
      
      let status: TransactionStatus['status'] = 'pending';
      let paymentId: string | undefined;
      let method: string | undefined;
      let errorCode: string | undefined;
      let errorDescription: string | undefined;
      
      if (payments.items && payments.items.length > 0) {
        const payment = payments.items[0];
        paymentId = payment.id;
        method = payment.method;
        
        switch (payment.status) {
          case 'captured':
            status = 'success';
            break;
          case 'failed':
            status = 'failed';
            errorCode = payment.error_code;
            errorDescription = payment.error_description;
            break;
          case 'authorized':
            status = 'processing';
            break;
        }
      }
      
      return {
        status,
        orderId: order.id,
        amount: order.amount / 100,
        paymentId,
        method,
        errorCode,
        errorDescription,
      };
    } catch (error: any) {
      throw new ProviderError(`Failed to get transaction status: ${error.message}`, 'razorpay', error);
    }
  }

  async refundPayment(params: RefundParams): Promise<any> {
    try {
      let refund: any;
      
      if (this.client) {
        refund = await this.client.refunds.create({
          payment_id: params.paymentId,
          amount: params.amount ? Math.round(params.amount * 100) : undefined,
          notes: params.notes || {},
          receipt: params.receipt,
        });
      } else {
        const response = await fetch(`${this.baseUrl}/refunds`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${this.credentials.keyId}:${this.credentials.keySecret}`).toString('base64'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment_id: params.paymentId,
            amount: params.amount ? Math.round(params.amount * 100) : undefined,
            notes: params.notes || {},
            receipt: params.receipt,
          }),
        });
        
        refund = await response.json();
      }
      
      return {
        refundId: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount / 100,
        status: refund.status,
        createdAt: new Date(refund.created_at * 1000),
        raw: refund,
      };
    } catch (error: any) {
      throw new ProviderError(`Refund failed: ${error.message}`, 'razorpay', error);
    }
  }

  verifyWebhookSignature(payload: WebhookPayload): boolean {
    try {
      const signature = payload.signature;
      if (!signature || !this.credentials.webhookSecret) return false;
      
      const expectedSignature = hmacSha256(
        JSON.stringify(payload.payload),
        this.credentials.webhookSecret
      );
      
      return expectedSignature === signature;
    } catch (error) {
      this.log('error', 'Webhook verification failed', error);
      return false;
    }
  }
}