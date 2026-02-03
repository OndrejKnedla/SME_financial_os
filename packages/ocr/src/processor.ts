/**
 * Document Processor using Anthropic Claude Vision
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ExtractionResult,
  ExtractedLineItem,
  ProcessingOptions,
  Currency,
  DocumentType,
} from './types';
import { ExtractionError, UnsupportedFormatError } from './types';
import { RECEIPT_EXTRACTION_PROMPT, INVOICE_EXTRACTION_PROMPT, LANGUAGE_HINTS } from './prompts';

// Supported image formats
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Media type mapping
type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export interface DocumentProcessorOptions {
  apiKey?: string;
  model?: string;
}

export class DocumentProcessor {
  private client: Anthropic;
  private model: string;

  constructor(options: DocumentProcessorOptions = {}) {
    const apiKey = options.apiKey || process.env['ANTHROPIC_API_KEY'];

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }

    this.client = new Anthropic({ apiKey });
    this.model = options.model || 'claude-sonnet-4-20250514';
  }

  /**
   * Process an image and extract receipt/invoice data
   */
  async processImage(
    imageData: Buffer | string,
    mimeType: string,
    options: ProcessingOptions = {}
  ): Promise<ExtractionResult> {
    // Validate format
    if (!SUPPORTED_FORMATS.includes(mimeType)) {
      throw new UnsupportedFormatError(mimeType);
    }

    // Convert buffer to base64 if needed
    const base64Data = Buffer.isBuffer(imageData)
      ? imageData.toString('base64')
      : imageData;

    // Build the prompt
    const prompt = this.buildPrompt(options);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens || 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as ImageMediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      // Extract the text content
      const textContent = response.content.find((c: { type: string }) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new ExtractionError('No text response from model');
      }

      // Parse the JSON response
      const result = this.parseResponse(textContent.text, options);
      return result;
    } catch (error) {
      if (error instanceof ExtractionError) {
        throw error;
      }

      throw new ExtractionError(
        error instanceof Error ? error.message : 'Unknown error during extraction'
      );
    }
  }

  /**
   * Process a PDF document (first page only for now)
   */
  async processPdf(
    pdfData: Buffer,
    options: ProcessingOptions = {}
  ): Promise<ExtractionResult> {
    // For PDF processing, we'd need to convert to image first
    // This is a placeholder - in production, use pdf-to-image library
    throw new UnsupportedFormatError('PDF processing requires conversion to image first');
  }

  /**
   * Build the extraction prompt based on options
   */
  private buildPrompt(options: ProcessingOptions): string {
    let prompt = RECEIPT_EXTRACTION_PROMPT;

    // Add language hints
    if (options.language && options.language !== 'auto') {
      const hint = LANGUAGE_HINTS[options.language];
      if (hint) {
        prompt += `\n\nLanguage hint: ${hint}`;
      }
    }

    // Add currency hint
    if (options.expectedCurrency) {
      prompt += `\n\nExpected currency: ${options.expectedCurrency}. If the currency is not clearly visible, assume this currency.`;
    }

    // Line items preference
    if (options.extractLineItems === false) {
      prompt += `\n\nNote: You can skip extracting individual line items if they are not clearly visible. Focus on the totals.`;
    }

    return prompt;
  }

  /**
   * Parse the model's JSON response
   */
  private parseResponse(text: string, options: ProcessingOptions): ExtractionResult {
    // Try to extract JSON from the response
    let jsonStr = text.trim();

    // Sometimes the model wraps JSON in markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new ExtractionError('Failed to parse JSON response from model');
    }

    // Validate and transform the response
    const warnings: string[] = parsed.warnings || [];

    // Validate total
    if (typeof parsed.total !== 'number' || parsed.total <= 0) {
      warnings.push('Total amount could not be determined');
    }

    // Validate currency
    const currency = this.validateCurrency(parsed.currency, options.expectedCurrency) || 'CZK';
    if (parsed.currency !== currency) {
      warnings.push(`Currency assumed as ${currency}`);
    }

    // Parse date
    let date: Date | undefined;
    if (parsed.date) {
      date = new Date(parsed.date);
      if (isNaN(date.getTime())) {
        date = undefined;
        warnings.push('Date could not be parsed');
      }
    }

    // Transform items
    const items: ExtractedLineItem[] = (parsed.items || []).map((item: any) => ({
      description: item.description || 'Unknown item',
      quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : undefined,
      totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : 0,
      vatRate: typeof item.vatRate === 'number' ? item.vatRate : undefined,
    }));

    // Build result
    const result: ExtractionResult = {
      success: true,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      documentType: this.validateDocumentType(parsed.documentType),
      date,
      invoiceNumber: parsed.invoiceNumber || undefined,
      subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : undefined,
      vatAmount: typeof parsed.vatAmount === 'number' ? parsed.vatAmount : undefined,
      total: typeof parsed.total === 'number' ? parsed.total : 0,
      currency,
      vendor: parsed.vendor
        ? {
            name: parsed.vendor.name || 'Unknown vendor',
            taxId: parsed.vendor.taxId || undefined,
            vatId: parsed.vendor.vatId || undefined,
            address: parsed.vendor.address || undefined,
            phone: parsed.vendor.phone || undefined,
            email: parsed.vendor.email || undefined,
          }
        : undefined,
      items,
      payment: parsed.payment
        ? {
            method: this.validatePaymentMethod(parsed.payment.method),
            cardLast4: parsed.payment.cardLast4 || undefined,
            bankAccount: parsed.payment.bankAccount || undefined,
          }
        : undefined,
      vatBreakdown: parsed.vatBreakdown
        ? parsed.vatBreakdown.map((vat: any) => ({
            rate: vat.rate || 0,
            base: vat.base || 0,
            amount: vat.amount || 0,
          }))
        : undefined,
      warnings,
    };

    return result;
  }

  /**
   * Validate and normalize currency
   */
  private validateCurrency(
    currency: string | undefined,
    expected?: Currency
  ): Currency {
    const validCurrencies: Currency[] = ['CZK', 'PLN', 'EUR', 'USD'];
    const upper = currency?.toUpperCase();

    if (upper && validCurrencies.includes(upper as Currency)) {
      return upper as Currency;
    }

    // Map common variations
    const currencyMap: Record<string, Currency> = {
      'KČ': 'CZK',
      'KC': 'CZK',
      'ZŁ': 'PLN',
      'ZL': 'PLN',
      '€': 'EUR',
      '$': 'USD',
    };

    if (currency) {
      const mapped = currencyMap[currency.toUpperCase()];
      if (mapped) {
        return mapped;
      }
    }

    return expected ?? 'CZK';
  }

  /**
   * Validate document type
   */
  private validateDocumentType(type: string | undefined): DocumentType {
    if (type === 'receipt' || type === 'invoice') {
      return type;
    }
    return 'unknown';
  }

  /**
   * Validate payment method
   */
  private validatePaymentMethod(
    method: string | undefined
  ): 'cash' | 'card' | 'transfer' | 'other' | undefined {
    if (!method) return undefined;

    const lower = method.toLowerCase();
    if (lower === 'cash' || lower === 'hotově' || lower === 'gotówka') return 'cash';
    if (lower === 'card' || lower === 'karta' || lower === 'kartą') return 'card';
    if (lower === 'transfer' || lower === 'převod' || lower === 'przelew') return 'transfer';

    return 'other';
  }
}

/**
 * Check if a file extension is supported
 */
export function isSupportedFormat(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Get MIME type from filename
 */
export function getMimeType(filename: string): string | undefined {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeMap[ext];
}
