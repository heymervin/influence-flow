import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Search, X, ChevronDown, Instagram, HelpCircle, Save, FileText, Check, AlertCircle, MoreVertical, Copy, User } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase, Client, Talent, Deliverable } from './supabaseClient';
import { useTalents, useDeliverables, useAllTalentRates, useAllTalentSocialAccounts, useCategories, useAllTalentCategories, useClients, useTermsTemplates } from './hooks';
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
          <Button variant="danger" size="sm" onClick={onConfirm}>Remove</Button>
        </div>
      </div>
    </div>
  );
};

const QuoteBuilder = ({ onBack, onSuccess }: QuoteBuilderProps) => {
  const { user, profile } = useAuth();
  const { talents } = useTalents();
  const { deliverables, loading: deliverablesLoading } = useDeliverables();
  const { getRate, loading: ratesLoading } = useAllTalentRates();
  const { getAccountsForTalent } = useAllTalentSocialAccounts();
  const { activeCategories, getCategoryById } = useCategories();
  const { getCategoriesForTalent } = useAllTalentCategories();
  const { clients, loading: clientsLoading, refetch: refetchClients } = useClients();
  const { templates: termsTemplates, getDefaultTemplate } = useTermsTemplates();

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

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Bulk Add Mode
  const [showBulkAddForm, setShowBulkAddForm] = useState(false);
  const [selectedBulkTalentIds, setSelectedBulkTalentIds] = useState<string[]>([]);
  const [bulkDeliverableId, setBulkDeliverableId] = useState('');
  const [bulkQuantity, setBulkQuantity] = useState(1);

  // Autosave
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

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

  // Check if add button should be enabled
  const canAddItem = selectedTalentId && selectedDeliverableId && quantity >= 1;

  // Add line item
  const handleAddLineItem = () => {
    if (!canAddItem) return;

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

    // Show success toast
    setToast({ message: `Added ${deliverable.name} for ${talent.name}`, type: 'success' });

    // Reset form
    setSelectedDeliverableId('');
    setQuantity(1);
  };

  // Remove line item with confirmation
  const handleRemoveClick = (item: QuoteLineItem) => {
    setDeleteConfirm({ id: item.id, name: `${item.talent_name} - ${item.deliverable_name}` });
  };

  // Duplicate line item
  const handleDuplicateItem = (item: QuoteLineItem) => {
    const newItem: QuoteLineItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setLineItems(prev => [...prev, newItem]);
    setToast({ message: `Duplicated ${item.deliverable_name} for ${item.talent_name}`, type: 'success' });
  };

  const confirmRemoveItem = () => {
    if (deleteConfirm) {
      setLineItems(prev => prev.filter(item => item.id !== deleteConfirm.id));
      setToast({ message: 'Item removed from quote', type: 'success' });
      setDeleteConfirm(null);
    }
  };

  // Toggle talent selection for bulk add
  const toggleBulkTalentSelection = (talentId: string) => {
    setSelectedBulkTalentIds(prev =>
      prev.includes(talentId)
        ? prev.filter(id => id !== talentId)
        : [...prev, talentId]
    );
  };

  // Handle bulk add
  const handleBulkAdd = () => {
    if (selectedBulkTalentIds.length === 0 || !bulkDeliverableId) return;

    const deliverable = deliverables.find(d => d.id === bulkDeliverableId);
    if (!deliverable) return;

    const newItems: QuoteLineItem[] = selectedBulkTalentIds.map(talentId => {
      const talent = talents.find(t => t.id === talentId);
      const rate = deliverable.category === 'agency_fee' ? 50000 : getRate(talentId, bulkDeliverableId);

      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${talentId}`,
        talent_id: talentId,
        talent_name: talent?.name || '',
        deliverable_id: bulkDeliverableId,
        deliverable_name: deliverable.name,
        deliverable_category: deliverable.category || 'content',
        quantity: bulkQuantity,
        unit_price: deliverable.category === 'agency_fee'
          ? 50000 + (10000 * Math.max(0, bulkQuantity - 1))
          : rate,
      };
    }).filter(item => item.unit_price > 0); // Only add items with valid rates

    if (newItems.length === 0) {
      setToast({ message: 'No talents have rates for this deliverable', type: 'error' });
      return;
    }

    setLineItems(prev => [...prev, ...newItems]);
    setToast({
      message: `Added ${deliverable.name} for ${newItems.length} talent${newItems.length !== 1 ? 's' : ''}`,
      type: 'success'
    });

    // Reset bulk form
    setSelectedBulkTalentIds([]);
    setBulkDeliverableId('');
    setBulkQuantity(1);
    setShowBulkAddForm(false);
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

  // Clear selected talent
  const clearSelectedTalent = () => {
    setSelectedTalentId('');
    setSelectedDeliverableId('');
    setTalentSearch('');
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
  if (deliverablesLoading || ratesLoading || clientsLoading) {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Selection */}
            <div>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setIsNewClient(false)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${!isNewClient ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  Existing Client
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewClient(true)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${isNewClient ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'}`}
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

            {/* Valid Until with Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
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
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="">Quick set...</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  min={today}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
              <p className="text-sm text-gray-500 mt-0.5">Add talents and deliverables to your quote</p>
            </div>
            {!showAddForm && !showBulkAddForm && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowBulkAddForm(true)}>
                  Bulk Add
                </Button>
                <Button icon={Plus} size="sm" onClick={() => setShowAddForm(true)}>
                  Add Item
                </Button>
              </div>
            )}
          </div>

          {/* Add Item Form - Elevated Card */}
          {showAddForm && (
            <div className="m-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-brand-600" />
                    Add Line Item
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      clearSelectedTalent();
                      setQuantity(1);
                      setTalentFilter('');
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Talent Search & Select */}
                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Talent</label>
                    <div ref={talentDropdownRef} className="relative">
                      {/* Selected Talent Chip or Search */}
                      {selectedTalent ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg">
                          <img
                            src={selectedTalent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTalent.name)}`}
                            alt={selectedTalent.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-sm font-medium text-gray-900 flex-1">{selectedTalent.name}</span>
                          <button
                            onClick={clearSelectedTalent}
                            className="p-0.5 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Search and Filter Row */}
                          <div className="flex gap-2">
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
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                              />
                            </div>
                            <select
                              value={talentFilter}
                              onChange={(e) => setTalentFilter(e.target.value)}
                              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 w-32"
                            >
                              <option value="">All</option>
                              {activeCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>

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
                                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-brand-50 transition-colors"
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
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Deliverable Select (grouped) */}
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Deliverable</label>
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

                  {/* Quantity */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {selectedDeliverable?.category === 'agency_fee' ? 'Mo' : 'Qty'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white text-center"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="md:col-span-2 flex items-end">
                    <Button
                      onClick={handleAddLineItem}
                      disabled={!canAddItem}
                      className="w-full"
                      icon={Plus}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Rate Preview */}
                {selectedTalentId && selectedDeliverableId && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {selectedTalent?.name} - {selectedDeliverable?.name}
                      </span>
                      <span className="font-bold text-brand-600">
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
            </div>
          )}

          {/* Bulk Add Form */}
          {showBulkAddForm && (
            <div className="m-6">
              <div className="bg-gradient-to-br from-brand-50 to-purple-50 rounded-xl border-2 border-dashed border-brand-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-600" />
                    Bulk Add - Select Multiple Talents
                  </h3>
                  <button
                    onClick={() => {
                      setShowBulkAddForm(false);
                      setSelectedBulkTalentIds([]);
                      setBulkDeliverableId('');
                      setBulkQuantity(1);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Talent Selection Grid */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Talents ({selectedBulkTalentIds.length} selected)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border border-gray-200">
                      {talents.map(talent => {
                        const isSelected = selectedBulkTalentIds.includes(talent.id);
                        return (
                          <button
                            key={talent.id}
                            type="button"
                            onClick={() => toggleBulkTalentSelection(talent.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                              isSelected
                                ? 'bg-brand-100 border-2 border-brand-500 text-brand-700'
                                : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <img
                              src={talent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(talent.name)}`}
                              alt={talent.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="text-xs font-medium truncate">{talent.name}</span>
                            {isSelected && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Deliverable and Quantity */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Deliverable</label>
                      <select
                        value={bulkDeliverableId}
                        onChange={(e) => setBulkDeliverableId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Select deliverable...</option>
                        {Object.entries(deliverablesByCategory).map(([category, items]) => (
                          <optgroup key={category} label={CATEGORY_LABELS[category] || category}>
                            {items.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={bulkQuantity}
                        onChange={(e) => setBulkQuantity(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white text-center"
                      />
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleBulkAdd}
                      disabled={selectedBulkTalentIds.length === 0 || !bulkDeliverableId}
                      icon={Plus}
                    >
                      Add to {selectedBulkTalentIds.length} Talent{selectedBulkTalentIds.length !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Line Items - Grouped by Talent */}
          {lineItems.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No items added yet</p>
              <p className="text-sm text-gray-400">Click "Add Item" to start building your quote</p>
              {errors.items && <p className="text-sm text-red-600 mt-2">{errors.items}</p>}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {groupedLineItems.map(group => {
                const talent = talents.find(t => t.id === group.talentId);
                return (
                  <div key={group.talentId} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Talent Header */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center gap-3 border-b border-gray-200">
                      <img
                        src={talent?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.talentName)}`}
                        alt={group.talentName}
                        className="w-8 h-8 rounded-full object-cover object-top"
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">{group.talentName}</h4>
                        <p className="text-xs text-gray-500">{group.items.length} deliverable{group.items.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Subtotal</p>
                        <p className="text-sm font-bold text-brand-600">{formatCurrency(group.subtotal)}</p>
                      </div>
                    </div>

                    {/* Deliverable Items */}
                    <div className="divide-y divide-gray-100">
                      {group.items.map(item => {
                        const isAgencyFee = item.deliverable_category === 'agency_fee';
                        const itemSubtotal = isAgencyFee ? item.unit_price : item.unit_price * item.quantity;

                        return (
                          <div key={item.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{item.deliverable_name}</p>
                              {isAgencyFee && (
                                <p className="text-xs text-gray-400">$500 first month + $100/mo after</p>
                              )}
                            </div>
                            <div className="text-right text-sm text-gray-600 w-24">
                              {isAgencyFee ? '$500+' : formatCurrency(item.unit_price)}
                            </div>
                            <div className="flex items-center gap-1 w-24 justify-center">
                              <span className="text-gray-400">×</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateLineItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-14 px-2 py-1 text-sm text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                              />
                              {isAgencyFee && <span className="text-xs text-gray-400">mo</span>}
                            </div>
                            <div className="text-right text-sm font-semibold text-gray-900 w-24">
                              {formatCurrency(itemSubtotal)}
                            </div>
                            <div className="relative w-8">
                              <div className="group/menu">
                                <button className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 invisible group-hover/menu:visible group-focus-within/menu:visible">
                                  <button
                                    onClick={() => handleDuplicateItem(item)}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Copy className="w-4 h-4" />
                                    Duplicate
                                  </button>
                                  <button
                                    onClick={() => handleRemoveClick(item)}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Remove
                                  </button>
                                </div>
                              </div>
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
