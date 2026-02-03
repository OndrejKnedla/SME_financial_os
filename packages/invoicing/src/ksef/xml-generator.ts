/**
 * FA(3) XML Generator for KSeF
 * Generates XML documents conforming to the Polish e-invoice standard
 */

import type {
  FA3Invoice,
  FA3VatRate,
  FA3VatBreakdown,
  FA3InvoiceItem,
  FA3Party,
  FA3PaymentMethod,
} from './types';

// XML escape helper
function escapeXml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Format amount in grosze to PLN with 2 decimal places
function formatAmount(grosze: number): string {
  return (grosze / 100).toFixed(2);
}

// Format date to ISO format (YYYY-MM-DD)
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] || '';
}

// Map VAT rate to FA(3) rate code
function mapVatRate(rate: FA3VatRate): string {
  return rate;
}

// Generate party (seller/buyer) XML
function generatePartyXml(party: FA3Party, tagName: string): string {
  const lines: string[] = [];
  lines.push(`    <${tagName}>`);

  // Identification
  if (party.nip) {
    lines.push(`      <NIP>${escapeXml(party.nip)}</NIP>`);
  }
  if (party.nipEU && !party.nip) {
    lines.push(`      <NrID>${escapeXml(party.nipEU)}</NrID>`);
  }

  // Name
  lines.push(`      <Nazwa>${escapeXml(party.name)}</Nazwa>`);
  if (party.tradeName) {
    lines.push(`      <NazwaHandlowa>${escapeXml(party.tradeName)}</NazwaHandlowa>`);
  }

  // Address
  lines.push(`      <Adres>`);
  lines.push(`        <KodKraju>${escapeXml(party.address.country)}</KodKraju>`);
  if (party.address.voivodeship) {
    lines.push(`        <Wojewodztwo>${escapeXml(party.address.voivodeship)}</Wojewodztwo>`);
  }
  if (party.address.county) {
    lines.push(`        <Powiat>${escapeXml(party.address.county)}</Powiat>`);
  }
  if (party.address.municipality) {
    lines.push(`        <Gmina>${escapeXml(party.address.municipality)}</Gmina>`);
  }
  lines.push(`        <Miejscowosc>${escapeXml(party.address.city)}</Miejscowosc>`);
  if (party.address.street) {
    lines.push(`        <Ulica>${escapeXml(party.address.street)}</Ulica>`);
  }
  lines.push(`        <NrDomu>${escapeXml(party.address.buildingNumber)}</NrDomu>`);
  if (party.address.apartmentNumber) {
    lines.push(`        <NrLokalu>${escapeXml(party.address.apartmentNumber)}</NrLokalu>`);
  }
  lines.push(`        <KodPocztowy>${escapeXml(party.address.postalCode)}</KodPocztowy>`);
  lines.push(`      </Adres>`);

  // Contact info
  if (party.email) {
    lines.push(`      <Email>${escapeXml(party.email)}</Email>`);
  }
  if (party.phone) {
    lines.push(`      <Telefon>${escapeXml(party.phone)}</Telefon>`);
  }

  lines.push(`    </${tagName}>`);
  return lines.join('\n');
}

