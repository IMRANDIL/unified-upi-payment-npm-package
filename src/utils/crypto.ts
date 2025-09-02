import { createHash, createHmac } from 'crypto';

export const sha256 = (data: string): string => {
  return createHash('sha256').update(data).digest('hex');
};

export const sha512 = (data: string): string => {
  return createHash('sha512').update(data).digest('hex');
};

export const hmacSha256 = (data: string, secret: string): string => {
  return createHmac('sha256', secret).update(data).digest('hex');
};

export const hmacSha512 = (data: string, secret: string): string => {
  return createHmac('sha512', secret).update(data).digest('hex');
};

export const base64Encode = (data: string): string => {
  return Buffer.from(data).toString('base64');
};

export const base64Decode = (data: string): string => {
  return Buffer.from(data, 'base64').toString('utf-8');
};