import React, { useState, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { useTalentDeliverables, TalentDeliverable } from './hooks';
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

const CATEGORY_LABELS: Record<string, string> = {
  content: 'Content',
  paid_ad_rights: 'Paid Ad Rights',
  talent_boosting: 'Talent Boosting',
  ugc: 'UGC',
  exclusivity: 'Extra Exclusivity',
  agency_fee: 'Agency Service Fee',
};

const CATEGORY_ORDER = ['content', 'ugc', 'paid_ad_rights', 'talent_boosting', 'exclusivity'];

const RateCardView: React.FC<RateCardViewProps> = ({
  talentId,
  talentName,
  talentAvatar,
  onAddToQuote,
  onClear,
  onAddAnotherTalent,
  allDeliverables = [],
}) => {
  const { deliverables, groupedByCategory, loading } = useTalentDeliverables(talentId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Custom item state
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customDeliverableId, setCustomDeliverableId] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [customQty, setCustomQty] = useState(1);

  // Get selected main deliverable IDs (for showing add-ons)
  const selectedMainIds = useMemo(() => {
    return deliverables
      .filter(d => !d.is_addon && (quantities[d.id] || 0) > 0)
      .map(d => d.id);
  }, [deliverables, quantities]);

  // Calculate subtotal
  const subtotal = useMemo(() => {
    return deliverables.reduce((sum, d) => {
      const qty = quantities[d.id] || 0;
      return sum + (d.rate * qty);
    }, 0);
  }, [deliverables, quantities]);

  // Items with quantity > 0
  const selectedItems = useMemo(() => {
    return deliverables.filter(d => (quantities[d.id] || 0) > 0);
  }, [deliverables, quantities]);

  const handleQtyChange = (deliverableId: string, value: string) => {
    const qty = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [deliverableId]: qty >= 0 ? qty : 0
    }));
  };

  const handleAddToQuote = () => {
    const items: QuoteLineItem[] = selectedItems.map(d => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      talent_id: talentId,
      talent_name: talentName,
      deliverable_id: d.id,
      deliverable_name: d.name,
      deliverable_category: d.category,
      quantity: quantities[d.id],
      unit_price: d.rate,
    }));

    onAddToQuote(items);
    setQuantities({});
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

  if (deliverables.length === 0) {
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
              {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''} available
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
        {CATEGORY_ORDER.map(category => {
          const items = groupedByCategory[category];
          if (!items || items.length === 0) return null;

          // For add-on categories, only show if main content is selected
          const isAddonCategory = ['paid_ad_rights', 'talent_boosting', 'exclusivity'].includes(category);
          if (isAddonCategory && selectedMainIds.length === 0) return null;

          return (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[category] || category}
                {isAddonCategory && (
                  <span className="ml-2 font-normal text-gray-400 normal-case">
                    (for selected content)
                  </span>
                )}
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
