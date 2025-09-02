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

export class CashfreeProvider extends BaseProvider {
  private baseUrl: string;
  
  constructor(credentials: any, environment = 'production', logger?: any, options?: any) {
    super(credentials, environment, logger, options);
    this.baseUrl = environment === 'production' 
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'x-client-id': this.credentials.appId!,
          'x-client-secret': this.credentials.secretKey!,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: params.receipt || `CF_${Date.now()}`,
          order_amount: params.amount,
          order_currency: params.currency || 'INR',
          customer_details: {
            customer_id: params.customerInfo?.contact || `CUST_${Date.now()}`,
            customer_name: params.customerInfo?.name || 'Guest',
            customer_email: params.customerInfo?.email || 'guest@example.com',
            customer_phone: params.customerInfo?.contact || '9999999999',
          },
          order_meta: {
            return_url: params.returnUrl,
            notify_url: this.options?.webhookUrl,
            payment_methods: 'upi',
          },
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(errorData.message || 'Order creation failed');
      }
      
      const data = await response.json() as any;
      
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
    try {
      const expectedSignature = hmacSha256(
        `${params.orderId}${params.paymentId}`,
        this.credentials.secretKey!
      );
      
      return expectedSignature === params.signature;
    } catch (error: any) {
      this.log('error', 'Payment verification failed', error);
      return false;
    }
  }

  async getTransactionStatus(orderId: string): Promise<TransactionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        headers: {
          'x-client-id': this.credentials.appId!,
          'x-client-secret': this.credentials.secretKey!,
          'x-api-version': '2023-08-01',
        },
      });
      
      const data = await response.json() as any;
      
      return {
        status: this.mapStatus(data.order_status),
        orderId: data.order_id,
        paymentId: data.cf_order_id,
        amount: data.order_amount,
        method: 'UPI',
        errorCode: data.order_status,
        errorDescription: data.order_note,
      };
    } catch (error: any) {
      throw new ProviderError(`Failed to get transaction status: ${error.message}`, 'cashfree', error);
    }
  }

  async refundPayment(params: RefundParams): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${params.paymentId}/refunds`, {
        method: 'POST',
        headers: {
          'x-client-id': this.credentials.appId!,
          'x-client-secret': this.credentials.secretKey!,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refund_amount: params.amount,
          refund_id: `refund_${Date.now()}`,
          refund_note: params.notes?.reason || 'Customer requested refund',
        }),
      });
      
      const data = await response.json() as any;
      
      return {
        refundId: data.refund_id,
        paymentId: params.paymentId,
        amount: data.refund_amount,
        status: data.refund_status,
        createdAt: new Date(data.created_at),
        raw: data,
      };
    } catch (error: any) {
      throw new ProviderError(`Refund failed: ${error.message}`, 'cashfree', error);
    }
  }

  verifyWebhookSignature(payload: WebhookPayload): boolean {
    try {
      const timestamp = payload.payload.timestamp;
      const signature = payload.signature;
      
      if (!signature || !timestamp) return false;
      
      const expectedSignature = hmacSha256(
        `${timestamp}${JSON.stringify(payload.payload)}`,
        this.credentials.webhookSecret || this.credentials.secretKey!
      );
      
      return expectedSignature === signature;
    } catch (error) {
      this.log('error', 'Webhook verification failed', error);
      return false;
    }
  }

  private mapStatus(cashfreeStatus: string): TransactionStatus['status'] {
    const statusMap: Record<string, TransactionStatus['status']> = {
      'PAID': 'success',
      'ACTIVE': 'pending',
      'EXPIRED': 'failed',
      'CANCELLED': 'failed',
      'PARTIALLY_PAID': 'processing',
    };
    return statusMap[cashfreeStatus] || 'pending';
  }
}