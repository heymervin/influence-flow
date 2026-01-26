import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Search, X, ChevronDown, Instagram } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase, Client, Talent, Deliverable } from './supabaseClient';
import { useTalents, useDeliverables, useAllTalentRates, useAllTalentSocialAccounts, useCategories, useAllTalentCategories } from './hooks';
import { formatFollowerCount } from './utils';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';

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

const CATEGORY_LABELS: Record<string, string> = {
  'content': 'Content',
  'paid_ad_rights': 'Paid Ad Rights',
  'talent_boosting': 'Talent Boosting',
  'ugc': 'UGC',
  'exclusivity': 'Extra Exclusivity',
  'agency_fee': 'Agency Service Fee',
};

const QuoteBuilder = ({ onBack, onSuccess }: QuoteBuilderProps) => {
  const { user, profile } = useAuth();
  const { talents } = useTalents();
  const { deliverables, loading: deliverablesLoading } = useDeliverables();
  const { getRate, loading: ratesLoading } = useAllTalentRates();
  const { getAccountsForTalent } = useAllTalentSocialAccounts();
  const { activeCategories, getCategoryById } = useCategories();
  const { getCategoriesForTalent } = useAllTalentCategories();

  // Client & Campaign
  const [clients, setClients] = useState<Client[]>([]);
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

  // Add Line Item Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [talentSearch, setTalentSearch] = useState('');
  const [selectedTalentId, setSelectedTalentId] = useState('');
  const [selectedDeliverableId, setSelectedDeliverableId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [talentFilter, setTalentFilter] = useState('');
  const [talentDropdownOpen, setTalentDropdownOpen] = useState(false);
  const talentDropdownRef = useRef<HTMLDivElement>(null);

  // Commission & ASF Settings
  const [commissionRate, setCommissionRate] = useState('15');
  const [asfRate, setAsfRate] = useState('5');
  const [enableAsf, setEnableAsf] = useState(true);

  // Terms
  const [termsAndConditions, setTermsAndConditions] = useState(profile?.quote_terms || DEFAULT_TERMS);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load clients on mount
  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  // Close talent dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (talentDropdownRef.current && !talentDropdownRef.current.contains(event.target as Node)) {
        setTalentDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchClients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setClients(data);
  };

  // Filter talents based on search and category filter
  const filteredTalents = useMemo(() => {
    return talents.filter(talent => {
      const accounts = getAccountsForTalent(talent.id);
      const handlesMatch = accounts.some(a =>
        a.handle.toLowerCase().includes(talentSearch.toLowerCase())
      );
      const matchesSearch = !talentSearch ||
        talent.name.toLowerCase().includes(talentSearch.toLowerCase()) ||
        handlesMatch;
      // Use category filter with new junction table
      const talentCategoryIds = getCategoriesForTalent(talent.id);
      const matchesFilter = !talentFilter || talentCategoryIds.includes(talentFilter);
      return matchesSearch && matchesFilter;
    });
  }, [talents, talentSearch, talentFilter, getAccountsForTalent, getCategoriesForTalent]);

  // Group deliverables by category
  const deliverablesByCategory = useMemo(() => {
    const grouped: Record<string, Deliverable[]> = {};
    deliverables.forEach(d => {
      const category = d.category || 'content';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(d);
    });
    return grouped;
  }, [deliverables]);

  const selectedTalent = talents.find(t => t.id === selectedTalentId);
  const selectedDeliverable = deliverables.find(d => d.id === selectedDeliverableId);

  // Get rate for selected talent + deliverable
  const currentRate = useMemo(() => {
    if (!selectedTalentId || !selectedDeliverableId) return 0;

    // Special handling for agency fee
    if (selectedDeliverable?.category === 'agency_fee') {
      return 50000; // $500 base (will be calculated differently)
    }

    return getRate(selectedTalentId, selectedDeliverableId);
  }, [selectedTalentId, selectedDeliverableId, getRate, selectedDeliverable]);

  // Add line item
  const handleAddLineItem = () => {
    if (!selectedTalentId || !selectedDeliverableId || quantity < 1) return;

    const talent = talents.find(t => t.id === selectedTalentId);
    const deliverable = deliverables.find(d => d.id === selectedDeliverableId);
    if (!talent || !deliverable) return;

    // Calculate unit price
    let unitPrice = currentRate;
    if (deliverable.category === 'agency_fee') {
      // Agency fee: $500 first month + $100 per additional month
      unitPrice = 50000 + (10000 * Math.max(0, quantity - 1));
    }

    const newItem: QuoteLineItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      talent_id: selectedTalentId,
      talent_name: talent.name,
      deliverable_id: selectedDeliverableId,
      deliverable_name: deliverable.name,
      deliverable_category: deliverable.category || 'content',
      quantity: deliverable.category === 'agency_fee' ? quantity : quantity,
      unit_price: deliverable.category === 'agency_fee' ? unitPrice : currentRate,
    };

    setLineItems(prev => [...prev, newItem]);

    // Reset form
    setSelectedDeliverableId('');
    setQuantity(1);
    setShowAddForm(false);
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  // Update line item quantity
  const updateLineItemQuantity = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      // Recalculate unit price for agency fee
      if (item.deliverable_category === 'agency_fee') {
        const unitPrice = 50000 + (10000 * Math.max(0, newQty - 1));
        return { ...item, quantity: newQty, unit_price: unitPrice };
      }

      return { ...item, quantity: newQty };
    }));
  };

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

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

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
  const handleSubmit = async () => {
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
          status: 'draft',
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
  if (deliverablesLoading || ratesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Client & Campaign</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Client Selection */}
          <div>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setIsNewClient(false)}
                className={`text-xs px-2 py-1 rounded ${!isNewClient ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Existing
              </button>
              <button
                type="button"
                onClick={() => setIsNewClient(true)}
                className={`text-xs px-2 py-1 rounded ${isNewClient ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                New Client
              </button>
            </div>
            {!isNewClient ? (
              <Select
                label="Client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                options={clients.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select client..."
                error={errors.client}
                required
              />
            ) : (
              <Input
                label="Client Name"
                value={clientFormData.name}
                onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                error={errors.client_name}
                placeholder="Company name"
                required
              />
            )}
          </div>

          {/* Campaign Name */}
          <Input
            label="Campaign Name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            error={errors.campaign_name}
            placeholder="Spring 2024 Launch"
            required
          />

          {/* Valid Until */}
          <Input
            label="Valid Until"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />

          {/* Commission & ASF */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Commission %"
              type="number"
              min="0"
              max="100"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
            />
            <div>
              <Input
                label="ASF %"
                type="number"
                min="0"
                max="100"
                value={asfRate}
                onChange={(e) => setAsfRate(e.target.value)}
                disabled={!enableAsf}
              />
              <label className="flex items-center gap-1 mt-1">
                <input
                  type="checkbox"
                  checked={enableAsf}
                  onChange={(e) => setEnableAsf(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-gray-500">Enable ASF</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
          <Button icon={Plus} size="sm" onClick={() => setShowAddForm(true)}>
            Add Item
          </Button>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Talent Search & Select */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Talent</label>
                <div ref={talentDropdownRef} className="relative">
                  {/* Search and Filter Row */}
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={talentSearch}
                        onChange={(e) => {
                          setTalentSearch(e.target.value);
                          setTalentDropdownOpen(true);
                        }}
                        onFocus={() => setTalentDropdownOpen(true)}
                        placeholder="Search talents..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={talentFilter}
                      onChange={(e) => setTalentFilter(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">All Categories</option>
                      {activeCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Talent Display / Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => setTalentDropdownOpen(!talentDropdownOpen)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 flex items-center justify-between"
                  >
                    {selectedTalent ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={selectedTalent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTalent.name)}`}
                          alt={selectedTalent.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="font-medium">{selectedTalent.name}</span>
                        <span className="text-gray-500">({selectedTalent.category})</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Select talent...</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${talentDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Options */}
                  {talentDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {filteredTalents.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No talents found</div>
                      ) : (
                        filteredTalents.map(talent => (
                          <button
                            key={talent.id}
                            type="button"
                            onClick={() => {
                              setSelectedTalentId(talent.id);
                              setSelectedDeliverableId('');
                              setTalentDropdownOpen(false);
                              setTalentSearch('');
                            }}
                            className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-brand-50 transition-colors ${
                              selectedTalentId === talent.id ? 'bg-brand-50' : ''
                            }`}
                          >
                            <img
                              src={talent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(talent.name)}`}
                              alt={talent.name}
                              className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0"
                            />
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{talent.name}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-2">
                                <span>{talent.category}</span>
                                {(() => {
                                  const accounts = getAccountsForTalent(talent.id);
                                  const igAccount = accounts.find(a => a.platform === 'instagram');
                                  return igAccount?.follower_count ? (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center">
                                        <Instagram className="w-3 h-3 mr-1" />
                                        {formatFollowerCount(igAccount.follower_count)}
                                      </span>
                                    </>
                                  ) : null;
                                })()}
                              </p>
                            </div>
                            {selectedTalentId === talent.id && (
                              <div className="w-2 h-2 rounded-full bg-brand-600"></div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Deliverable Select (grouped) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deliverable</label>
                <select
                  value={selectedDeliverableId}
                  onChange={(e) => setSelectedDeliverableId(e.target.value)}
                  disabled={!selectedTalentId}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select deliverable...</option>
                  {Object.entries(deliverablesByCategory).map(([category, items]) => (
                    <optgroup key={category} label={CATEGORY_LABELS[category] || category}>
                      {items.map(d => {
                        const rate = d.category === 'agency_fee' ? 50000 : getRate(selectedTalentId, d.id);
                        const hasRate = d.category === 'agency_fee' || rate > 0;
                        return (
                          <option key={d.id} value={d.id} disabled={!hasRate}>
                            {d.name} {hasRate ? `- ${formatCurrency(rate)}` : '(no rate)'}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Quantity & Add Button */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedDeliverable?.category === 'agency_fee' ? 'Months' : 'Qty'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <Button
                  onClick={handleAddLineItem}
                  disabled={!selectedTalentId || !selectedDeliverableId}
                >
                  Add
                </Button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedTalentId('');
                    setSelectedDeliverableId('');
                    setQuantity(1);
                    setTalentSearch('');
                    setTalentFilter('');
                    setTalentDropdownOpen(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Rate Preview */}
            {selectedTalentId && selectedDeliverableId && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {selectedTalent?.name} - {selectedDeliverable?.name}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {selectedDeliverable?.category === 'agency_fee'
                      ? `${formatCurrency(50000 + (10000 * Math.max(0, quantity - 1)))} (${quantity} mo)`
                      : `${formatCurrency(currentRate)} × ${quantity} = ${formatCurrency(currentRate * quantity)}`
                    }
                  </span>
                </div>
                {selectedDeliverable?.category === 'agency_fee' && (
                  <p className="text-xs text-gray-500 mt-1">$500 first month + $100/month after</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Line Items Table */}
        {lineItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 mb-2">No items added yet</p>
            <p className="text-sm text-gray-400">Click "Add Item" to start building your quote</p>
            {errors.items && <p className="text-sm text-red-600 mt-2">{errors.items}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Talent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deliverable</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  <th className="px-6 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineItems.map(item => {
                  const isAgencyFee = item.deliverable_category === 'agency_fee';
                  const subtotal = isAgencyFee ? item.unit_price : item.unit_price * item.quantity;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.talent_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.deliverable_name}
                        {isAgencyFee && (
                          <span className="block text-xs text-gray-400">
                            $500 first month + $100/mo after
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {isAgencyFee ? '$500+' : formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItemQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500"
                        />
                        {isAgencyFee && <span className="text-xs text-gray-400 ml-1">mo</span>}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(subtotal)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        {lineItems.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Talent Fees:</span>
                  <span className="text-gray-900">{formatCurrency(totals.talentFees)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Commission ({commissionRate}%):</span>
                  <span className="text-gray-900">{formatCurrency(totals.commissions)}</span>
                </div>
                {enableAsf && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ASF ({asfRate}%):</span>
                    <span className="text-gray-900">{formatCurrency(totals.asfTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-300">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-brand-600">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
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
          <Textarea
            label="Terms & Conditions"
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            rows={4}
            helperText="These terms will appear on the quote PDF"
          />
        </div>
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Quote'}
        </Button>
      </div>
    </div>
  );
};

export default QuoteBuilder;
