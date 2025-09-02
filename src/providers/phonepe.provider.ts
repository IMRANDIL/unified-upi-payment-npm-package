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
import { sha256, base64Encode } from "../utils/crypto";

export class PhonePeProvider extends BaseProvider {
  private baseUrl: string;
  
  constructor(credentials: any, environment = 'production', logger?: any, options?: any) {
    super(credentials, environment, logger, options);
    this.baseUrl = environment === 'production' 
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  }
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const transactionId = `TXN_${Date.now()}`;
      const payload = {
        merchantId: this.credentials.merchantId,
        merchantTransactionId: transactionId,
        merchantUserId: params.customerInfo?.contact || `USER_${Date.now()}`,
        amount: params.amount * 100, // Convert to paise
        redirectUrl: params.returnUrl || `${this.options?.webhookUrl}/redirect`,
        redirectMode: 'POST',
        callbackUrl: this.options?.webhookUrl,
        mobileNumber: params.customerInfo?.contact,
        paymentInstrument: {
          type: 'PAY_PAGE',
        },
      };
      
      const base64Payload = base64Encode(JSON.stringify(payload));
      const checksum = this.generateChecksum(base64Payload, '/pg/v1/pay');
      
      const response = await fetch(`${this.baseUrl}/pg/v1/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
        body: JSON.stringify({
          request: base64Payload,
        }),
      });
      
      const data = await response.json() as any;
      
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
        paymentUrl: data.data?.instrumentResponse?.redirectInfo?.url,
        raw: data,
      };
    } catch (error: any) {
      throw new ProviderError(`PhonePe: ${error.message}`, 'phonepe', error);
    }
  }
  
  private generateChecksum(payload: string, endpoint: string): string {
    const string = `${payload}${endpoint}${this.credentials.saltKey}`;
    return sha256(string) + '###' + (this.credentials.saltIndex || 1);
  }
  
  async verifyPayment(params: PaymentVerification): Promise<boolean> {
    try {
      const string = `/pg/v1/status/${this.credentials.merchantId}/${params.orderId}${this.credentials.saltKey}`;
      const checksum = sha256(string) + '###' + (this.credentials.saltIndex || 1);
      
      return checksum === params.signature;
    } catch (error: any) {
      this.log('error', 'Payment verification failed', error);
      return false;
    }
  }

  async getTransactionStatus(orderId: string): Promise<TransactionStatus> {
    try {
      const endpoint = `/pg/v1/status/${this.credentials.merchantId}/${orderId}`;
      const checksum = this.generateChecksum('', endpoint);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': this.credentials.merchantId!,
        },
      });
      
      const data = await response.json() as any;
      
      return {
        status: this.mapStatus(data.code),
        orderId: orderId,
        paymentId: data.data?.transactionId,
        amount: data.data?.amount ? data.data.amount / 100 : 0,
        method: 'UPI',
        errorCode: data.code,
        errorDescription: data.message,
      };
    } catch (error: any) {
      throw new ProviderError(`Failed to get transaction status: ${error.message}`, 'phonepe', error);
    }
  }

  async refundPayment(params: RefundParams): Promise<any> {
    try {
      const refundId = `REFUND_${Date.now()}`;
      const payload = {
        merchantId: this.credentials.merchantId,
        merchantTransactionId: refundId,
        originalTransactionId: params.paymentId,
        amount: params.amount ? params.amount * 100 : undefined,
        callbackUrl: this.options?.webhookUrl,
      };
      
      const base64Payload = base64Encode(JSON.stringify(payload));
      const checksum = this.generateChecksum(base64Payload, '/pg/v1/refund');
      
      const response = await fetch(`${this.baseUrl}/pg/v1/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
        body: JSON.stringify({
          request: base64Payload,
        }),
      });
      
      const data = await response.json() as any;
      
      return {
        refundId: refundId,
        paymentId: params.paymentId,
        amount: params.amount || 0,
        status: data.success ? 'SUCCESS' : 'FAILED',
        createdAt: new Date(),
        raw: data,
      };
    } catch (error: any) {
      throw new ProviderError(`Refund failed: ${error.message}`, 'phonepe', error);
    }
  }

  verifyWebhookSignature(payload: WebhookPayload): boolean {
    try {
      const xVerify = payload.signature;
      if (!xVerify) return false;
      
      const [checksum, index] = xVerify.split('###');
      const response = payload.payload.response;
      
      const expectedChecksum = sha256(`${response}${this.credentials.saltKey}`);
      
      return expectedChecksum === checksum && parseInt(index) === (this.credentials.saltIndex || 1);
    } catch (error) {
      this.log('error', 'Webhook verification failed', error);
      return false;
    }
  }

  private mapStatus(phonePeCode: string): TransactionStatus['status'] {
    const statusMap: Record<string, TransactionStatus['status']> = {
      'PAYMENT_SUCCESS': 'success',
      'PAYMENT_ERROR': 'failed',
      'PAYMENT_DECLINED': 'failed',
      'PAYMENT_PENDING': 'processing',
    };
    return statusMap[phonePeCode] || 'pending';
  }
}