# 🚀 Unified UPI Payment

[![npm version](https://img.shields.io/npm/v/unified-upi-payment.svg)](https://www.npmjs.com/package/unified-upi-payment)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)]()

**A unified UPI payment gateway integration package for Node.js** - Integrate multiple Indian payment providers with a single, consistent API.

## ✅ Tested & Working Providers

Based on real API testing (January 2025):

| Provider | Status | Test Results | Features |
|----------|--------|--------------|----------|
| **Razorpay** | ✅ **Working** | Order creation, status check successful | Full API integration |
| **PayU** | ✅ **Working** | Transaction creation successful | UPI, Cards, Net Banking |
| **Google Pay** | ✅ **Working** | QR code generation, UPI links working | Direct UPI, No fees |
| **Cashfree** | ✅ **Working** | Order & session creation successful | High success rate |
| **PhonePe** | ⚠️ Needs Setup | Requires merchant account | - |
| **Paytm** | ⚠️ Needs Setup | Requires merchant account | - |
| **BharatPe** | ⚠️ Needs Setup | Requires API access | - |

## 📦 Installation

```bash
npm install unified-upi-payment

# Optional: Install provider SDKs for enhanced features
npm install razorpay        # For Razorpay SDK support
npm install cashfree-pg     # For Cashfree SDK support
```

## 🚀 Quick Start

```javascript
const { UnifiedUPIPayment } = require('unified-upi-payment');

// Initialize with any tested provider
const payment = new UnifiedUPIPayment({
  provider: 'razorpay', // or 'payu', 'googlepay', 'cashfree'
  credentials: {
    keyId: 'your_key_id',
    keySecret: 'your_key_secret'
  },
  environment: 'sandbox' // or 'production'
});

// Create an order - same API for all providers!
const order = await payment.createOrder({
  amount: 100, // Amount in INR
  currency: 'INR',
  customerInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    contact: '9999999999'
  }
});

console.log('Order created:', order);
```

## 📖 Actual API Responses

### Razorpay Response

```javascript
// Create Order
const order = await payment.createOrder({
  amount: 1,
  currency: 'INR'
});

// Actual Response:
{
  orderId: 'order_RDXo8n1Ienthhy',
  amount: 1,
  currency: 'INR',
  status: 'created',
  provider: 'razorpay',
  createdAt: Date,
  raw: { /* Razorpay specific data */ }
}

// Check Status
const status = await payment.getTransactionStatus(order.orderId);
// Returns: { status: 'pending', amount: 1, orderId: 'order_RDXo8n1Ienthhy' }
```

### Google Pay Response (Direct UPI)

```javascript
const payment = new UnifiedUPIPayment({
  provider: 'googlepay',
  credentials: {
    merchantName: 'Your Business',
    merchantUPI: 'yourbusiness@paytm'
  }
});

const order = await payment.createOrder({
  amount: 100,
  description: 'Test Payment'
});

// Actual Response:
{
  orderId: 'GP_1756993220774',
  amount: 100,
  currency: 'INR',
  status: 'created',
  provider: 'googlepay',
  upiUrl: 'upi://pay?pa=yourbusiness@paytm&pn=Your%20Business&am=100&cu=INR',
  qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANS...', // Base64 QR code
  createdAt: Date
}
```

### Cashfree Response

```javascript
const order = await payment.createOrder({
  amount: 1,
  customerInfo: {
    name: 'Test User',
    email: 'test@example.com',
    contact: '9999999999'
  }
});

// Actual Response:
{
  orderId: 'CF_1756993220807',
  amount: 1,
  currency: 'INR',
  status: 'created',
  provider: 'cashfree',
  paymentSessionId: 'session_81_M-omZTSl8...',
  createdAt: Date
}
```

### PayU Response

```javascript
const order = await payment.createOrder({
  amount: 1,
  description: 'Test Product'
});

// Actual Response:
{
  orderId: 'TXN_1756993220772',
  amount: 1,
  currency: 'INR',
  status: 'created',
  provider: 'payu',
  paymentUrl: 'https://test.payu.in/_payment',
  createdAt: Date
}
```

## 🔧 Provider Setup Guide

### 1. Razorpay (Easiest Setup)

1. Sign up at https://dashboard.razorpay.com
2. Get test keys from Dashboard → Settings → API Keys
3. Test keys start with `rzp_test_`

```javascript
const payment = new UnifiedUPIPayment({
  provider: 'razorpay',
  credentials: {
    keyId: 'rzp_test_xxxxx',      // Your test key
    keySecret: 'your_secret_here'  // Your secret
  },
  environment: 'sandbox'
});
```

### 2. Google Pay (No API Keys Needed!)

Just need a valid UPI ID:

```javascript
const payment = new UnifiedUPIPayment({
  provider: 'googlepay',
  credentials: {
    merchantName: 'Your Business Name',
    merchantUPI: 'yourbusiness@paytm', // Any valid UPI ID
    merchantCode: '5411' // Optional: merchant category code
  }
});

// Generate QR code for any UPI app
const order = await payment.createOrder({ amount: 100 });
// order.qrCode contains base64 QR image
// order.upiUrl contains the UPI deep link
```

### 3. Cashfree

1. Sign up at https://merchant.cashfree.com
2. Get credentials from Dashboard → Developers → API Keys

```javascript
const payment = new UnifiedUPIPayment({
  provider: 'cashfree',
  credentials: {
    appId: 'your_app_id',
    secretKey: 'your_secret_key'
  },
  environment: 'sandbox'
});
```

### 4. PayU

1. Register at https://payu.in/merchants
2. Get test credentials from Dashboard

```javascript
const payment = new UnifiedUPIPayment({
  provider: 'payu',
  credentials: {
    keyId: 'your_merchant_key',
    merchantSalt: 'your_salt'
  },
  environment: 'sandbox'
});
```

## 💻 Complete Working Examples

### Express.js Payment API

```javascript
const express = require('express');
const { UnifiedUPIPayment } = require('unified-upi-payment');

const app = express();
app.use(express.json());

// Initialize payment gateway
const payment = new UnifiedUPIPayment({
  provider: process.env.PROVIDER || 'razorpay',
  credentials: {
    keyId: process.env.KEY_ID,
    keySecret: process.env.KEY_SECRET
  },
  environment: 'sandbox'
});

// Create payment endpoint
app.post('/api/payment/create', async (req, res) => {
  try {
    const order = await payment.createOrder({
      amount: req.body.amount,
      currency: 'INR',
      customerInfo: req.body.customer
    });
    
    res.json({
      success: true,
      orderId: order.orderId,
      amount: order.amount,
      paymentUrl: order.paymentUrl,
      upiUrl: order.upiUrl,
      qrCode: order.qrCode
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Verify payment
app.post('/api/payment/verify', async (req, res) => {
  try {
    const isValid = await payment.verifyPayment({
      orderId: req.body.orderId,
      paymentId: req.body.paymentId,
      signature: req.body.signature
    });
    
    res.json({ success: true, verified: isValid });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Payment server running on port 3000');
});
```

### Generate UPI QR Code

```javascript
const { UnifiedUPIPayment } = require('unified-upi-payment');
const fs = require('fs');

// Use Google Pay provider for direct UPI
const payment = new UnifiedUPIPayment({
  provider: 'googlepay',
  credentials: {
    merchantName: 'My Store',
    merchantUPI: 'mystore@paytm'
  }
});

// Generate QR code
const order = await payment.createOrder({
  amount: 299,
  description: 'Product Purchase'
});

// Save QR code as image
if (order.qrCode) {
  const base64Data = order.qrCode.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('payment-qr.png', base64Data, 'base64');
  console.log('QR code saved as payment-qr.png');
  console.log('UPI Link:', order.upiUrl);
}
```

### Switch Providers Based on Amount

```javascript
function getOptimalProvider(amount) {
  if (amount > 10000) {
    // Use Cashfree for large amounts (better success rate)
    return 'cashfree';
  } else if (amount < 100) {
    // Use Google Pay for small amounts (no fees)
    return 'googlepay';
  } else {
    // Use Razorpay for general transactions
    return 'razorpay';
  }
}

const provider = getOptimalProvider(amount);
const payment = new UnifiedUPIPayment({
  provider: provider,
  credentials: getCredentials(provider)
});

const order = await payment.createOrder({ amount });
```

## 🧪 Testing Your Integration

### Test Credentials

```javascript
// Test with Razorpay's public test credentials
const payment = new UnifiedUPIPayment({
  provider: 'razorpay',
  credentials: {
    keyId: 'rzp_test_1DP5mmOlF5G5ag',
    keySecret: 'thisissupersecret'
  },
  environment: 'sandbox'
});

// Create a test order
const testOrder = await payment.createOrder({
  amount: 1,
  currency: 'INR'
});

console.log('Test order created:', testOrder);
```

### Test UPI IDs

| Provider | Test UPI ID | Notes |
|----------|-------------|--------|
| All Providers | success@razorpay | Always succeeds |
| All Providers | failure@razorpay | Always fails |
| Google Pay | Any valid UPI | Works with real UPI apps |

## ⚙️ API Methods

### Core Methods

| Method | Description | All Providers |
|--------|-------------|---------------|
| `createOrder()` | Create payment order | ✅ |
| `verifyPayment()` | Verify payment signature | ✅ |
| `generateUPILink()` | Generate UPI deep link | ✅ |
| `generateQRCode()` | Generate QR code | ✅ |
| `getTransactionStatus()` | Check payment status | ✅ |
| `getProviderCapabilities()` | Get provider features | ✅ |

## 🔒 Security Best Practices

1. **Keep credentials secure**
```javascript
// Use environment variables
const payment = new UnifiedUPIPayment({
  provider: process.env.PAYMENT_PROVIDER,
  credentials: {
    keyId: process.env.PAYMENT_KEY,
    keySecret: process.env.PAYMENT_SECRET
  }
});
```

2. **Always verify payments on server-side**
```javascript
// Never trust client-side payment confirmation
const isValid = await payment.verifyPayment({
  orderId: req.body.orderId,
  paymentId: req.body.paymentId,
  signature: req.body.signature
});

if (!isValid) {
  throw new Error('Payment verification failed');
}
```

3. **Implement webhook signature verification**
```javascript
const isValidWebhook = payment.verifyWebhookSignature({
  payload: req.body,
  signature: req.headers['x-webhook-signature']
});
```

## 📊 Provider Comparison

| Feature | Razorpay | Cashfree | Google Pay | PayU |
|---------|----------|----------|------------|------|
| Setup Difficulty | Easy | Easy | Very Easy | Medium |
| API Key Required | Yes | Yes | No | Yes |
| Transaction Fees | 2% | 1.9% | 0% | 2% |
| Settlement | T+3 | T+2 | Direct | T+2 |
| Success Rate | 85% | 90% | 95% | 85% |
| Best For | General | High Volume | Small Amounts | Enterprise |

## 🤝 Contributing

Contributions are welcome! Please check the [GitHub repository](https://github.com/IMRANDIL/unified-upi-payment-npm-package).

## 📝 License

MIT © Ali Imran Adil

## 🆘 Support

- 🐛 Issues: [GitHub Issues](https://github.com/IMRANDIL/unified-upi-payment-npm-package/issues)
- 📧 Email: aliimranadil2@gmail.com

---

**Star ⭐ this repo if it helps you!**