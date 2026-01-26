import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Trash2, X, HelpCircle, Save, FileText, Check, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';
import { useTalents, useDeliverables, useClients, useTermsTemplates } from './hooks';
import Textarea from './Textarea';
import Button from './Button';
import RateCardView from './RateCardView';
import TalentSearchFilter from './TalentSearchFilter';

interface QuoteBuilderProps {
  onBack: () => void;
  onSuccess?: () => void;
}

interface ClientFormData {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
}

interface QuoteLineItem {
  id: string;
  talent_id: string;
  talent_name: string;
  deliverable_id: string;
  deliverable_name: string;
  deliverable_category: string;
  quantity: number;
  unit_price: number; // in cents
}

const DEFAULT_TERMS = `Payment Terms:
- 50% deposit due upon contract signing
- Remaining 50% due upon content delivery
- Payment via bank transfer or check within 15 days

Content Rights:
- Client receives usage rights as specified in deliverables
- Talent retains ownership of content
- Additional usage rights available upon request

Cancellation:
- Cancellations must be made 48 hours in advance
- Deposit is non-refundable after content creation begins`;

// Tooltip component
const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => (
  <div className="relative group inline-flex items-center">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-slide-up ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Delete confirmation modal
const DeleteConfirmModal = ({
  isOpen,
  itemName,
  onConfirm,
  onCancel
}: {
  isOpen: boolean;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel}></div>
      <div className="relative bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Item?</h3>
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to remove <span className="font-medium">{itemName}</span> from this quote?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Remove</Button>
        </div>
      </div>
    </div>
  );
};

