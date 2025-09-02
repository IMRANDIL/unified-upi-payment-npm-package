// src/utils/qrcode.ts
import QRCode from 'qrcode';

export interface QRCodeOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate a data URL (base64 PNG) for the given data.
 */
export async function generateQRCode(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const qrOptions = {
    // use 'png' per qrcode typings (not 'image/png')
    errorCorrectionLevel: 'M' as const,
    type: 'png' as const,
    // `quality` is only relevant for JPEG but harmless here
    quality: 0.92,
    margin: options.margin ?? 1,
    color: {
      dark: options.color?.dark ?? '#000000',
      light: options.color?.light ?? '#FFFFFF',
    },
    width: options.size ?? 256,
  };

  // Wrap callback overload in a Promise to avoid TS choosing the void overload
  return new Promise<string>((resolve, reject) => {
    // toDataURL supports callback form (err, url) and Promise form depending on lib version/typing
    // using callback ensures deterministic typing
    (QRCode as any).toDataURL(data, qrOptions, (err: any, url: string | undefined) => {
      if (err) return reject(err);
      if (!url) return reject(new Error('Failed to generate QR Data URL'));
      resolve(url);
    });
  });
}

/**
 * Generate a PNG buffer for the given data.
 */
export async function generateQRCodeBuffer(
  data: string,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  const qrOptions = {
    errorCorrectionLevel: 'M' as const,
    type: 'png' as const,
    quality: 0.92,
    margin: options.margin ?? 1,
    color: {
      dark: options.color?.dark ?? '#000000',
      light: options.color?.light ?? '#FFFFFF',
    },
    width: options.size ?? 256,
  };

  // Wrap callback API to guarantee Promise<Buffer>
  return new Promise<Buffer>((resolve, reject) => {
    (QRCode as any).toBuffer(data, qrOptions, (err: any, buffer: Buffer | undefined) => {
      if (err) return reject(err);
      if (!buffer) return reject(new Error('Failed to generate QR Buffer'));
      resolve(buffer);
    });
  });
}
