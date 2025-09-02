import * as crypto from 'crypto';

export function generateSignature(data: string, secret: string, algorithm = 'sha256'): string {
  return crypto
    .createHmac(algorithm, secret)
    .update(data)
    .digest('hex');
}

export function generateSHA512(data: string): string {
  return crypto
    .createHash('sha512')
    .update(data)
    .digest('hex');
}

export function verifySignature(
  data: string,
  signature: string,
  secret: string,
  algorithm = 'sha256'
): boolean {
  const expectedSignature = generateSignature(data, secret, algorithm);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function generateTransactionId(prefix = 'TXN'): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

export function encodeBase64(data: string): string {
  return Buffer.from(data).toString('base64');
}

export function decodeBase64(data: string): string {
  return Buffer.from(data, 'base64').toString('utf-8');
}
