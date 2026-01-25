import React, { useEffect, useState } from 'react';
import { Plus, Download, Send, FileText, Search, Filter, History } from 'lucide-react';
import { useQuotes } from './hooks';
import { Quote, QuoteItem, supabase } from './supabaseClient';
import { QuotePDFDownloadButton } from './QuotePDF';
import Modal from './Modal';
import QuoteRevisionHistory from './QuoteRevisionHistory';
import Badge from './Badge';
import Button from './Button';
import { useAuth } from './AuthContext';

interface QuotesProps {
  onCreateQuote?: () => void;
}

const Quotes = ({ onCreateQuote }: QuotesProps) => {
  const { profile } = useAuth();
  const { quotes, loading, error, refetch } = useQuotes();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'sent':
        return 'default';
      case 'draft':
        return 'neutral';
      case 'rejected':
        return 'danger';
      case 'expired':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const handleQuoteClick = async (quote: Quote) => {
    setSelectedQuote(quote);
    setIsDetailModalOpen(true);
    setLoadingItems(true);

    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQuoteItems(data || []);
    } catch (error) {
      console.error('Error fetching quote items:', error);
      setQuoteItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedQuote(null);
    setQuoteItems([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes & Proposals</h1>
          <p className="text-sm text-gray-500 mt-1">Manage campaign proposals and track quotes</p>
        </div>
        <Button icon={Plus} onClick={onCreateQuote}>Create New Quote</Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by client or campaign name..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" icon={Filter} size="md" className="flex-1 sm:flex-none">Filters</Button>
          <select className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-500">
            <option>All Statuses</option>
            <option>Draft</option>
            <option>Sent</option>
            <option>Accepted</option>
            <option>Rejected</option>
            <option>Expired</option>
          </select>
        </div>
      </div>

      {/* Quotes Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          <p className="mt-4 text-gray-500">Loading quotes...</p>
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No quotes created yet.</p>
          <Button icon={Plus}>Create Your First Quote</Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleQuoteClick(quote)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quote.quote_number || `#${quote.id.slice(0, 8)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quote.client_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quote.campaign_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(quote.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(quote.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={FileText}
                          onClick={() => handleQuoteClick(quote)}
                        >
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          title={`Quote ${selectedQuote.quote_number || `#${selectedQuote.id.slice(0, 8)}`}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Quote Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 mb-1">Client</p>
                <p className="text-sm font-semibold text-gray-900">{selectedQuote.client_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Campaign</p>
                <p className="text-sm font-semibold text-gray-900">{selectedQuote.campaign_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <Badge variant={getStatusVariant(selectedQuote.status)}>{selectedQuote.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Created</p>
                <p className="text-sm text-gray-900">{formatDate(selectedQuote.created_at)}</p>
              </div>
              {selectedQuote.valid_until && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Valid Until</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedQuote.valid_until)}</p>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h4>
              {loadingItems ? (
                <p className="text-sm text-gray-500">Loading items...</p>
              ) : quoteItems.length === 0 ? (
                <p className="text-sm text-gray-500">No items in this quote.</p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Talent</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Deliverable</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {quoteItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-gray-900">{item.talent_name}</td>
                          <td className="px-4 py-3 text-gray-600">{item.description}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                {selectedQuote.tax_amount && selectedQuote.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({selectedQuote.tax_rate}%):</span>
                    <span className="text-gray-900">{formatCurrency(selectedQuote.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-brand-600">{formatCurrency(selectedQuote.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedQuote.notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedQuote.notes}</p>
              </div>
            )}

            {/* Revision History */}
            <div className="pt-4 border-t border-gray-200">
              <QuoteRevisionHistory quoteId={selectedQuote.id} />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <QuotePDFDownloadButton
                quote={selectedQuote}
                items={quoteItems}
                companyName={profile?.company_name}
                companyEmail={profile?.company_email}
                companyPhone={profile?.company_phone}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </QuotePDFDownloadButton>

              <Button variant="secondary" icon={Send}>
                Share Quote
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Quotes;