// Generate invoice item XML
function generateItemXml(item: FA3InvoiceItem): string {
  const lines: string[] = [];
  lines.push(`      <FaWiersz>`);
  lines.push(`        <NrWierszaFa>${item.lineNumber}</NrWierszaFa>`);
  lines.push(`        <NazwaTowaru>${escapeXml(item.description)}</NazwaTowaru>`);

  // Classification codes
  if (item.pkwiuCode) {
    lines.push(`        <PKWiU>${escapeXml(item.pkwiuCode)}</PKWiU>`);
  }
  if (item.gtuCode) {
    lines.push(`        <GTU>${escapeXml(item.gtuCode)}</GTU>`);
  }
  if (item.cnCode) {
    lines.push(`        <CN>${escapeXml(item.cnCode)}</CN>`);
  }

  // Quantity and pricing
  lines.push(`        <Ilosc>${item.quantity}</Ilosc>`);
  lines.push(`        <JednostkaMiary>${escapeXml(item.unit)}</JednostkaMiary>`);
  lines.push(`        <CenaJednNetto>${formatAmount(item.unitPrice)}</CenaJednNetto>`);

  // Discounts
  if (item.discountPercent) {
    lines.push(`        <RabatProcent>${item.discountPercent}</RabatProcent>`);
  }
  if (item.discountAmount) {
    lines.push(`        <RabatKwota>${formatAmount(item.discountAmount)}</RabatKwota>`);
  }

  // Amounts
  lines.push(`        <WartoscNetto>${formatAmount(item.netAmount)}</WartoscNetto>`);
  lines.push(`        <StawkaPodatku>${mapVatRate(item.vatRate)}</StawkaPodatku>`);
  lines.push(`        <KwotaPodatku>${formatAmount(item.vatAmount)}</KwotaPodatku>`);
  lines.push(`        <WartoscBrutto>${formatAmount(item.grossAmount)}</WartoscBrutto>`);

  lines.push(`      </FaWiersz>`);
  return lines.join('\n');
}

// Generate VAT breakdown XML
function generateVatBreakdownXml(breakdown: FA3VatBreakdown[]): string {
  const lines: string[] = [];
  lines.push(`      <SumaVAT>`);

  for (const vat of breakdown) {
    lines.push(`        <SumaVATWgStawki>`);
    lines.push(`          <StawkaPodatku>${mapVatRate(vat.vatRate)}</StawkaPodatku>`);
    lines.push(`          <SumaNetto>${formatAmount(vat.netAmount)}</SumaNetto>`);
    lines.push(`          <SumaVAT>${formatAmount(vat.vatAmount)}</SumaVAT>`);
    lines.push(`        </SumaVATWgStawki>`);
  }

  lines.push(`      </SumaVAT>`);
  return lines.join('\n');
}

// Map payment method to FA(3) code
function mapPaymentMethod(method: FA3PaymentMethod): string {
  const methodMap: Record<FA3PaymentMethod, string> = {
    '1': '1', // Przelew
    '2': '2', // Gotówka
    '3': '3', // Karta
    '4': '4', // Czek
    '5': '5', // Kompensata
    '6': '6', // Inny
  };
  return methodMap[method] || '1';
}

/**
 * Generate FA(3) XML for KSeF submission
 */
