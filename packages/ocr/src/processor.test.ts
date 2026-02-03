import { describe, it, expect } from 'vitest';
import { isSupportedFormat, getMimeType } from './processor';

describe('OCR Processor Utilities', () => {
  describe('isSupportedFormat', () => {
    it('accepts JPEG files', () => {
      expect(isSupportedFormat('receipt.jpg')).toBe(true);
      expect(isSupportedFormat('receipt.jpeg')).toBe(true);
      expect(isSupportedFormat('RECEIPT.JPG')).toBe(true);
    });

    it('accepts PNG files', () => {
      expect(isSupportedFormat('receipt.png')).toBe(true);
      expect(isSupportedFormat('RECEIPT.PNG')).toBe(true);
    });

    it('accepts GIF files', () => {
      expect(isSupportedFormat('receipt.gif')).toBe(true);
    });

    it('accepts WebP files', () => {
      expect(isSupportedFormat('receipt.webp')).toBe(true);
    });

    it('rejects unsupported formats', () => {
      expect(isSupportedFormat('receipt.pdf')).toBe(false);
      expect(isSupportedFormat('receipt.bmp')).toBe(false);
      expect(isSupportedFormat('receipt.tiff')).toBe(false);
      expect(isSupportedFormat('receipt.svg')).toBe(false);
      expect(isSupportedFormat('document.doc')).toBe(false);
    });

    it('handles files without extension', () => {
      expect(isSupportedFormat('receipt')).toBe(false);
    });
  });

  describe('getMimeType', () => {
    it('returns correct MIME type for JPEG', () => {
      expect(getMimeType('receipt.jpg')).toBe('image/jpeg');
      expect(getMimeType('receipt.jpeg')).toBe('image/jpeg');
    });

    it('returns correct MIME type for PNG', () => {
      expect(getMimeType('receipt.png')).toBe('image/png');
    });

    it('returns correct MIME type for GIF', () => {
      expect(getMimeType('receipt.gif')).toBe('image/gif');
    });

    it('returns correct MIME type for WebP', () => {
      expect(getMimeType('receipt.webp')).toBe('image/webp');
    });

    it('returns undefined for unsupported formats', () => {
      expect(getMimeType('receipt.pdf')).toBeUndefined();
      expect(getMimeType('receipt.bmp')).toBeUndefined();
    });

    it('handles case-insensitive extensions', () => {
      expect(getMimeType('RECEIPT.PNG')).toBe('image/png');
      expect(getMimeType('Receipt.Jpg')).toBe('image/jpeg');
    });
  });
});
