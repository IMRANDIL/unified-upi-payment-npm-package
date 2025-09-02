import {
  CreateOrderParams,
  OrderResponse,
  PaymentVerification,
  UPILinkParams,
  RefundParams,
  TransactionStatus,
  WebhookPayload
} from '../types';
import { generateQRCode } from '../utils/qrcode';
import { Logger } from '../utils/logger';

export abstract class BaseProvider {
  protected credentials: any;
  protected environment: string;
  protected logger?: Logger;
  protected options?: any;

  constructor(credentials: any, environment = 'production', logger?: Logger, options?: any) {
    this.credentials = credentials;
    this.environment = environment;
    this.logger = logger;
    this.options = options;
  }

  abstract createOrder(params: CreateOrderParams): Promise<OrderResponse>;
  abstract verifyPayment(params: PaymentVerification): Promise<boolean>;
  abstract getTransactionStatus(orderId: string): Promise<TransactionStatus>;
  abstract refundPayment(params: RefundParams): Promise<any>;
  abstract verifyWebhookSignature(payload: WebhookPayload): boolean;

  generateUPILink(params: UPILinkParams): string {
    const { pa, pn, am, cu = 'INR', tn = '', tr = '', mc = '', url = '' } = params;
    
    const baseURL = 'upi://pay';
    const queryParams = new URLSearchParams();
    
    queryParams.append('pa', pa);
    queryParams.append('pn', pn);
    queryParams.append('am', am);
    queryParams.append('cu', cu);
    
    if (tn) queryParams.append('tn', tn);
    if (tr) queryParams.append('tr', tr);
    if (mc) queryParams.append('mc', mc);
    if (url) queryParams.append('url', url);
    
    return `${baseURL}?${queryParams.toString()}`;
  }

  async generateQRCode(params: UPILinkParams): Promise<string> {
    const upiLink = this.generateUPILink(params);
    return generateQRCode(upiLink);
  }

  protected log(level: string, message: string, data?: any): void {
    if (this.logger) {
      switch (level) {
        case 'info':
          this.logger.info(message, data);
          break;
        case 'debug':
          this.logger.debug(message, data);
          break;
        case 'error':
          this.logger.error(message, data);
          break;
        case 'warn':
          this.logger.warn(message, data);
          break;
      }
    }
  }
}