export function generateFA3Xml(invoice: FA3Invoice): string {
  const lines: string[] = [];

  // XML Declaration
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');

  // Root element with namespaces
  lines.push('<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/"');
  lines.push('  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">');

  // Header
  lines.push('  <Naglowek>');
  lines.push(`    <KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>`);
  lines.push(`    <WariantFormularza>3</WariantFormularza>`);
  lines.push(`    <DataWytworzeniaFa>${new Date().toISOString()}</DataWytworzeniaFa>`);
  lines.push(`    <SystemInfo>${escapeXml(invoice.header.systemInfo)}</SystemInfo>`);
  lines.push('  </Naglowek>');

  // Subject (Parties)
  lines.push('  <Podmiot1>');
  lines.push(generatePartyXml(invoice.seller, 'DaneIdentyfikacyjne'));
  lines.push('  </Podmiot1>');

  lines.push('  <Podmiot2>');
  lines.push(generatePartyXml(invoice.buyer, 'DaneIdentyfikacyjne'));
  lines.push('  </Podmiot2>');

  // Invoice data
  lines.push('  <Fa>');

  // Invoice type and number
  lines.push(`    <KodWaluty>${invoice.currency}</KodWaluty>`);
  lines.push(`    <P_1>${formatDate(invoice.invoiceDate)}</P_1>`);
  if (invoice.salesDate) {
    lines.push(`    <P_6>${formatDate(invoice.salesDate)}</P_6>`);
  }
  lines.push(`    <P_2>${escapeXml(invoice.invoiceNumber)}</P_2>`);

  // Invoice type marker
  lines.push(`    <RodzajFaktury>${invoice.header.invoiceType}</RodzajFaktury>`);

  // Items
  lines.push('    <FaWiersze>');
  for (const item of invoice.items) {
    lines.push(generateItemXml(item));
  }
  lines.push('    </FaWiersze>');

  // Summary
  lines.push('    <Podsumowanie>');
  lines.push(generateVatBreakdownXml(invoice.summary.vatBreakdown));
  lines.push(`      <SumaWartNetto>${formatAmount(invoice.summary.totalNet)}</SumaWartNetto>`);
  lines.push(`      <SumaWartVAT>${formatAmount(invoice.summary.totalVat)}</SumaWartVAT>`);
  lines.push(`      <SumaWartBrutto>${formatAmount(invoice.summary.totalGross)}</SumaWartBrutto>`);
  if (invoice.summary.grossInWords) {
    lines.push(`      <Slownie>${escapeXml(invoice.summary.grossInWords)}</Slownie>`);
  }
  lines.push('    </Podsumowanie>');

  // Payment
  if (invoice.payment) {
    lines.push('    <Platnosc>');
    lines.push(`      <FormaPlatnosci>${mapPaymentMethod(invoice.payment.paymentMethod)}</FormaPlatnosci>`);
    lines.push(`      <TerminPlatnosci>${formatDate(invoice.payment.dueDate)}</TerminPlatnosci>`);
    if (invoice.payment.bankAccount) {
      lines.push(`      <NrRachunku>${escapeXml(invoice.payment.bankAccount)}</NrRachunku>`);
    }
    if (invoice.payment.bankName) {
      lines.push(`      <NazwaBanku>${escapeXml(invoice.payment.bankName)}</NazwaBanku>`);
    }
    if (invoice.payment.paidAmount) {
      lines.push(`      <ZaplaconeKwota>${formatAmount(invoice.payment.paidAmount)}</ZaplaconeKwota>`);
    }
    if (invoice.payment.remainingAmount) {
      lines.push(`      <DoZaplaty>${formatAmount(invoice.payment.remainingAmount)}</DoZaplaty>`);
    }
    lines.push('    </Platnosc>');
  }

  // Annotations
  if (invoice.annotations) {
    lines.push('    <Adnotacje>');
    if (invoice.annotations.selfBilling) {
      lines.push('      <P_16>1</P_16>');
    }
    if (invoice.annotations.reverseCharge) {
      lines.push('      <P_17>1</P_17>');
    }
    if (invoice.annotations.splitPayment) {
      lines.push('      <P_18>1</P_18>');
    }
    if (invoice.annotations.marginScheme) {
      lines.push('      <P_19>1</P_19>');
    }
    if (invoice.annotations.additionalInfo) {
      lines.push(`      <DodatkoweInfo>${escapeXml(invoice.annotations.additionalInfo)}</DodatkoweInfo>`);
    }
    if (invoice.annotations.relatedInvoice) {
      lines.push(`      <NrFaKorygowanej>${escapeXml(invoice.annotations.relatedInvoice)}</NrFaKorygowanej>`);
    }
    lines.push('    </Adnotacje>');
  }

  lines.push('  </Fa>');
  lines.push('</Faktura>');

  return lines.join('\n');
}

/**
 * Calculate hash of invoice XML for submission
 */
export function calculateInvoiceHash(xml: string): string {
  // In production, use SHA-256 hash
  // For now, return a placeholder - would need crypto module
  const encoder = new TextEncoder();
  const data = encoder.encode(xml);

  // Simple hash for demonstration (replace with proper SHA-256 in production)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i] ?? 0;
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16).padStart(64, '0');
}
