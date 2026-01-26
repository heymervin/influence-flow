import React, { useState } from 'react';
import { Check } from 'lucide-react';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { createContentWithAddons } from './hooks';

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'cross-platform', label: 'Cross-Platform' },
];

const CATEGORY_OPTIONS = [
  { value: 'content', label: 'Content' },
  { value: 'ugc', label: 'UGC' },
];

interface AddDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultCategory?: 'content' | 'ugc';
}

const AddDeliverableModal: React.FC<AddDeliverableModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultCategory = 'content',
}) => {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [category, setCategory] = useState<'content' | 'ugc'>(defaultCategory);
  const [createPaidAdRights, setCreatePaidAdRights] = useState(true);
  const [paidAdRightsMultiplier, setPaidAdRightsMultiplier] = useState(0.50);
  const [createTalentBoosting, setCreateTalentBoosting] = useState(true);
  const [talentBoostingMultiplier, setTalentBoostingMultiplier] = useState(0.30);
  const [createExclusivity, setCreateExclusivity] = useState(true);
  const [createUgc, setCreateUgc] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Please enter a deliverable name');
      return;
    }

    setCreating(true);

    try {
      await createContentWithAddons({
        name: name.trim(),
        platform,
        category,
        createPaidAdRights: category === 'content' ? createPaidAdRights : false,
        paidAdRightsMultiplier,
        createTalentBoosting: category === 'content' ? createTalentBoosting : false,
        talentBoostingMultiplier,
        createExclusivity: category === 'content' ? createExclusivity : false,
        createUgc: category === 'content' ? createUgc : false,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create deliverable');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setPlatform('instagram');
    setCategory(defaultCategory);
    setCreatePaidAdRights(true);
    setPaidAdRightsMultiplier(0.50);
    setCreateTalentBoosting(true);
    setTalentBoostingMultiplier(0.30);
    setCreateExclusivity(true);
    setCreateUgc(true);
    setError(null);
    onClose();
  };

  // Get short name for add-on preview
  const getShortName = (fullName: string) => {
    return fullName
      .replace(/^Instagram\s+/i, '')
      .replace(/^TikTok\s+/i, '')
      .replace(/^YouTube\s+/i, '')
      .replace(/^UGC\s*-?\s*/i, '') || fullName;
  };

  const shortName = getShortName(name);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Deliverable" size="md">
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Instagram Live"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              options={PLATFORM_OPTIONS}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <div className="flex gap-4">
                {CATEGORY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="category"
                      value={opt.value}
                      checked={category === opt.value}
                      onChange={(e) => setCategory(e.target.value as 'content' | 'ugc')}
                      className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {category === 'content' && (
          <>
            <hr className="border-gray-200" />

            {/* Auto-create matching add-ons */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Auto-create matching add-ons</h3>
              <div className="space-y-3">
                {/* Paid Ad Rights */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={createPaidAdRights}
                      onChange={(e) => setCreatePaidAdRights(e.target.checked)}
                      className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700">
                      Paid Ad Rights{name ? ` - ${shortName}` : ''}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={paidAdRightsMultiplier}
                      onChange={(e) => setPaidAdRightsMultiplier(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-brand-500"
                      disabled={!createPaidAdRights}
                    />
                    <span className="text-xs text-gray-500">({Math.round(paidAdRightsMultiplier * 100)}%)</span>
                  </div>
                </div>

                {/* Talent Boosting */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={createTalentBoosting}
                      onChange={(e) => setCreateTalentBoosting(e.target.checked)}
                      className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700">
                      Talent Boosting{name ? ` - ${shortName}` : ''}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={talentBoostingMultiplier}
                      onChange={(e) => setTalentBoostingMultiplier(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-brand-500"
                      disabled={!createTalentBoosting}
                    />
                    <span className="text-xs text-gray-500">({Math.round(talentBoostingMultiplier * 100)}%)</span>
                  </div>
                </div>

                {/* Exclusivity */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={createExclusivity}
                      onChange={(e) => setCreateExclusivity(e.target.checked)}
                      className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700">Link to Exclusivity</span>
                  </label>
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Also create UGC version */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={createUgc}
                  onChange={(e) => setCreateUgc(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Also create UGC version</span>
                  {name && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Will create: UGC - {shortName}
                    </p>
                  )}
                </div>
              </label>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={handleClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating} icon={Check}>
            {creating ? 'Creating...' : 'Create Deliverable'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddDeliverableModal;
