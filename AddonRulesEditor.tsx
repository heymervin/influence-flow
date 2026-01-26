import React, { useState } from 'react';
import { ArrowRight, AlertTriangle, Plus, Trash2, Save } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { useAddonRulesManagement, useDeliverablesByCategory, useMissingAddons, createMissingAddonsForContent, AddonRuleWithDeliverables } from './hooks';
import { Deliverable } from './supabaseClient';

interface AddonRulesEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const AddonRulesEditor: React.FC<AddonRulesEditorProps> = ({ isOpen, onClose, onRefresh }) => {
  const { rules, groupedByAddonCategory, loading, refetch, updateRule, deleteRule } = useAddonRulesManagement();
  const { grouped: deliverablesByCategory, deliverables, refetch: refetchDeliverables } = useDeliverablesByCategory();
  const { missing } = useMissingAddons(deliverables, rules);

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editMultiplier, setEditMultiplier] = useState<number>(0);
  const [creatingMissing, setCreatingMissing] = useState(false);
  const [defaultPaidAdRights, setDefaultPaidAdRights] = useState(0.50);
  const [defaultTalentBoosting, setDefaultTalentBoosting] = useState(0.30);

  const handleSaveRule = async (ruleId: string) => {
    try {
      await updateRule(ruleId, { multiplier: editMultiplier });
      setEditingRuleId(null);
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this add-on rule?')) return;
    try {
      await deleteRule(ruleId);
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleCreateMissingAddons = async () => {
    setCreatingMissing(true);
    try {
      for (const item of missing) {
        await createMissingAddonsForContent(
          item.deliverable,
          item.missingAddons,
          defaultPaidAdRights,
          defaultTalentBoosting
        );
      }
      await refetch();
      await refetchDeliverables();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error creating missing addons:', error);
    } finally {
      setCreatingMissing(false);
    }
  };

  const renderRuleSection = (title: string, categoryRules: AddonRuleWithDeliverables[], defaultMultiplier: number, setDefaultMultiplier: (v: number) => void) => {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Default:</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={defaultMultiplier}
              onChange={(e) => setDefaultMultiplier(parseFloat(e.target.value) || 0)}
              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-brand-500"
            />
            <span className="text-xs text-gray-500">({Math.round(defaultMultiplier * 100)}%)</span>
          </div>
        </div>

        {categoryRules.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-2">No rules configured</p>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <div className="col-span-4">Content</div>
              <div className="col-span-1 text-center"></div>
              <div className="col-span-4">Add-On</div>
              <div className="col-span-2">Multiplier</div>
              <div className="col-span-1"></div>
            </div>

            {/* Rules */}
            {categoryRules.map((rule) => (
              <div
                key={rule.id}
                className="grid grid-cols-12 gap-2 items-center px-3 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="col-span-4 text-sm text-gray-900 truncate">
                  {rule.base_deliverable?.name || 'Unknown'}
                </div>
                <div className="col-span-1 flex justify-center">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
                <div className="col-span-4 text-sm text-gray-700 truncate">
                  {rule.addon_deliverable?.name || 'Unknown'}
                </div>
                <div className="col-span-2">
                  {editingRuleId === rule.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={editMultiplier}
                        onChange={(e) => setEditMultiplier(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-brand-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRule(rule.id);
                          if (e.key === 'Escape') setEditingRuleId(null);
                        }}
                      />
                      <button
                        onClick={() => handleSaveRule(rule.id)}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingRuleId(rule.id);
                        setEditMultiplier(rule.multiplier || 0);
                      }}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:border-gray-300"
                    >
                      {rule.multiplier != null ? `${Math.round(rule.multiplier * 100)}%` : 'Flat'}
                    </button>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete rule"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add-on Rules" size="lg">
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          These rules define which add-ons apply to which content and their pricing multiplier (percentage of content rate).
        </p>

        {/* Missing Add-ons Warning */}
        {missing.length > 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {missing.length} content item{missing.length !== 1 ? 's' : ''} missing add-ons
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {missing.slice(0, 5).map(m => m.deliverable.name).join(', ')}
                {missing.length > 5 && ` and ${missing.length - 5} more...`}
              </p>
              <div className="mt-2">
                <ul className="text-xs text-amber-700 mb-2">
                  {missing.slice(0, 3).map(m => (
                    <li key={m.deliverable.id}>
                      - {m.deliverable.name}: missing {m.missingAddons.map(a => a === 'paid_ad_rights' ? 'Paid Ad Rights' : 'Talent Boosting').join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCreateMissingAddons}
              disabled={creatingMissing}
              icon={Plus}
            >
              {creatingMissing ? 'Creating...' : 'Create Missing'}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading rules...</p>
          </div>
        ) : (
          <>
            {/* Paid Ad Rights Section */}
            {renderRuleSection(
              'Paid Ad Rights',
              groupedByAddonCategory.paid_ad_rights || [],
              defaultPaidAdRights,
              setDefaultPaidAdRights
            )}

            <hr className="border-gray-200" />

            {/* Talent Boosting Section */}
            {renderRuleSection(
              'Talent Boosting',
              groupedByAddonCategory.talent_boosting || [],
              defaultTalentBoosting,
              setDefaultTalentBoosting
            )}

            <hr className="border-gray-200" />

            {/* Exclusivity Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Exclusivity</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  Extra Exclusivity (1 month) applies to <strong>ALL</strong> content types.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Pricing: Flat rate set per talent in Talent Roster.
                </p>
                {(groupedByAddonCategory.exclusivity || []).length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Linked to:</p>
                    <div className="flex flex-wrap gap-1">
                      {(groupedByAddonCategory.exclusivity || []).map((rule) => (
                        <span
                          key={rule.id}
                          className="px-2 py-0.5 text-xs bg-white border border-gray-200 rounded"
                        >
                          {rule.base_deliverable?.name || 'Unknown'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddonRulesEditor;
