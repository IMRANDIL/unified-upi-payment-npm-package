// test.js
const { UnifiedUPIPayment } = require('./dist/index.js');

console.log('Testing Unified UPI Payment Package\n');

// Test 1: Basic initialization
try {
  const payment = new UnifiedUPIPayment({
    provider: 'googlepay',
    credentials: {
      merchantName: 'Test Merchant',
      merchantUPI: 'test@upi'
    }
  });
  
  console.log('✓ Package loaded successfully');
  console.log('✓ Google Pay provider initialized');
  
  // Test UPI link generation
  const link = payment.generateUPILink({
    pa: 'merchant@upi',
    pn: 'Test Merchant',
    am: '100',
    tn: 'Test Payment'
  });
  
  console.log('✓ UPI Link generated:', link.substring(0, 50) + '...');
  
  // Test capabilities
  const capabilities = payment.getProviderCapabilities();
  console.log('✓ Provider capabilities:', capabilities);
  
} catch (error) {
  console.error('✗ Test failed:', error.message);
}