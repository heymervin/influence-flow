import React, { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { createPlatformWithDeliverables } from './hooks';

interface ContentTypeInput {
  id: string;
  name: string;
  enabled: boolean;
}

interface AddPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddPlatformModal: React.FC<AddPlatformModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [platformName, setPlatformName] = useState('');
  const [platformSlug, setPlatformSlug] = useState('');
  const [contentTypes, setContentTypes] = useState<ContentTypeInput[]>([
    { id: '1', name: '', enabled: true },
  ]);
  const [createUgc, setCreateUgc] = useState(true);
  const [createPaidAdRights, setCreatePaidAdRights] = useState(true);
  const [paidAdRightsMultiplier, setPaidAdRightsMultiplier] = useState(0.50);
  const [createTalentBoosting, setCreateTalentBoosting] = useState(true);
  const [talentBoostingMultiplier, setTalentBoostingMultiplier] = useState(0.30);
  const [createExclusivity, setCreateExclusivity] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlatformNameChange = (value: string) => {
    setPlatformName(value);
    setPlatformSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  };

  const addContentType = () => {
    setContentTypes([
      ...contentTypes,
      { id: Date.now().toString(), name: '', enabled: true },
    ]);
  };

  const removeContentType = (id: string) => {
    if (contentTypes.length > 1) {
      setContentTypes(contentTypes.filter(ct => ct.id !== id));
    }
  };

  const updateContentType = (id: string, name: string) => {
    setContentTypes(contentTypes.map(ct =>
      ct.id === id ? { ...ct, name } : ct
    ));
  };

  const toggleContentType = (id: string) => {
    setContentTypes(contentTypes.map(ct =>
      ct.id === id ? { ...ct, enabled: !ct.enabled } : ct
    ));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!platformName.trim()) {
      setError('Please enter a platform name');
      return;
    }
    if (!platformSlug.trim()) {
      setError('Please enter a platform slug');
      return;
    }

    const enabledContentTypes = contentTypes.filter(ct => ct.enabled && ct.name.trim());
    if (enabledContentTypes.length === 0) {
      setError('Please add at least one content type');
      return;
    }

    setCreating(true);

    try {
      await createPlatformWithDeliverables({
        platformName: platformName.trim(),
        platformSlug: platformSlug.trim(),
        contentTypes: enabledContentTypes.map(ct => ct.name.trim()),
        createUgc,
        createPaidAdRights,
        paidAdRightsMultiplier,
        createTalentBoosting,
        talentBoostingMultiplier,
        createExclusivity,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create platform');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setPlatformName('');
    setPlatformSlug('');
    setContentTypes([{ id: '1', name: '', enabled: true }]);
    setCreateUgc(true);
    setCreatePaidAdRights(true);
    setPaidAdRightsMultiplier(0.50);
    setCreateTalentBoosting(true);
    setTalentBoostingMultiplier(0.30);
    setCreateExclusivity(true);
    setError(null);
    onClose();
  };

  // Calculate summary
  const enabledContentTypes = contentTypes.filter(ct => ct.enabled && ct.name.trim());
  const contentCount = enabledContentTypes.length;
  const ugcCount = createUgc ? contentCount : 0;
  const paidAdRightsCount = createPaidAdRights ? contentCount + ugcCount : 0;
  const talentBoostingCount = createTalentBoosting ? contentCount + ugcCount : 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Platform" size="lg">
      <div className="space-y-6">
        {/* Platform Details */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Platform Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Platform Name"
              placeholder="e.g., X (Twitter)"
              value={platformName}
              onChange={(e) => handlePlatformNameChange(e.target.value)}
            />
            <Input
              label="Slug (ID)"
              placeholder="e.g., x"
              value={platformSlug}
              onChange={(e) => setPlatformSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              helperText="Lowercase, no spaces"
            />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Content Types */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Content Types</h3>
          <p className="text-xs text-gray-500 mb-3">
            Define the main content types for this platform (e.g., Post, Video, Story)
          </p>
          <div className="space-y-2">
            {contentTypes.map((ct, index) => (
              <div key={ct.id} className="flex items-center gap-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={ct.enabled}
                    onChange={() => toggleContentType(ct.id)}
                    className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                </label>
                <input
                  type="text"
                  placeholder={`e.g., ${platformName || 'Platform'} ${index === 0 ? 'Post' : index === 1 ? 'Video' : 'Story'}`}
                  value={ct.name}
                  onChange={(e) => updateContentType(ct.id, e.target.value)}
                  className={`flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                    !ct.enabled ? 'bg-gray-100 text-gray-400' : ''
                  }`}
                  disabled={!ct.enabled}
                />
                {contentTypes.length > 1 && (
                  <button
                    onClick={() => removeContentType(ct.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addContentType}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
            >
              <Plus className="w-4 h-4" />
              Add another content type
            </button>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* UGC Option */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={createUgc}
              onChange={(e) => setCreateUgc(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Auto-create UGC versions</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Will create: {enabledContentTypes.map(ct => `UGC - ${ct.name || 'Content'}`).join(', ') || 'UGC versions of content types'}
              </p>
            </div>
          </label>
        </div>

        {/* Add-ons */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Add-ons (auto-created for each content type)</h3>
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
                <span className="text-sm font-medium text-gray-900">Paid Ad Rights</span>
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
                <span className="text-xs text-gray-500">({Math.round(paidAdRightsMultiplier * 100)}% of content rate)</span>
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
                <span className="text-sm font-medium text-gray-900">Talent Boosting</span>
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
                <span className="text-xs text-gray-500">({Math.round(talentBoostingMultiplier * 100)}% of content rate)</span>
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
                <span className="text-sm font-medium text-gray-900">Exclusivity</span>
              </label>
              <span className="text-xs text-gray-500">Flat rate (set per talent)</span>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Summary */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Summary</h4>
          <p className="text-sm text-blue-800">This will create:</p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1">
            <li>- {contentCount} content deliverable{contentCount !== 1 ? 's' : ''} ({enabledContentTypes.map(ct => ct.name || 'Content').join(', ')})</li>
            {createUgc && <li>- {ugcCount} UGC deliverable{ugcCount !== 1 ? 's' : ''}</li>}
            {createPaidAdRights && <li>- {paidAdRightsCount} Paid Ad Rights add-on{paidAdRightsCount !== 1 ? 's' : ''} with rules</li>}
            {createTalentBoosting && <li>- {talentBoostingCount} Talent Boosting add-on{talentBoostingCount !== 1 ? 's' : ''} with rules</li>}
            {createExclusivity && <li>- {contentCount + ugcCount} Exclusivity rule{(contentCount + ugcCount) !== 1 ? 's' : ''}</li>}
          </ul>
        </div>

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
            {creating ? 'Creating...' : 'Create Platform'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddPlatformModal;