const QuoteBuilder = ({ onBack, onSuccess }: QuoteBuilderProps) => {
  const { user, profile } = useAuth();
  const { talents } = useTalents();
  const { deliverables, loading: deliverablesLoading } = useDeliverables();
  const { clients, loading: clientsLoading } = useClients();
  const { templates: termsTemplates } = useTermsTemplates();

  // Client & Campaign
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [clientFormData, setClientFormData] = useState<ClientFormData>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
  });
  const [campaignName, setCampaignName] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');

  // Line Items
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);

  // Commission & ASF Settings
  const [commissionRate, setCommissionRate] = useState('15');
  const [asfRate, setAsfRate] = useState('5');
  const [enableAsf, setEnableAsf] = useState(true);

  // Terms
  const [termsAndConditions, setTermsAndConditions] = useState(profile?.quote_terms || DEFAULT_TERMS);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Rate Card Mode
  const [rateCardTalentId, setRateCardTalentId] = useState('');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S: Save draft
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(true);
      }
      // Cmd/Ctrl + Enter: Create quote
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lineItems, selectedClientId, isNewClient, clientFormData, campaignName]); // Dependencies for handleSubmit

  // Remove line item with confirmation
  const handleRemoveClick = (item: QuoteLineItem) => {
    setDeleteConfirm({ id: item.id, name: `${item.talent_name} - ${item.deliverable_name}` });
  };

  const confirmRemoveItem = () => {
    if (deleteConfirm) {
      setLineItems(prev => prev.filter(item => item.id !== deleteConfirm.id));
      setToast({ message: 'Item removed from quote', type: 'success' });
      setDeleteConfirm(null);
    }
  };

  // Handle items from Rate Card
  const handleRateCardAdd = (items: QuoteLineItem[]) => {
    if (items.length === 0) return;

    setLineItems(prev => [...prev, ...items]);
    setToast({
      message: `Added ${items.length} item${items.length !== 1 ? 's' : ''} from rate card`,
      type: 'success'
    });

    // Keep rate card open for adding more items, just reset the talent
    setRateCardTalentId('');
  };

  // Get talent for rate card
  const rateCardTalent = talents.find(t => t.id === rateCardTalentId);

  // Calculate totals
  const totals = useMemo(() => {
    const commRate = parseFloat(commissionRate) / 100;
    const asfRateVal = enableAsf ? parseFloat(asfRate) / 100 : 0;

    let talentFees = 0;
    let commissions = 0;
    let asfTotal = 0;

    lineItems.forEach(item => {
      const isAgencyFee = item.deliverable_category === 'agency_fee';
      const itemTotal = isAgencyFee ? item.unit_price : item.unit_price * item.quantity;

      talentFees += itemTotal;
      commissions += Math.round(itemTotal * commRate);

      // Don't apply ASF percentage to agency fee line
      if (!isAgencyFee) {
        asfTotal += Math.round(itemTotal * asfRateVal);
      }
    });

    return {
      talentFees,
      commissions,
      asfTotal,
      total: talentFees + commissions + asfTotal,
    };
  }, [lineItems, commissionRate, asfRate, enableAsf]);

  // Group line items by talent
  const groupedLineItems = useMemo(() => {
    const groups: Record<string, { talentId: string; talentName: string; items: QuoteLineItem[]; subtotal: number }> = {};

    lineItems.forEach(item => {
      if (!groups[item.talent_id]) {
        groups[item.talent_id] = {
          talentId: item.talent_id,
          talentName: item.talent_name,
          items: [],
          subtotal: 0,
        };
      }
      const isAgencyFee = item.deliverable_category === 'agency_fee';
      const itemSubtotal = isAgencyFee ? item.unit_price : item.unit_price * item.quantity;
      groups[item.talent_id].items.push(item);
      groups[item.talent_id].subtotal += itemSubtotal;
    });

    return Object.values(groups);
  }, [lineItems]);

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Get today's date in YYYY-MM-DD format for min date validation
  const today = new Date().toISOString().split('T')[0];

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!isNewClient && !selectedClientId) {
      newErrors.client = 'Please select a client';
    }
    if (isNewClient && !clientFormData.name.trim()) {
      newErrors.client_name = 'Client name is required';
    }
    if (!campaignName.trim()) {
      newErrors.campaign_name = 'Campaign name is required';
    }
    if (lineItems.length === 0) {
      newErrors.items = 'Add at least one line item';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit quote
  const handleSubmit = async (asDraft: boolean = false) => {
    if (!user) {
      setSubmitError('You must be logged in');
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let clientId = selectedClientId;
      let clientName = '';

      // Create new client if needed
      if (isNewClient) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([{
            user_id: user.id,
            name: clientFormData.name.trim(),
            contact_person: clientFormData.contact_person.trim() || null,
            email: clientFormData.email.trim() || null,
            phone: clientFormData.phone.trim() || null,
          }])
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
        clientName = newClient.name;
      } else {
        const client = clients.find(c => c.id === clientId);
        clientName = client?.name || '';
      }

      // Generate quote number
      const timestamp = Date.now().toString(36).toUpperCase();
      const quoteNumber = `Q-${timestamp}`;

      // Create quote
      const { data: newQuote, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          user_id: user.id,
          client_id: clientId,
          client_name: clientName,
          campaign_name: campaignName.trim(),
          status: asDraft ? 'draft' : 'draft',
          quote_number: quoteNumber,
          subtotal: totals.talentFees,
          tax_rate: parseFloat(commissionRate),
          tax_amount: totals.commissions + totals.asfTotal,
          total_amount: totals.total,
          valid_until: validUntil || null,
          notes: notes.trim() || null,
          terms_and_conditions: termsAndConditions.trim(),
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create line items
      const itemsData = lineItems.map(item => {
        const isAgencyFee = item.deliverable_category === 'agency_fee';
        const itemTotal = isAgencyFee ? item.unit_price : item.unit_price * item.quantity;
        const commAmount = Math.round(itemTotal * (parseFloat(commissionRate) / 100));
        const asfAmount = isAgencyFee ? 0 : (enableAsf ? Math.round(itemTotal * (parseFloat(asfRate) / 100)) : 0);

        return {
          quote_id: newQuote.id,
          talent_id: item.talent_id,
          talent_name: item.talent_name,
          description: isAgencyFee
            ? `Agency Service Fee (${item.quantity} month${item.quantity > 1 ? 's' : ''})`
            : `${item.talent_name} - ${item.deliverable_name}`,
          rate_type: item.deliverable_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: itemTotal + commAmount + asfAmount,
        };
      });

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      if (onSuccess) {
        onSuccess();
      }
      onBack();
    } catch (error: any) {
      console.error('Error creating quote:', error);
      setSubmitError(error.message || 'Failed to create quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (deliverablesLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="pb-24"> {/* Padding for sticky footer */}
      <div className="space-y-12 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Quote</h1>
            <p className="text-sm text-gray-500 mt-1">Build a professional quote for your client</p>
          </div>
        </div>

        {/* Client & Campaign Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Client & Campaign</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Client <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setIsNewClient(false)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${
                      !isNewClient ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewClient(true)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${
                      isNewClient ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    New
                  </button>
                </div>
              </div>
              {!isNewClient ? (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                    errors.client ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={clientFormData.name}
                  onChange={(e) => setClientFormData({...clientFormData, name: e.target.value})}
                  placeholder="Company name"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                    errors.client_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              )}
              {(errors.client || errors.client_name) && (
                <p className="mt-1 text-xs text-red-600">{errors.client || errors.client_name}</p>
              )}
            </div>

            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Campaign Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Spring 2024 Launch"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                  errors.campaign_name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.campaign_name && (
                <p className="mt-1 text-xs text-red-600">{errors.campaign_name}</p>
              )}
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valid Until</label>
              <div className="flex gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    const days = parseInt(e.target.value);
                    if (days > 0) {
                      const date = new Date();
                      date.setDate(date.getDate() + days);
                      setValidUntil(date.toISOString().split('T')[0]);
                    }
                  }}
                  className="w-24 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Quick...</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                </select>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  min={today}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <p className="text-sm text-gray-500 mt-0.5">Select a talent to see their rate card</p>
          </div>

          <div className="p-6">
            {/* Talent Search/Selection - Show when no talent selected */}
            {!rateCardTalentId ? (
              <TalentSearchFilter
                talents={talents}
                onSelectTalent={(talentId) => setRateCardTalentId(talentId)}
              />
            ) : (
              /* Rate Card View - Show when talent is selected */
              <RateCardView
                talentId={rateCardTalentId}
                talentName={rateCardTalent?.name || ''}
                talentAvatar={rateCardTalent?.avatar_url}
                onAddToQuote={handleRateCardAdd}
                onClear={() => setRateCardTalentId('')}
                onAddAnotherTalent={() => setRateCardTalentId('')}
                allDeliverables={deliverables}
              />
            )}

            {/* Added Items Summary - Show below rate card */}
            {lineItems.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Added to Quote ({lineItems.length} item{lineItems.length !== 1 ? 's' : ''})
                </h3>

                {/* Group by talent */}
                {groupedLineItems.map(group => {
                  const talent = talents.find(t => t.id === group.talentId);
                  return (
                    <div key={group.talentId} className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                      {/* Talent Header */}
                      <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                        <img
                          src={talent?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.talentName)}`}
                          alt={group.talentName}
                          className="w-6 h-6 rounded-full object-cover object-top"
                        />
                        <span className="text-sm font-medium text-gray-900">{group.talentName}</span>
                        <span className="text-xs text-gray-500">({group.items.length} items)</span>
                        <span className="ml-auto text-sm font-semibold text-gray-900">
                          {formatCurrency(group.subtotal)}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-gray-100">
                        {group.items.map(item => {
                          const isAgencyFee = item.deliverable_category === 'agency_fee';
                          const itemSubtotal = isAgencyFee ? item.unit_price : item.unit_price * item.quantity;

                          return (
                            <div key={item.id} className="px-4 py-2 flex items-center justify-between text-sm">
                              <span className="text-gray-700">{item.deliverable_name}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-gray-500">{item.quantity} × {formatCurrency(item.unit_price)}</span>
                                <span className="font-medium">{formatCurrency(itemSubtotal)}</span>
                                <button
                                  onClick={() => handleRemoveClick(item)}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {lineItems.length === 0 && !rateCardTalentId && (
              <div className="text-center py-8 text-gray-500 mt-6 border-t border-gray-200">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No items added yet</p>
                <p className="text-sm text-gray-400 mt-1">Select a talent above to start building your quote</p>
                {errors.items && <p className="text-sm text-red-600 mt-2">{errors.items}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Pricing & Fees Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Pricing & Fees</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Fee Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Fee Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-sm font-medium text-gray-700">Commission %</label>
                    <Tooltip content="Your agency commission added to talent fees">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-sm font-medium text-gray-700">ASF %</label>
                    <Tooltip content="Agency Service Fee - additional markup for account management">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    </Tooltip>
                    <label className="flex items-center gap-1 ml-auto">
                      <input
                        type="checkbox"
                        checked={enableAsf}
                        onChange={(e) => setEnableAsf(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs text-gray-500">Enable</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={asfRate}
                    onChange={(e) => setAsfRate(e.target.value)}
                    disabled={!enableAsf}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Summary Breakdown */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Quote Summary</h3>
              {lineItems.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Add line items to see totals</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Talent Fees</span>
                    <span className="text-gray-900 font-medium">{formatCurrency(totals.talentFees)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      Commission ({commissionRate}%)
                      <Tooltip content="Your agency commission">
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </Tooltip>
                    </span>
                    <span className="text-gray-900 font-medium">{formatCurrency(totals.commissions)}</span>
                  </div>
                  {enableAsf && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        ASF ({asfRate}%)
                        <Tooltip content="Agency Service Fee for account management">
                          <HelpCircle className="w-3 h-3 text-gray-400" />
                        </Tooltip>
                      </span>
                      <span className="text-gray-900 font-medium">{formatCurrency(totals.asfTotal)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-300 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-brand-600">{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <Textarea
              label="Internal Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Optional notes for internal reference..."
            />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
                <select
                  onChange={(e) => {
                    const template = termsTemplates.find(t => t.id === e.target.value);
                    if (template) {
                      setTermsAndConditions(template.content);
                    }
                  }}
                  className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Load template...</option>
                  {termsTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">These terms will appear on the quote PDF</p>
            </div>
          </div>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}
      </div>

      {/* Sticky Footer with Full Breakdown */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-5xl mx-auto px-6 py-3">
          {lineItems.length > 0 && (
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Talent Fees:</span>
                  <span className="ml-1 font-medium text-gray-900">{formatCurrency(totals.talentFees)}</span>
                </div>
                <span className="text-gray-300">+</span>
                <div>
                  <span className="text-gray-500">Commission ({commissionRate}%):</span>
                  <span className="ml-1 font-medium text-gray-900">{formatCurrency(totals.commissions)}</span>
                </div>
                {enableAsf && (
                  <>
                    <span className="text-gray-300">+</span>
                    <div>
                      <span className="text-gray-500">ASF ({asfRate}%):</span>
                      <span className="ml-1 font-medium text-gray-900">{formatCurrency(totals.asfTotal)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500 mr-2">{lineItems.length} item{lineItems.length !== 1 ? 's' : ''}</span>
                <span className="text-xl font-bold text-brand-600">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">⌘S</kbd> Save Draft
              <span className="mx-2">|</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">⌘↵</kbd> Create Quote
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onBack}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                icon={Save}
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
              >
                Save Draft
              </Button>
              <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Quote'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteConfirm}
        itemName={deleteConfirm?.name || ''}
        onConfirm={confirmRemoveItem}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};

export default QuoteBuilder;
