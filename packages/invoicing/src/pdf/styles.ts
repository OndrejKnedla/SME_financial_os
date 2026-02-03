import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  // Page
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    width: 200,
    textAlign: 'right',
  },
  logo: {
    width: 120,
    height: 60,
    objectFit: 'contain',
    marginBottom: 10,
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  documentNumber: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },

  // Info blocks
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoBlock: {
    width: '48%',
  },
  infoBlockTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 10,
    color: '#444444',
    marginBottom: 2,
  },
  companyId: {
    fontSize: 9,
    color: '#666666',
    marginTop: 4,
  },

  // Dates section
  datesRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 20,
    borderRadius: 4,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 8,
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },

  // Items table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666666',
    textTransform: 'uppercase',
  },
  tableCell: {
    fontSize: 10,
    color: '#333333',
  },
  // Column widths
  colDescription: { flex: 3 },
  colQty: { width: 50, textAlign: 'center' },
  colPrice: { width: 80, textAlign: 'right' },
  colVat: { width: 50, textAlign: 'center' },
  colTotal: { width: 90, textAlign: 'right' },

  // Totals
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  totalsBlock: {
    width: 250,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  totalsRowFinal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: '#666666',
  },
  totalsValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
  },
  totalsLabelFinal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalsValueFinal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Payment info
  paymentSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 4,
    marginBottom: 20,
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  paymentLabel: {
    width: 120,
    fontSize: 9,
    color: '#666666',
  },
  paymentValue: {
    flex: 1,
    fontSize: 10,
    color: '#333333',
    fontWeight: 'bold',
  },

  // Notes
  notesSection: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#888888',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#aaaaaa',
  },

  // KSeF badge
  ksefBadge: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginTop: 8,
  },
  ksefText: {
    fontSize: 8,
    color: '#1976d2',
  },
});
