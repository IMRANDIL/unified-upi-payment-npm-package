export class UPIPaymentError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(message: string, code: string, statusCode = 500, details?: any) {
    super(message);
    this.name = 'UPIPaymentError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends UPIPaymentError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class ProviderError extends UPIPaymentError {
  constructor(message: string, provider: string, details?: any) {
    super(message, 'PROVIDER_ERROR', 502, { provider, ...details });
    this.name = 'ProviderError';
  }
}

export class ConfigurationError extends UPIPaymentError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
    this.name = 'ConfigurationError';
  }
}

export class NetworkError extends UPIPaymentError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 503, details);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends UPIPaymentError {
  constructor(message: string, details?: any) {
    super(message, 'TIMEOUT_ERROR', 504, details);
    this.name = 'TimeoutError';
  }
}