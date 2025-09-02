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
import { sha512 } from "../utils/crypto";

export class PayUProvider extends BaseProvider {
  private baseUrl: string;
  
  constructor(credentials: any, environment = 'production', logger?: any, options?: any) {
    super(credentials, environment, logger, options);
    this.baseUrl = environment === 'production' 
      ? 'https://info.payu.in'
      : 'https://test.payu.in';
  }
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const txnId = `TXN_${Date.now()}`;
      
      // Generate PayU hash
      const hashString = `${this.credentials.keyId}|${txnId}|${params.amount}|${params.description || 'Product'}|${params.customerInfo?.name || 'Guest'}|${params.customerInfo?.email || 'guest@example.com'}|||||||||||${this.credentials.merchantSalt}`;
      const hash = sha512(hashString);
      
      const paymentData = {
        key: this.credentials.keyId,
        txnid: txnId,
        amount: params.amount.toString(),
        productinfo: params.description || 'Product',
        firstname: params.customerInfo?.name || 'Guest',
        email: params.customerInfo?.email || 'guest@example.com',
        phone: params.customerInfo?.contact || '9999999999',
        surl: params.returnUrl || `${this.options?.webhookUrl}/success`,
        furl: `${this.options?.webhookUrl}/failure`,
        hash: hash,
        udf1: '',
        udf2: '',
        udf3: '',
        udf4: '',
        udf5: '',
        pg: 'UPI',
      };
      
      // PayU typically uses form submission, not REST API for payment initiation
      // This returns the data needed to create a payment form
      return {
        orderId: txnId,
        amount: params.amount,
        currency: params.currency || 'INR',
        status: 'created',
        provider: 'payu',
        createdAt: new Date(),
        paymentUrl: `${this.baseUrl}/_payment`,
        raw: paymentData,
      };
    } catch (error: any) {
      throw new ProviderError(`PayU: ${error.message}`, 'payu', error);
    }
  }
  
  async verifyPayment(params: PaymentVerification): Promise<boolean> {
    try {
      // PayU reverse hash verification
      const hashString = `${this.credentials.merchantSalt}|${params.status}|||||||||||${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${this.credentials.keyId}`;
      const hash = sha512(hashString);
      
      return hash === params.hash;
    } catch (error: any) {
      this.log('error', 'Payment verification failed', error);
      return false;
    }
  }

  async getTransactionStatus(orderId: string): Promise<TransactionStatus> {
    try {
      const hashString = `${this.credentials.keyId}|verify_payment|${orderId}|${this.credentials.merchantSalt}`;
      const hash = sha512(hashString);
      
      const response = await fetch(`${this.baseUrl}/merchant/postservice.php?form=2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          key: this.credentials.keyId!,
          command: 'verify_payment',
          var1: orderId,
          hash: hash,
        }).toString(),
      });
      
      const data = await response.json() as any;
      
      return {
        status: this.mapStatus(data.status),
        orderId: orderId,
        paymentId: data.mihpayid,
        amount: parseFloat(data.amt || '0'),
        method: data.mode || 'UPI',
        errorCode: data.error_code,
        errorDescription: data.error_Message,
      };
    } catch (error: any) {
      throw new ProviderError(`Failed to get transaction status: ${error.message}`, 'payu', error);
    }
  }

  async refundPayment(params: RefundParams): Promise<any> {
    try {
      const refundAmount = params.amount?.toString() || '0';
      const hashString = `${this.credentials.keyId}|cancel_refund_transaction|${params.paymentId}|${refundAmount}|${this.credentials.merchantSalt}`;
      const hash = sha512(hashString);
      
      const response = await fetch(`${this.baseUrl}/merchant/postservice.php?form=2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          key: this.credentials.keyId!,
          command: 'cancel_refund_transaction',
          var1: params.paymentId,
          var2: refundAmount,
          hash: hash,
        }).toString(),
      });
      
      const data = await response.json() as any;
      
      return {
        refundId: data.request_id,
        paymentId: params.paymentId,
        amount: parseFloat(refundAmount),
        status: data.status,
        createdAt: new Date(),
        raw: data,
      };
    } catch (error: any) {
      throw new ProviderError(`Refund failed: ${error.message}`, 'payu', error);
    }
  }

  verifyWebhookSignature(payload: WebhookPayload): boolean {
    try {
      // PayU webhook verification
      const receivedHash = payload.signature;
      if (!receivedHash) return false;
      
      const paymentData = payload.payload;
      const hashString = `${this.credentials.merchantSalt}|${paymentData.status}|||||||||||${paymentData.email}|${paymentData.firstname}|${paymentData.productinfo}|${paymentData.amount}|${paymentData.txnid}|${this.credentials.keyId}`;
      const expectedHash = sha512(hashString);
      
      return expectedHash === receivedHash;
    } catch (error) {
      this.log('error', 'Webhook verification failed', error);
      return false;
    }
  }

  private mapStatus(payuStatus: string): TransactionStatus['status'] {
    const statusMap: Record<string, TransactionStatus['status']> = {
      'success': 'success',
      'failure': 'failed',
      'pending': 'pending',
      'in progress': 'processing',
    };
    return statusMap[payuStatus.toLowerCase()] || 'pending';
  }
}