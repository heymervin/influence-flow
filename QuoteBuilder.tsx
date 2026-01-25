import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase, Client, Talent, Deliverable } from './supabaseClient';
import { useTalents, useDeliverables, useAllTalentRates } from './hooks';
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

// Talent rate card entry with quantities per deliverable
interface TalentRateCard {
  id: string;
  talent: Talent;
  quantities: Record<string, number>; // deliverableId -> quantity
}

interface LineItem {
  id: string;
  talent_id: string;
  talent_name: string;
  description: string;
  rate_type: string;
  quantity: number;
  unit_price: number; // in cents
  talent_fee: number; // in cents (rate × qty)
  commission_amount: number; // in cents
  asf_amount: number; // in cents
  line_total: number; // in cents
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

const QuoteBuilder = ({ onBack, onSuccess }: QuoteBuilderProps) => {
  const { user, profile } = useAuth();
  const { talents } = useTalents();
  const { deliverables, loading: deliverablesLoading } = useDeliverables();
  const { getRate, loading: ratesLoading } = useAllTalentRates();

  // Client & Campaign
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
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

  // Talent Rate Cards
  const [talentRateCards, setTalentRateCards] = useState<TalentRateCard[]>([]);
  const [selectedTalentToAdd, setSelectedTalentToAdd] = useState('');

  // Commission & ASF Settings
  const [commissionRate, setCommissionRate] = useState('15'); // Default 15%
  const [asfRate, setAsfRate] = useState('5'); // Default 5% ASF
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

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user!.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Format currency from cents
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Group deliverables by platform
  const deliverablesByPlatform = deliverables.reduce((acc, deliverable) => {
    if (!acc[deliverable.platform]) {
      acc[deliverable.platform] = [];
    }
    acc[deliverable.platform].push(deliverable);
    return acc;
  }, {} as Record<string, Deliverable[]>);

  // Platform display names
  const platformNames: Record<string, string> = {
    'instagram': 'Instagram',
    'tiktok': 'TikTok',
    'youtube': 'YouTube',
    'cross-platform': 'Cross-Platform',
  };

  // Add a talent to the quote
  const addTalent = () => {
    if (!selectedTalentToAdd) return;

    const talent = talents.find(t => t.id === selectedTalentToAdd);
    if (!talent) return;

    // Check if talent is already added
    if (talentRateCards.some(rc => rc.talent.id === talent.id)) {
      return;
    }

    const newRateCard: TalentRateCard = {
      id: Math.random().toString(36).substr(2, 9),
      talent,
      quantities: {},
    };

    setTalentRateCards(prev => [...prev, newRateCard]);
    setSelectedTalentToAdd('');
  };

  // Remove a talent from the quote
  const removeTalent = (rateCardId: string) => {
    setTalentRateCards(prev => prev.filter(rc => rc.id !== rateCardId));
  };

  // Update quantity for a talent/service
  const updateQuantity = (rateCardId: string, serviceId: string, quantity: number) => {
    setTalentRateCards(prev =>
      prev.map(rc => {
        if (rc.id === rateCardId) {
          return {
            ...rc,
            quantities: {
              ...rc.quantities,
              [serviceId]: quantity,
            },
          };
        }
        return rc;
      })
    );
  };

  // Calculate line items from rate cards
  const calculateLineItems = (): LineItem[] => {
    const items: LineItem[] = [];
    const commRate = parseFloat(commissionRate) / 100;
    const asfRateValue = enableAsf ? parseFloat(asfRate) / 100 : 0;

    talentRateCards.forEach(rateCard => {
      deliverables.forEach(deliverable => {
        const quantity = rateCard.quantities[deliverable.id] || 0;
        if (quantity > 0) {
          const rate = getRate(rateCard.talent.id, deliverable.id);
          const talentFee = rate * quantity;
          const commissionAmount = Math.round(talentFee * commRate);
          const asfAmount = Math.round(talentFee * asfRateValue);
          const lineTotal = talentFee + commissionAmount + asfAmount;

          items.push({
            id: `${rateCard.id}-${deliverable.id}`,
            talent_id: rateCard.talent.id,
            talent_name: rateCard.talent.name,
            description: `${rateCard.talent.name} - ${deliverable.name}`,
            rate_type: deliverable.name,
            quantity,
            unit_price: rate,
            talent_fee: talentFee,
            commission_amount: commissionAmount,
            asf_amount: asfAmount,
            line_total: lineTotal,
          });
        }
      });
    });

    return items;
  };

  // Calculate totals
  const calculateTotals = () => {
    const lineItems = calculateLineItems();
    const talentFees = lineItems.reduce((sum, item) => sum + item.talent_fee, 0);
    const commissions = lineItems.reduce((sum, item) => sum + item.commission_amount, 0);
    const asfTotal = lineItems.reduce((sum, item) => sum + item.asf_amount, 0);
    const total = talentFees + commissions + asfTotal;

    return { talentFees, commissions, asfTotal, total, lineItems };
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
    if (talentRateCards.length === 0) {
      newErrors.talents = 'Add at least one talent';
    }

    const lineItems = calculateLineItems();
    if (lineItems.length === 0) {
      newErrors.quantities = 'Enter quantities for at least one deliverable';
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
            contact_person: clientFormData.contact_person.trim(),
            email: clientFormData.email.trim(),
            phone: clientFormData.phone.trim(),
          }])
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
        clientName = newClient.name;
      } else {
        const client = clients.find(c => c.id === selectedClientId);
        clientName = client?.name || '';
      }

      // Generate quote number
      const { data: lastQuote } = await supabase
        .from('quotes')
        .select('quote_number')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let quoteNumber = 'Q001';
      if (lastQuote?.quote_number) {
        const lastNumber = parseInt(lastQuote.quote_number.substring(1));
        quoteNumber = `Q${String(lastNumber + 1).padStart(3, '0')}`;
      }

      const { talentFees, commissions, asfTotal, total, lineItems } = calculateTotals();

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
          subtotal: talentFees,
          tax_rate: parseFloat(commissionRate),
          tax_amount: commissions + asfTotal,
          total_amount: total,
          valid_until: validUntil || null,
          notes: notes.trim() || null,
          terms_and_conditions: termsAndConditions.trim(),
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create line items
      const lineItemsData = lineItems.map(item => ({
        quote_id: newQuote.id,
        talent_id: item.talent_id,
        talent_name: item.talent_name,
        description: item.description,
        rate_type: item.rate_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      }));

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(lineItemsData);

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

  const { talentFees, commissions, asfTotal, total } = calculateTotals();

  // Get available talents (not already added)
  const availableTalents = talents.filter(
    t => !talentRateCards.some(rc => rc.talent.id === t.id)
  );

  // Loading state
  if (deliverablesLoading || ratesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          <p className="mt-4 text-gray-500">Loading calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          icon={ArrowLeft}
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900"
        >
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
          <div>
            <Input
              label="Campaign Name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              error={errors.campaign_name}
              placeholder="Spring 2024 Launch"
              required
            />
          </div>

          {/* Valid Until */}
          <div>
            <Input
              label="Valid Until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

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

      {/* Add Talent Button */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Select
            value={selectedTalentToAdd}
            onChange={(e) => setSelectedTalentToAdd(e.target.value)}
            options={availableTalents.map(t => ({ value: t.id, label: t.name }))}
            placeholder="Select talent to add..."
            className="flex-1"
          />
          <Button icon={Plus} onClick={addTalent} disabled={!selectedTalentToAdd}>
            Add Talent
          </Button>
        </div>
        {errors.talents && <p className="text-sm text-red-600 mt-2">{errors.talents}</p>}
        {errors.quantities && <p className="text-sm text-red-600 mt-2">{errors.quantities}</p>}
      </div>

      {/* Talent Rate Cards */}
      {talentRateCards.map((rateCard) => (
        <div key={rateCard.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Talent Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{rateCard.talent.name}</h3>
                <p className="text-sm text-gray-500">{rateCard.talent.category}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={() => removeTalent(rateCard.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Remove
            </Button>
          </div>

          {/* Rate Card Tables by Platform */}
          {Object.entries(deliverablesByPlatform).map(([platform, platformDeliverables]) => (
            <div key={platform}>
              {/* Platform Header */}
              <div className="bg-gray-100 px-6 py-2 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {platformNames[platform] || platform}
                </h4>
              </div>

              {/* Deliverables Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deliverable
                      </th>
                      <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Qty
                      </th>
                      <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Talent Fee
                      </th>
                      <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commission
                      </th>
                      {enableAsf && (
                        <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ASF
                        </th>
                      )}
                      <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sub Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {platformDeliverables.map((deliverable) => {
                      const rate = getRate(rateCard.talent.id, deliverable.id);
                      const quantity = rateCard.quantities[deliverable.id] || 0;
                      const talentFee = rate * quantity;
                      const commAmount = Math.round(talentFee * (parseFloat(commissionRate) / 100));
                      const asfAmount = enableAsf ? Math.round(talentFee * (parseFloat(asfRate) / 100)) : 0;
                      const subTotal = talentFee + commAmount + asfAmount;
                      const hasRate = rate > 0;

                      return (
                        <tr key={deliverable.id} className={!hasRate ? 'opacity-50' : ''}>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                            {deliverable.name}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {hasRate ? formatCurrency(rate) : '-'}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-center">
                            <input
                              type="number"
                              min="0"
                              value={quantity || ''}
                              onChange={(e) => updateQuantity(rateCard.id, deliverable.id, parseInt(e.target.value) || 0)}
                              disabled={!hasRate}
                              className="w-16 px-2 py-1 text-center text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            {quantity > 0 ? formatCurrency(talentFee) : '-'}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {quantity > 0 ? formatCurrency(commAmount) : '-'}
                          </td>
                          {enableAsf && (
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                              {quantity > 0 ? formatCurrency(asfAmount) : '-'}
                            </td>
                          )}
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                            {quantity > 0 ? formatCurrency(subTotal) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Empty State */}
      {talentRateCards.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No talents added yet</h3>
          <p className="text-sm text-gray-500 mb-4">Select a talent above to add their rate card to this quote</p>
        </div>
      )}

      {/* Totals Section */}
      {talentRateCards.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="max-w-xs ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Talent Fees:</span>
              <span className="font-medium text-gray-900">{formatCurrency(talentFees)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Commission ({commissionRate}%):</span>
              <span className="font-medium text-gray-900">{formatCurrency(commissions)}</span>
            </div>
            {enableAsf && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ASF ({asfRate}%):</span>
                <span className="font-medium text-gray-900">{formatCurrency(asfTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
              <span className="text-gray-900">Total:</span>
              <span className="text-brand-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes & Terms */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Textarea
            label="Internal Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Optional notes for internal reference..."
          />
          <Textarea
            label="Terms & Conditions"
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            rows={4}
            helperText="These terms will appear on the quote PDF"
          />
        </div>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || talentRateCards.length === 0}>
          {isSubmitting ? 'Creating...' : 'Create Quote'}
        </Button>
      </div>
    </div>
  );
};

export default QuoteBuilder;
