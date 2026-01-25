import React, { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, FileText, DollarSign, Calendar, Plus } from 'lucide-react';
import { Client, Quote, supabase } from './supabaseClient';
import Modal from './Modal';
import Button from './Button';
import Badge from './Badge';

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const ClientDetailModal = ({ client, isOpen, onClose, onUpdate }: ClientDetailModalProps) => {
  const [clientQuotes, setClientQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [dealCount, setDealCount] = useState(0);

  useEffect(() => {
    if (client && isOpen) {
      fetchClientData();
    }
  }, [client, isOpen]);

  const fetchClientData = async () => {
    if (!client) return;

    setLoadingQuotes(true);

    try {
      // Fetch quotes for this client
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;
      setClientQuotes(quotes || []);

      // Fetch deals for this client to calculate revenue
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('commission_amount')
        .eq('client_id', client.id);

      if (dealsError) throw dealsError;

      const revenue = deals?.reduce((sum, d) => sum + (d.commission_amount || 0), 0) || 0;
      setTotalRevenue(revenue);
      setDealCount(deals?.length || 0);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'default';
      case 'accepted':
        return 'success';
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

  if (!client) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mr-4">
            <Building2 className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{client.name}</h2>
            <p className="text-sm text-gray-500">Client Details</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Contact Information */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Contact Person</p>
              <p className="text-sm text-gray-900">{client.contact_person || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <div className="flex items-center text-sm text-gray-900">
                {client.email ? (
                  <>
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`mailto:${client.email}`} className="text-brand-600 hover:underline">
                      {client.email}
                    </a>
                  </>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Phone</p>
              <div className="flex items-center text-sm text-gray-900">
                {client.phone ? (
                  <>
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`tel:${client.phone}`} className="text-brand-600 hover:underline">
                      {client.phone}
                    </a>
                  </>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Added</p>
              <div className="flex items-center text-sm text-gray-900">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                {formatDate(client.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-brand-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-brand-700">Total Revenue</span>
              <DollarSign className="w-5 h-5 text-brand-600" />
            </div>
            <p className="text-2xl font-bold text-brand-900">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-brand-600 mt-1">Commission earned</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-700">Total Quotes</span>
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">{clientQuotes.length}</p>
            <p className="text-xs text-green-600 mt-1">All time</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-700">Closed Deals</span>
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900">{dealCount}</p>
            <p className="text-xs text-purple-600 mt-1">Accepted quotes</p>
          </div>
        </div>

        {/* Notes */}
        {client.notes && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">{client.notes}</p>
            </div>
          </div>
        )}

        {/* Quotes History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Quote History</h3>
            <Button size="sm" icon={Plus}>Create Quote</Button>
          </div>

          {loadingQuotes ? (
            <div className="text-center py-8 text-gray-500">Loading quotes...</div>
          ) : clientQuotes.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No quotes for this client yet</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Quote #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clientQuotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{quote.quote_number}</td>
                      <td className="px-4 py-3 text-gray-600">{quote.campaign_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(quote.created_at)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(quote.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" icon={Plus}>
            Create Quote for Client
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ClientDetailModal;
