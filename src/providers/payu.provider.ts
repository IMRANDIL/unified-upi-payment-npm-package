// src/providers/payu.provider.ts

export class PayUProvider extends BaseProvider {
  private baseUrl: string;
  
  constructor(credentials: any, environment = 'production', logger?: any) {
    super(credentials, environment, logger);
    this.baseUrl = environment === 'production'
      ? 'https://secure.payu.in'
      : 'https://test.payu.in';
  }
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const txnId = `PayU_${Date.now()}`;
      
      const hashString = `${this.credentials.merchantKey}|${txnId}|${params.amount}|${params.notes?.productInfo || 'Product'}|${params.customerInfo?.name || 'Customer'}|${params.customerInfo?.email || ''}|||||||||||${this.credentials.merchantSalt}`;
      
      const hash = crypto.createHash('sha512').update(hashString).digest('hex');
      
      const formData = new URLSearchParams({
        key: this.credentials.merchantKey!,
        txnid: txnId,
        amount: params.amount.toString(),
        productinfo: params.notes?.productInfo || 'Product',
        firstname: params.customerInfo?.name || 'Customer',
        email: params.customerInfo?.email || 'customer@example.com',
        phone: params.customerInfo?.contact || '9999999999',
        surl: params.returnUrl || 'https://example.com/success',
        furl: params.returnUrl || 'https://example.com/failure',
        hash: hash,
        udf1: '',
        udf2: '',
        udf3: '',
        udf4: '',
        udf5: '',
        pg: 'UPI',
      });
      
      const response = await fetch(`${this.baseUrl}/_payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      
      const data = await response.text();
      
      return {
        orderId: txnId,
        amount: params.amount,
        currency: params.currency || 'INR',
        status: 'created',
        provider: 'payu',
        createdAt: new Date(),
        paymentUrl: `${this.baseUrl}/_payment?${formData.toString()}`,
        raw: { txnId, hash },
      };
    } catch (error: any) {
      throw new ProviderError(`PayU: ${error.message}`, 'payu', error);
    }
  }
  
  async verifyPayment(params: PaymentVerification): Promise<boolean> {
    const hashString = `${this.credentials.merchantSalt}|${params.status}|||||||||||${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${this.credentials.merchantKey}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');
    return hash === params.hash;
  }
}
