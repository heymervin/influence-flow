import React, { useState, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { useTalentDeliverables, TalentDeliverable } from './hooks';
import type { DeliverableCategory } from './supabaseClient';

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
}

const CATEGORY_LABELS: Record<string, string> = {
  content: 'Content',
  paid_ad_rights: 'Paid Ad Rights',
  talent_boosting: 'Talent Boosting',
  ugc: 'UGC',
  exclusivity: 'Extra Exclusivity',
  agency_fee: 'Agency Service Fee',
};

const CATEGORY_ORDER = ['content', 'ugc', 'paid_ad_rights', 'talent_boosting', 'exclusivity', 'agency_fee'];

const RateCardView: React.FC<RateCardViewProps> = ({
  talentId,
  talentName,
  talentAvatar,
  onAddToQuote,
  onClear,
}) => {
  const { deliverables, groupedByCategory, loading } = useTalentDeliverables(talentId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

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
        <p className="text-sm text-gray-400 mt-1">Add rates in the Talent Roster to enable quote building</p>
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
            <h3 className="font-semibold text-gray-900">{talentName}</h3>
            <p className="text-xs text-gray-500">
              {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''} available
              {selectedItems.length > 0 && ` | ${selectedItems.length} selected`}
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Rate Card */}
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        {CATEGORY_ORDER.map(category => {
          const items = groupedByCategory[category];
          if (!items || items.length === 0) return null;

          // For add-on categories, only show if there are main deliverables selected
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
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                {items.map((item: TalentDeliverable) => {
                  const qty = quantities[item.id] || 0;
                  const itemTotal = item.rate * qty;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                        qty > 0 ? 'bg-brand-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex-1 text-sm text-gray-700">{item.name}</span>
                      <span className="w-20 text-sm font-medium text-right text-gray-600">
                        {formatCurrency(item.rate)}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={qty || ''}
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        placeholder="0"
                        className={`w-16 px-2 py-1.5 text-sm text-center border rounded-lg transition-colors ${
                          qty > 0
                            ? 'border-brand-300 ring-1 ring-brand-200 bg-white'
                            : 'border-gray-300 bg-gray-50 focus:bg-white'
                        } focus:ring-2 focus:ring-brand-500 focus:border-brand-500`}
                      />
                      <span className="w-20 text-sm text-right">
                        {qty > 0 ? (
                          <span className="font-medium text-brand-600">{formatCurrency(itemTotal)}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-white px-4 py-3 border-t border-brand-200 flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-500">Subtotal:</span>
          <span className="ml-2 text-lg font-bold text-gray-900">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setQuantities({})}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleAddToQuote}
            disabled={selectedItems.length === 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedItems.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add {selectedItems.length > 0 ? `${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''}` : 'Items'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateCardView;
