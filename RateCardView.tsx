import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useTalentDeliverables, TalentDeliverable, useDeliverables } from './hooks';
import { supabase } from './supabaseClient';
import type { Deliverable } from './supabaseClient';
import Button from './Button';

interface QuoteLineItem {
  id: string;
  talent_id: string;
  talent_name: string;
  deliverable_id: string;
  deliverable_name: string;
  deliverable_category: string;
  quantity: number;
  unit_price: number;
}

interface RateCardViewProps {
  talentId: string;
  talentName: string;
  talentAvatar?: string;
  onAddToQuote: (items: QuoteLineItem[]) => void;
  onClear: () => void;
  onAddAnotherTalent?: () => void;
  allDeliverables?: Deliverable[];
}

interface AddonRule {
  addon_deliverable_id: string;
  base_deliverable_id: string;
  multiplier: number | null;
  addon_name: string;
  addon_category: string;
}

interface CalculatedAddon {
  id: string;
  name: string;
  category: string;
  rate: number;
  baseDeliverableId: string;
  baseDeliverableName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  content: 'Content',
  paid_ad_rights: 'Paid Ad Rights',
  talent_boosting: 'Talent Boosting',
  ugc: 'UGC',
  exclusivity: 'Extra Exclusivity',
  agency_fee: 'Agency Service Fee',
};

// Only show content and UGC as main categories - add-ons are calculated
const CATEGORY_ORDER = ['content', 'ugc'];

