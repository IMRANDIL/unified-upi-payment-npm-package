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
import { sha256 } from "../utils/crypto";

export class PaytmProvider extends BaseProvider {
  private baseUrl: string;
  
  constructor(credentials: any, environment = 'production', logger?: any, options?: any) {
    super(credentials, environment, logger, options);
    this.baseUrl = environment === 'production' 
      ? 'https://securegw.paytm.in'
      : 'https://securegw-stage.paytm.in';
  }
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const orderId = `ORDER_${Date.now()}`;
      
      // First, initiate transaction to get token
      const txnPayload = {
        mid: this.credentials.mid,
        orderId: orderId,
        amount: params.amount.toString(),
        currency: params.currency || 'INR',
        websiteName: this.credentials.website || 'WEBSTAGING',
        userInfo: {
          custId: params.customerInfo?.contact || `CUST_${Date.now()}`,
          email: params.customerInfo?.email,
          firstName: params.customerInfo?.name,
          mobile: params.customerInfo?.contact,
        },
        enablePaymentModes: [
          { mode: 'UPI', channels: ['UPIPUSH', 'UPIPUSHEXPRESS'] }
        ],
        callbackUrl: this.options?.webhookUrl,
      };
      
      const checksum = await this.generateChecksum(txnPayload);
      
      const response = await fetch(
        `${this.baseUrl}/theia/api/v1/initiateTransaction?mid=${this.credentials.mid}&orderId=${orderId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...txnPayload,
            signature: checksum,
          }),
        }
      );
      
      const data = await response.json() as any;
      
      if (data.body?.resultInfo?.resultStatus !== 'S') {
        throw new Error(data.body?.resultInfo?.resultMsg || 'Order creation failed');
      }
      
      return {
        orderId: orderId,
        amount: params.amount,
        currency: params.currency || 'INR',
        status: 'created',
        provider: 'paytm',
        createdAt: new Date(),
        txnToken: data.body?.txnToken,
        raw: data,
      };
    } catch (error: any) {
      throw new ProviderError(`Paytm: ${error.message}`, 'paytm', error);
    }
  }
  
  private async generateChecksum(payload: any): Promise<string> {
    const payloadStr = JSON.stringify(payload);
    return sha256(payloadStr + '|' + this.credentials.merchantKey);
  }

  async verifyPayment(params: PaymentVerification): Promise<boolean> {
    try {
      const expectedChecksum = await this.generateChecksum({
        orderId: params.orderId,
        paymentId: params.paymentId,
        status: params.status,
      });
      
      return expectedChecksum === params.signature;
    } catch (error: any) {
      this.log('error', 'Payment verification failed', error);
      return false;
    }
  }

  async getTransactionStatus(orderId: string): Promise<TransactionStatus> {
    try {
      const payload = {
        mid: this.credentials.mid,
        orderId: orderId,
      };
      
      const checksum = await this.generateChecksum(payload);
      
      const response = await fetch(
        `${this.baseUrl}/v3/order/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mid: this.credentials.mid,
            orderId: orderId,
            signature: checksum,
          }),
        }
      );
      
      const data = await response.json() as any;
      
      return {
        status: this.mapStatus(data.body?.resultInfo?.resultStatus),
        orderId: orderId,
        paymentId: data.body?.txnId,
        amount: parseFloat(data.body?.txnAmount || '0'),
        method: 'UPI',
        errorCode: data.body?.resultInfo?.resultCode,
        errorDescription: data.body?.resultInfo?.resultMsg,
      };
    } catch (error: any) {
      throw new ProviderError(`Failed to get transaction status: ${error.message}`, 'paytm', error);
    }
  }

  async refundPayment(params: RefundParams): Promise<any> {
    try {
      const refundId = `REFUND_${Date.now()}`;
      const payload = {
        mid: this.credentials.mid,
        txnId: params.paymentId,
        orderId: params.receipt || `ORDER_${Date.now()}`,
        refundId: refundId,
        txnType: 'REFUND',
        refundAmount: params.amount?.toString(),
      };
      
      const checksum = await this.generateChecksum(payload);
      
      const response = await fetch(
        `${this.baseUrl}/refund/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            signature: checksum,
          }),
        }
      );
      
      const data = await response.json() as any;
      
      return {
        refundId: refundId,
        paymentId: params.paymentId,
        amount: params.amount || 0,
        status: data.body?.resultInfo?.resultStatus,
        createdAt: new Date(),
        raw: data,
      };
    } catch (error: any) {
      throw new ProviderError(`Refund failed: ${error.message}`, 'paytm', error);
    }
  }

  verifyWebhookSignature(payload: WebhookPayload): boolean {
    try {
      const checksum = payload.signature;
      if (!checksum) return false;
      
      const expectedChecksum = sha256(
        JSON.stringify(payload.payload) + '|' + this.credentials.merchantKey
      );
      
      return expectedChecksum === checksum;
    } catch (error) {
      this.log('error', 'Webhook verification failed', error);
      return false;
    }
  }

  private mapStatus(paytmStatus: string): TransactionStatus['status'] {
    const statusMap: Record<string, TransactionStatus['status']> = {
      'S': 'success',
      'F': 'failed',
      'P': 'pending',
      'PENDING': 'processing',
    };
    return statusMap[paytmStatus] || 'pending';
  }
}