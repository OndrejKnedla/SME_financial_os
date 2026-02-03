/**
 * KSeF API Client
 * Handles communication with the Polish National e-Invoice System
 */

import type {
  KSeFEnvironment,
  KSeFSession,
  KSeFAuthRequest,
  KSeFInvoiceResponse,
  KSeFInvoiceStatus,
  KSeFUPO,
  KSeFError,
} from './types';
import { KSeFApiError } from './types';

// KSeF API endpoints by environment
const KSEF_ENDPOINTS: Record<KSeFEnvironment, string> = {
  production: 'https://ksef.mf.gov.pl/api',
  test: 'https://ksef-test.mf.gov.pl/api',
  demo: 'https://ksef-demo.mf.gov.pl/api',
};

// Request headers
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export interface KSeFClientOptions {
  environment: KSeFEnvironment;
  timeout?: number;
}

export class KSeFClient {
  private baseUrl: string;
  private timeout: number;
  private session: KSeFSession | null = null;

  constructor(options: KSeFClientOptions) {
    this.baseUrl = KSEF_ENDPOINTS[options.environment];
    this.timeout = options.timeout || 30000;
  }

  /**
   * Initialize a new KSeF session
   */
  async initSession(auth: KSeFAuthRequest): Promise<KSeFSession> {
    const response = await this.request<{
      sessionToken: {
        token: string;
        context: {
          referenceNumber: string;
          timestamp: string;
        };
      };
    }>('/online/Session/InitToken', {
      method: 'POST',
      body: JSON.stringify({
        contextIdentifier: {
          type: 'onip',
          identifier: auth.nip,
        },
        authToken: auth.token,
      }),
    });

    this.session = {
      sessionToken: response.sessionToken.token,
      referenceNumber: response.sessionToken.context.referenceNumber,
      timestamp: new Date(response.sessionToken.context.timestamp),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    };

    return this.session;
  }

  /**
   * Terminate the current session
   */
  async terminateSession(): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    await this.request('/online/Session/Terminate', {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        SessionToken: this.session.sessionToken,
      },
    });

    this.session = null;
  }

  /**
   * Submit an invoice to KSeF
   */
  async submitInvoice(invoiceXml: string, invoiceHash: string): Promise<KSeFInvoiceResponse> {
    if (!this.session) {
      throw new Error('No active session. Call initSession first.');
    }

    // Base64 encode the XML
    const encodedXml = Buffer.from(invoiceXml, 'utf-8').toString('base64');

    const response = await this.request<{
      elementReferenceNumber: string;
      referenceNumber: string;
      processingCode: number;
      processingDescription: string;
      timestamp: string;
    }>('/online/Invoice/Send', {
      method: 'PUT',
      headers: {
        ...DEFAULT_HEADERS,
        SessionToken: this.session.sessionToken,
      },
      body: JSON.stringify({
        invoiceHash: {
          hashSHA: {
            algorithm: 'SHA-256',
            encoding: 'Base64',
            value: invoiceHash,
          },
          fileSize: invoiceXml.length,
        },
        invoicePayload: {
          type: 'plain',
          invoiceBody: encodedXml,
        },
      }),
    });

    return {
      referenceNumber: response.elementReferenceNumber,
      ksefReferenceNumber: response.referenceNumber,
      acquisitionTimestamp: new Date(response.timestamp),
      status: this.mapProcessingCode(response.processingCode),
    };
  }

  /**
   * Get the status of a submitted invoice
   */
  async getInvoiceStatus(referenceNumber: string): Promise<KSeFInvoiceStatus> {
    if (!this.session) {
      throw new Error('No active session. Call initSession first.');
    }

    const response = await this.request<{
      processingCode: number;
      processingDescription: string;
      elementReferenceNumber: string;
      ksefReferenceNumber?: string;
    }>(`/online/Invoice/Status/${referenceNumber}`, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        SessionToken: this.session.sessionToken,
      },
    });

    return this.mapProcessingCode(response.processingCode);
  }

  /**
   * Download UPO (Official Receipt Confirmation)
   */
  async downloadUPO(referenceNumber: string): Promise<KSeFUPO> {
    if (!this.session) {
      throw new Error('No active session. Call initSession first.');
    }

    const response = await this.request<{
      upo: {
        referenceNumber: string;
        ksefReferenceNumber: string;
        timestamp: string;
        invoiceHash: string;
        upoXml: string;
      };
    }>(`/online/Invoice/Get/Upo/${referenceNumber}`, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        SessionToken: this.session.sessionToken,
      },
    });

    return {
      referenceNumber: response.upo.referenceNumber,
      ksefReferenceNumber: response.upo.ksefReferenceNumber,
      timestamp: new Date(response.upo.timestamp),
      invoiceHash: response.upo.invoiceHash,
      upoXml: Buffer.from(response.upo.upoXml, 'base64').toString('utf-8'),
    };
  }

  /**
   * Test the connection to KSeF
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request<{ timestamp: string }>('/common/Status', {
        method: 'GET',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current session info
   */
  getSession(): KSeFSession | null {
    return this.session;
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    if (!this.session) return false;
    return this.session.expiresAt > new Date();
  }

  // Private methods

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...DEFAULT_HEADERS,
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new KSeFApiError({
          code: `HTTP_${response.status}`,
          message: errorBody.message || response.statusText,
          details: errorBody.details,
          timestamp: new Date(),
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof KSeFApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new KSeFApiError({
          code: 'TIMEOUT',
          message: 'Request timed out',
          timestamp: new Date(),
        });
      }

      throw new KSeFApiError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
        timestamp: new Date(),
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private mapProcessingCode(code: number): KSeFInvoiceStatus {
    switch (code) {
      case 100:
        return 'PENDING';
      case 200:
        return 'PROCESSING';
      case 300:
        return 'ACCEPTED';
      case 400:
        return 'REJECTED';
      default:
        return 'ERROR';
    }
  }
}

/**
 * Create a KSeF client for the specified environment
 */
export function createKSeFClient(environment: KSeFEnvironment = 'test'): KSeFClient {
  return new KSeFClient({ environment });
}