const RateCardView: React.FC<RateCardViewProps> = ({
  talentId,
  talentName,
  talentAvatar,
  onAddToQuote,
  onClear,
  onAddAnotherTalent,
  allDeliverables: passedDeliverables,
}) => {
  const { deliverables: talentDeliverables, groupedByCategory, loading } = useTalentDeliverables(talentId);
  const { deliverables: fetchedDeliverables } = useDeliverables();
  const allDeliverables = passedDeliverables || fetchedDeliverables;

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [addonRules, setAddonRules] = useState<AddonRule[]>([]);

  // Custom item state
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customDeliverableId, setCustomDeliverableId] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [customQty, setCustomQty] = useState(1);

  // Fetch addon rules
  useEffect(() => {
    const fetchAddonRules = async () => {
      const { data, error } = await supabase
        .from('deliverable_addon_rules')
        .select(`
          addon_deliverable_id,
          base_deliverable_id,
          multiplier,
          addon:deliverables!addon_deliverable_id (
            name,
            category
          )
        `)
        .eq('is_active', true);

      if (!error && data) {
        const formatted: AddonRule[] = data.map((rule: any) => ({
          addon_deliverable_id: rule.addon_deliverable_id,
          base_deliverable_id: rule.base_deliverable_id,
          multiplier: rule.multiplier,
          addon_name: rule.addon?.name || '',
          addon_category: rule.addon?.category || '',
        }));
        setAddonRules(formatted);
      }
    };

    fetchAddonRules();
  }, []);

  // Get selected content items (qty > 0) - only main content, not add-ons
  const selectedContentItems = useMemo(() => {
    return talentDeliverables
      .filter(d => !d.is_addon && (d.category === 'content' || d.category === 'ugc') && (quantities[d.id] || 0) > 0)
      .map(d => ({
        ...d,
        quantity: quantities[d.id],
      }));
  }, [talentDeliverables, quantities]);

  // Calculate add-ons based on selected content
  const calculatedAddons = useMemo((): CalculatedAddon[] => {
    if (selectedContentItems.length === 0) return [];

    const addons: CalculatedAddon[] = [];

    selectedContentItems.forEach(content => {
      // Find addon rules for this content deliverable
      const rulesForContent = addonRules.filter(r => r.base_deliverable_id === content.id);

      rulesForContent.forEach(rule => {
        if (rule.multiplier !== null && rule.multiplier > 0) {
          const calculatedRate = Math.round(content.rate * rule.multiplier);
          addons.push({
            id: `${rule.addon_deliverable_id}-${content.id}`,
            name: rule.addon_name,
            category: rule.addon_category,
            rate: calculatedRate,
            baseDeliverableId: content.id,
            baseDeliverableName: content.name,
          });
        }
      });
    });

    return addons;
  }, [selectedContentItems, addonRules]);

  // Group add-ons by category
  const groupedAddons = useMemo(() => {
    return calculatedAddons.reduce((acc, addon) => {
      if (!acc[addon.category]) acc[addon.category] = [];
      acc[addon.category].push(addon);
      return acc;
    }, {} as Record<string, CalculatedAddon[]>);
  }, [calculatedAddons]);

  // Calculate subtotal
  const subtotal = useMemo(() => {
    // Content items
    let total = talentDeliverables
      .filter(d => d.category === 'content' || d.category === 'ugc')
      .reduce((sum, d) => {
        const qty = quantities[d.id] || 0;
        return sum + (d.rate * qty);
      }, 0);

    // Add-on items
    calculatedAddons.forEach(addon => {
      const qty = addonQuantities[addon.id] || 0;
      total += addon.rate * qty;
    });

    return total;
  }, [talentDeliverables, quantities, calculatedAddons, addonQuantities]);

  // All selected items (content + addons)
  const selectedItems = useMemo(() => {
    const items: Array<{
      deliverableId: string;
      name: string;
      category: string;
      rate: number;
      quantity: number;
      isAddon: boolean;
    }> = [];

    // Content items (only content and ugc categories)
    talentDeliverables
      .filter(d => d.category === 'content' || d.category === 'ugc')
      .forEach(d => {
        const qty = quantities[d.id] || 0;
        if (qty > 0) {
          items.push({
            deliverableId: d.id,
            name: d.name,
            category: d.category,
            rate: d.rate,
            quantity: qty,
            isAddon: false,
          });
        }
      });

    // Add-on items
    calculatedAddons.forEach(addon => {
      const qty = addonQuantities[addon.id] || 0;
      if (qty > 0) {
        items.push({
          deliverableId: addon.id,
          name: addon.name,
          category: addon.category,
          rate: addon.rate,
          quantity: qty,
          isAddon: true,
        });
      }
    });

    return items;
  }, [talentDeliverables, quantities, calculatedAddons, addonQuantities]);

  const handleQtyChange = (deliverableId: string, value: string) => {
    const qty = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [deliverableId]: qty >= 0 ? qty : 0
    }));
  };

  const handleAddonQtyChange = (addonId: string, value: string) => {
    const qty = parseInt(value) || 0;
    setAddonQuantities(prev => ({
      ...prev,
      [addonId]: qty >= 0 ? qty : 0
    }));
  };

  const handleAddToQuote = () => {
    const items: QuoteLineItem[] = selectedItems.map(item => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      talent_id: talentId,
      talent_name: talentName,
      deliverable_id: item.deliverableId,
      deliverable_name: item.name,
      deliverable_category: item.category,
      quantity: item.quantity,
      unit_price: item.rate,
    }));

    onAddToQuote(items);
    setQuantities({});
    setAddonQuantities({});
  };

  const handleAddAnotherTalent = () => {
    // Add current items first if any
    if (selectedItems.length > 0) {
      handleAddToQuote();
    }
    // Clear form and go back to talent selection
    if (onAddAnotherTalent) {
      onAddAnotherTalent();
    } else {
      onClear();
    }
  };

  const handleAddCustomItem = () => {
    if (!customDeliverableId || !customRate || customQty < 1) return;

    const deliverable = allDeliverables.find(d => d.id === customDeliverableId);
    if (!deliverable) return;

    const item: QuoteLineItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      talent_id: talentId,
      talent_name: talentName,
      deliverable_id: customDeliverableId,
      deliverable_name: deliverable.name,
      deliverable_category: deliverable.category || 'content',
      quantity: customQty,
      unit_price: Math.round(parseFloat(customRate) * 100),
    };

    onAddToQuote([item]);
    setCustomDeliverableId('');
    setCustomRate('');
    setCustomQty(1);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="border-2 border-brand-200 rounded-xl p-8 bg-brand-50/30 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto" />
        <p className="text-sm text-gray-500 mt-2">Loading rate card...</p>
      </div>
    );
  }

  // Filter to only show content and ugc deliverables
  const mainDeliverables = talentDeliverables.filter(d => d.category === 'content' || d.category === 'ugc');

  if (mainDeliverables.length === 0) {
    return (
      <div className="border-2 border-gray-200 rounded-xl p-8 bg-gray-50 text-center">
        <p className="text-gray-500">No rates set for this talent</p>
        <p className="text-sm text-gray-400 mt-1">Add rates in the Talent Roster first</p>
        <button
          onClick={onClear}
          className="mt-4 text-sm text-brand-600 hover:text-brand-700"
        >
          Select a different talent
        </button>
      </div>
    );
  }

  return (
    <div className="border-2 border-brand-200 rounded-xl bg-brand-50/30 overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-brand-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={talentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(talentName)}`}
            alt={talentName}
            className="w-10 h-10 rounded-full object-cover object-top"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{talentName}'s Rate Card</h3>
            <p className="text-xs text-gray-500">
              {mainDeliverables.length} deliverable{mainDeliverables.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          title="Clear"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Rate Card Content */}
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        {/* Main Content Categories */}
        {CATEGORY_ORDER.map(category => {
          const items = groupedByCategory[category];
          if (!items || items.length === 0) return null;

          return (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[category] || category}
              </h4>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
                  <div className="col-span-5">Deliverable</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-100">
                  {items.map((item: TalentDeliverable) => {
                    const qty = quantities[item.id] || 0;
                    const itemTotal = item.rate * qty;

                    return (
                      <div
                        key={item.id}
                        className={`grid grid-cols-12 gap-2 px-3 py-2 items-center transition-colors ${
                          qty > 0 ? 'bg-brand-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="col-span-5 text-sm text-gray-700">{item.name}</div>
                        <div className="col-span-2 text-sm font-medium text-gray-600 text-right">
                          {formatCurrency(item.rate)}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={qty || ''}
                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                            placeholder="0"
                            className={`w-14 px-2 py-1 text-sm text-center border rounded-lg transition-colors ${
                              qty > 0
                                ? 'border-brand-300 ring-1 ring-brand-200 bg-white'
                                : 'border-gray-300 bg-gray-50 focus:bg-white'
                            } focus:ring-2 focus:ring-brand-500 focus:border-brand-500`}
                          />
                        </div>
                        <div className="col-span-3 text-sm text-right">
                          {qty > 0 ? (
                            <span className="font-semibold text-brand-600">{formatCurrency(itemTotal)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Calculated Add-ons (only show when content is selected) */}
        {(Object.entries(groupedAddons) as [string, CalculatedAddon[]][]).map(([category, addons]) => {
          if (addons.length === 0) return null;

          // Get the content items these add-ons are for
          const forContentNames = [...new Set(addons.map((a: CalculatedAddon) => a.baseDeliverableName))];

          return (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[category] || category}
                <span className="ml-2 font-normal text-gray-400 normal-case">
                  (for {forContentNames.join(', ')})
                </span>
              </h4>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
                  <div className="col-span-5">Deliverable</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-100">
                  {addons.map((addon: CalculatedAddon) => {
                    const qty = addonQuantities[addon.id] || 0;
                    const itemTotal = addon.rate * qty;

                    return (
                      <div
                        key={addon.id}
                        className={`grid grid-cols-12 gap-2 px-3 py-2 items-center transition-colors ${
                          qty > 0 ? 'bg-brand-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="col-span-5 text-sm text-gray-700">{addon.name}</div>
                        <div className="col-span-2 text-sm font-medium text-gray-600 text-right">
                          {formatCurrency(addon.rate)}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={qty || ''}
                            onChange={(e) => handleAddonQtyChange(addon.id, e.target.value)}
                            placeholder="0"
                            className={`w-14 px-2 py-1 text-sm text-center border rounded-lg transition-colors ${
                              qty > 0
                                ? 'border-brand-300 ring-1 ring-brand-200 bg-white'
                                : 'border-gray-300 bg-gray-50 focus:bg-white'
                            } focus:ring-2 focus:ring-brand-500 focus:border-brand-500`}
                          />
                        </div>
                        <div className="col-span-3 text-sm text-right">
                          {qty > 0 ? (
                            <span className="font-semibold text-brand-600">{formatCurrency(itemTotal)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Custom Item Section */}
        {allDeliverables.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowCustomItem(!showCustomItem)}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Custom Item (optional)
            </button>

            {showCustomItem && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-3">
                  For items without rates or custom pricing
                </p>
                <div className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs text-gray-500 mb-1">Deliverable</label>
                    <select
                      value={customDeliverableId}
                      onChange={(e) => setCustomDeliverableId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select deliverable...</option>
                      {allDeliverables.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-gray-500 mb-1">Rate ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="w-16">
                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={customQty}
                      onChange={(e) => setCustomQty(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddCustomItem}
                    disabled={!customDeliverableId || !customRate}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white px-4 py-3 border-t border-brand-200">
        {/* Subtotal */}
        <div className="flex justify-end mb-3">
          <div className="text-right">
            <span className="text-sm text-gray-500">Talent Subtotal:</span>
            <span className="ml-2 text-lg font-bold text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            onClick={handleAddToQuote}
            disabled={selectedItems.length === 0}
          >
            Add to Quote
          </Button>
          <Button
            variant="secondary"
            onClick={handleAddAnotherTalent}
            icon={Plus}
          >
            Add Another Talent
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RateCardView;
