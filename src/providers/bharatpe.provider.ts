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

export class BharatPeProvider extends BaseProvider {
  private baseUrl: string;
  
  constructor(credentials: any, environment = 'production', logger?: any, options?: any) {
    super(credentials, environment, logger, options);
    this.baseUrl = environment === 'production' 
      ? 'https://api.bharatpe.com'
      : 'https://api-staging.bharatpe.com';
  }
  
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
      
      const data = await response.json() as any;
      
      if (!data.success) {
        throw new Error(data.message || 'Order creation failed');
      }
      
      return {
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency || 'INR',
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

  async verifyPayment(params: PaymentVerification): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/merchant/verify-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: params.orderId,
          paymentId: params.paymentId,
        }),
      });
      
      const data = await response.json() as any;
      
      if (params.signature) {
        const expectedSignature = hmacSha256(
          `${params.orderId}|${params.paymentId}`,
          this.credentials.apiKey!
        );
        return expectedSignature === params.signature && data.status === 'SUCCESS';
      }
      
      return data.status === 'SUCCESS';
    } catch (error: any) {
      this.log('error', 'Payment verification failed', error);
      return false;
    }
  }

  async getTransactionStatus(orderId: string): Promise<TransactionStatus> {
    try {
      // Google Pay doesn't have a direct status API
      // You would typically check with your PSP or bank
      // This is a placeholder implementation
      return {
        status: 'pending',
        orderId: orderId,
        amount: 0,
        method: 'UPI',
        errorDescription: 'Status check not available for Google Pay direct integration',
      };
    } catch (error: any) {
      throw new ProviderError(`Failed to get transaction status: ${error.message}`, 'googlepay', error);
    }
  }

  async refundPayment(params: RefundParams): Promise<any> {
    try {
      // Refunds for Google Pay would be handled through your bank/PSP
      // This is a placeholder implementation
      return {
        refundId: `REFUND_${Date.now()}`,
        paymentId: params.paymentId,
        amount: params.amount || 0,
        status: 'INITIATED',
        createdAt: new Date(),
        message: 'Refund initiated through bank channel',
      };
    } catch (error: any) {
      throw new ProviderError(`Refund failed: ${error.message}`, 'googlepay', error);
    }
  }

  verifyWebhookSignature(payload: WebhookPayload): boolean {
    try {
      // Webhook verification would depend on your PSP
      const signature = payload.signature;
      if (!signature) return false;
      
      const expectedSignature = hmacSha256(
        JSON.stringify(payload.payload),
        this.credentials.webhookSecret || ''
      );
      
      return expectedSignature === signature;
    } catch (error) {
      this.log('error', 'Webhook verification failed', error);
      return false;
    }
  }
}