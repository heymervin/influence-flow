import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Quote, QuoteItem } from './supabaseClient';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#0284c7',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#0284c7',
    marginBottom: 5,
  },
  quoteTitle: {
    fontSize: 10,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 100,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
  },
  value: {
    flex: 1,
    color: '#1f2937',
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    borderBottom: 1,
    borderBottomColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCol1: {
    width: '30%',
  },
  tableCol2: {
    width: '30%',
  },
  tableCol3: {
    width: '10%',
    textAlign: 'right',
  },
  tableCol4: {
    width: '15%',
    textAlign: 'right',
  },
  tableCol5: {
    width: '15%',
    textAlign: 'right',
  },
  totalsContainer: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  grandTotalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTop: 2,
    borderTopColor: '#1f2937',
    marginTop: 5,
  },
  grandTotalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },
  grandTotalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#0284c7',
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 3,
  },
});

// Format currency from cents to dollars
const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

// Format date
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

interface QuotePDFDocumentProps {
  quote: Quote;
  items: QuoteItem[];
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
}

// PDF Document Component
export const QuotePDFDocument: React.FC<QuotePDFDocumentProps> = ({
  quote,
  items,
  companyName = 'Influence Flow',
  companyEmail = 'contact@influenceflow.app',
  companyPhone = '(555) 123-4567',
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.quoteTitle}>
          Quote #{quote.quote_number || quote.id.slice(0, 8).toUpperCase()} • {formatDate(quote.created_at)}
        </Text>
      </View>

      {/* Quote Info */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Client:</Text>
          <Text style={styles.value}>{quote.client_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Campaign:</Text>
          <Text style={styles.value}>{quote.campaign_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{quote.status.toUpperCase()}</Text>
        </View>
        {quote.valid_until && (
          <View style={styles.row}>
            <Text style={styles.label}>Valid Until:</Text>
            <Text style={styles.value}>{formatDate(quote.valid_until)}</Text>
          </View>
        )}
      </View>

      {/* Line Items Table */}
      <View style={styles.table}>
        <Text style={styles.sectionTitle}>Line Items</Text>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableCol1}>Talent</Text>
          <Text style={styles.tableCol2}>Deliverable</Text>
          <Text style={styles.tableCol3}>Qty</Text>
          <Text style={styles.tableCol4}>Unit Rate</Text>
          <Text style={styles.tableCol5}>Total</Text>
        </View>

        {/* Table Rows */}
        {items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.tableCol1}>{item.talent_name}</Text>
            <Text style={styles.tableCol2}>{item.description}</Text>
            <Text style={styles.tableCol3}>{item.quantity}</Text>
            <Text style={styles.tableCol4}>{formatCurrency(item.unit_price)}</Text>
            <Text style={styles.tableCol5}>{formatCurrency(item.line_total)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalsContainer}>
        <View style={styles.totalRow}>
          <Text>Subtotal:</Text>
          <Text>{formatCurrency(quote.subtotal)}</Text>
        </View>

        {quote.tax_amount && quote.tax_amount > 0 && (
          <View style={styles.totalRow}>
            <Text>Tax ({quote.tax_rate}%):</Text>
            <Text>{formatCurrency(quote.tax_amount)}</Text>
          </View>
        )}

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Grand Total:</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(quote.total_amount)}</Text>
        </View>
      </View>

      {/* Notes */}
      {quote.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text>{quote.notes}</Text>
        </View>
      )}

      {/* Terms & Conditions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text>
          {quote.terms_and_conditions ||
            'Payment due within 30 days of invoice date. All deliverables subject to approval. Cancellations must be made 48 hours in advance.'}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{companyName}</Text>
        <Text style={styles.footerText}>Email: {companyEmail}</Text>
        <Text style={styles.footerText}>Phone: {companyPhone}</Text>
      </View>
    </Page>
  </Document>
);

interface QuotePDFDownloadButtonProps {
  quote: Quote;
  items: QuoteItem[];
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  children?: React.ReactNode;
  className?: string;
}

// Download Button Component
export const QuotePDFDownloadButton: React.FC<QuotePDFDownloadButtonProps> = ({
  quote,
  items,
  companyName,
  companyEmail,
  companyPhone,
  children = 'Download PDF',
  className = '',
}) => {
  const fileName = `quote-${quote.quote_number || quote.id.slice(0, 8)}-${quote.client_name.replace(/\s+/g, '-').toLowerCase()}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <QuotePDFDocument
          quote={quote}
          items={items}
          companyName={companyName}
          companyEmail={companyEmail}
          companyPhone={companyPhone}
        />
      }
      fileName={fileName}
      className={className}
    >
      {({ loading }) => (loading ? 'Generating PDF...' : children)}
    </PDFDownloadLink>
  );
};

interface QuotePDFPreviewProps {
  quote: Quote;
  items: QuoteItem[];
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
}

// Preview Component (for development/testing)
export const QuotePDFPreview: React.FC<QuotePDFPreviewProps> = (props) => (
  <PDFViewer width="100%" height="600px">
    <QuotePDFDocument {...props} />
  </PDFViewer>
);
