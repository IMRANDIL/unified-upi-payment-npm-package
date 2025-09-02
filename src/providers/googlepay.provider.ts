// src/providers/googlepay.provider.ts

export class GooglePayProvider extends BaseProvider {
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    // Google Pay uses UPI deep links directly
    try {
      const orderId = `GPay_${Date.now()}`;
      
      const upiParams = {
        pa: this.credentials.merchantUPI, // Merchant VPA
        pn: this.credentials.merchantName,
        am: params.amount.toString(),
        cu: params.currency || 'INR',
        tn: params.notes?.description || 'Payment',
        tr: orderId,
        mc: this.credentials.merchantCode || '5411', // Merchant category code
      };
      
      // Generate UPI intent URL
      const upiUrl = this.generateUPILink(upiParams);
      
      // For web, generate QR code
      const qrCode = await this.generateQRCode(upiParams);
      
      return {
        orderId: orderId,
        amount: params.amount,
        currency: params.currency || 'INR',
        status: 'created',
        provider: 'googlepay',
        createdAt: new Date(),
        upiUrl: upiUrl,
        qrCode: qrCode,
        raw: { upiParams },
      };
    } catch (error: any) {
      throw new ProviderError(`GooglePay: ${error.message}`, 'googlepay', error);
    }
  }
  
  async verifyPayment(params: PaymentVerification): Promise<boolean> {
    // Google Pay verification through webhook
    // Implement based on your server setup
    return true;
  }
}
