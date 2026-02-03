import React from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import type { InvoiceData, PDFGeneratorOptions } from './types';
import { styles } from './styles';
import { t, type Locale } from './translations';
import { formatCurrency, formatDate, formatPercent, formatAddress, getDocumentTypeLabel } from './utils';

interface InvoiceDocumentProps {
  data: InvoiceData;
  options?: PDFGeneratorOptions;
}

export function InvoiceDocument({ data, options = {} }: InvoiceDocumentProps) {
  const locale = data.locale || options.locale || 'cs';
  const showLogo = options.showLogo !== false && data.seller.logoUrl;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {showLogo && data.seller.logoUrl && (
              <Image src={data.seller.logoUrl} style={styles.logo} />
            )}
            <Text style={styles.documentTitle}>
              {getDocumentTypeLabel(data.type, locale)}
            </Text>
            <Text style={styles.documentNumber}>{data.number}</Text>
          </View>
        </View>

        {/* Seller & Buyer */}
        <View style={styles.infoRow}>
          {/* Seller */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockTitle}>{t('seller', locale)}</Text>
            <Text style={styles.companyName}>{data.seller.name}</Text>
            {formatAddress(data.seller.address).map((line, i) => (
              <Text key={i} style={styles.companyDetail}>{line}</Text>
            ))}
            {data.seller.taxId && (
              <Text style={styles.companyId}>
                {t('taxId', locale)}: {data.seller.taxId}
              </Text>
            )}
            {data.seller.vatId && (
              <Text style={styles.companyId}>
                {t('vatId', locale)}: {data.seller.vatId}
              </Text>
            )}
          </View>

          {/* Buyer */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockTitle}>{t('buyer', locale)}</Text>
            <Text style={styles.companyName}>{data.buyer.name}</Text>
            {formatAddress(data.buyer.address).map((line, i) => (
              <Text key={i} style={styles.companyDetail}>{line}</Text>
            ))}
            {data.buyer.taxId && (
              <Text style={styles.companyId}>
                {t('taxId', locale)}: {data.buyer.taxId}
              </Text>
            )}
            {data.buyer.vatId && (
              <Text style={styles.companyId}>
                {t('vatId', locale)}: {data.buyer.vatId}
              </Text>
            )}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>{t('issueDate', locale)}</Text>
            <Text style={styles.dateValue}>{formatDate(data.issueDate, locale)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>{t('dueDate', locale)}</Text>
            <Text style={styles.dateValue}>{formatDate(data.dueDate, locale)}</Text>
          </View>
          {data.variableSymbol && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>{t('variableSymbol', locale)}</Text>
              <Text style={styles.dateValue}>{data.variableSymbol}</Text>
            </View>
          )}
        </View>

        {/* KSeF badge for Poland */}
        {data.ksefId && locale === 'pl' && (
          <View style={styles.ksefBadge}>
            <Text style={styles.ksefText}>KSeF: {data.ksefId}</Text>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>
              {t('description', locale)}
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>
              {t('quantity', locale)}
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>
              {t('unitPrice', locale)}
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colVat]}>
              {t('taxRate', locale)}
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>
              {t('total', locale)}
            </Text>
          </View>

          {/* Rows */}
          {data.items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <Text style={[styles.tableCell, styles.colDescription]}>
                {item.description}
              </Text>
              <Text style={[styles.tableCell, styles.colQty]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCell, styles.colPrice]}>
                {formatCurrency(item.unitPrice, data.currency, locale)}
              </Text>
              <Text style={[styles.tableCell, styles.colVat]}>
                {formatPercent(item.taxRate)}
              </Text>
              <Text style={[styles.tableCell, styles.colTotal]}>
                {formatCurrency(item.totalGross, data.currency, locale)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{t('subtotal', locale)}</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(data.subtotal, data.currency, locale)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{t('taxAmount', locale)}</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(data.taxAmount, data.currency, locale)}
              </Text>
            </View>
            <View style={[styles.totalsRow, styles.totalsRowFinal]}>
              <Text style={styles.totalsLabelFinal}>{t('totalAmount', locale)}</Text>
              <Text style={styles.totalsValueFinal}>
                {formatCurrency(data.total, data.currency, locale)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        {data.bankAccount && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>{t('paymentDetails', locale)}</Text>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>{t('bankAccount', locale)}:</Text>
              <Text style={styles.paymentValue}>{data.bankAccount.accountNumber}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>{t('bankName', locale)}:</Text>
              <Text style={styles.paymentValue}>{data.bankAccount.bankName}</Text>
            </View>
            {data.bankAccount.iban && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{t('iban', locale)}:</Text>
                <Text style={styles.paymentValue}>{data.bankAccount.iban}</Text>
              </View>
            )}
            {data.bankAccount.swift && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{t('swift', locale)}:</Text>
                <Text style={styles.paymentValue}>{data.bankAccount.swift}</Text>
              </View>
            )}
            {data.variableSymbol && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{t('variableSymbol', locale)}:</Text>
                <Text style={styles.paymentValue}>{data.variableSymbol}</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>{t('notes', locale)}</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('generatedBy', locale)}</Text>
        </View>
      </Page>
    </Document>
  );
}
