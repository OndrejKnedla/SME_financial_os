/**
 * OCR Package - Receipt and Invoice Processing
 * Uses Anthropic Claude Vision for document extraction
 */

// Types
export * from './types';

// Processor
export {
  DocumentProcessor,
  isSupportedFormat,
  getMimeType,
  type DocumentProcessorOptions,
} from './processor';

// Prompts (for customization)
export {
  RECEIPT_EXTRACTION_PROMPT,
  INVOICE_EXTRACTION_PROMPT,
  LANGUAGE_HINTS,
} from './prompts';
