// src/providers/paytm.provider.ts

import { ProviderError } from "../errors";
import { CreateOrderParams, OrderResponse } from "../types";
import { BaseProvider } from "./base.provider";

export class PaytmProvider extends BaseProvider {
  private baseUrl: string;
  
  constructor(credentials: any, environment = 'production', logger?: any) {
    super(credentials, environment, logger);
    this.baseUrl = environment === 'production'
      ? 'https://securegw.paytm.in'
      : 'https://securegw-stage.paytm.in';
  }
  
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const orderId = `ORDER_${Date.now()}`;
      
      const paytmParams: any = {
        body: {
          requestType: 'Payment',
          mid: this.credentials.mid,
          websiteName: this.credentials.website || 'WEBSTAGING',
          orderId: orderId,
          callbackUrl: this.options?.webhookUrl,
          txnAmount: {
            value: params.amount.toString(),
            currency: params.currency || 'INR',
          },
          userInfo: {
            custId: params.customerInfo?.contact || 'CUST_001',
            email: params.customerInfo?.email,
            mobile: params.customerInfo?.contact,
          },
          enablePaymentMode: [
            {
              mode: 'UPI',
              channels: ['UPIPUSH', 'UPIPUSHEXPRESS'],
            },
          ],
        },
      };
      
      const checksum = await this.generateChecksum(paytmParams.body);
      paytmParams.head = {
        signature: checksum,
      };
      
      const response = await fetch(
        `${this.baseUrl}/theia/api/v1/initiateTransaction?mid=${this.credentials.mid}&orderId=${orderId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paytmParams),
        }
      );
      
      const data = await response.json();
      
      if (data.body.resultInfo.resultStatus !== 'S') {
        throw new Error(data.body.resultInfo.resultMsg);
      }
      
      return {
        orderId: orderId,
        amount: params.amount,
        currency: params.currency || 'INR',
        status: 'created',
        provider: 'paytm',
        createdAt: new Date(),
        txnToken: data.body.txnToken,
        raw: data,
      };
    } catch (error: any) {
      throw new ProviderError(`Paytm: ${error.message}`, 'paytm', error);
    }
  }
  
  private async generateChecksum(payload: any): Promise<string> {
    const PaytmChecksum = require('paytmchecksum');
    return PaytmChecksum.generateSignature(
      JSON.stringify(payload),
      this.credentials.merchantKey
    );
  }
}