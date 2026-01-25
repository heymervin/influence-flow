import React, { useState, useEffect } from 'react';
import { Save, Building2, Mail, Phone, FileText, Package, Plus, Trash2, Edit2, X, Check, GripVertical } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase, Deliverable } from './supabaseClient';
import { useDeliverables } from './hooks';
import Input from './Input';
import Textarea from './Textarea';
import Button from './Button';
import Select from './Select';

interface CompanySettings {
  company_name: string;
  company_email: string;
  company_phone: string;
  quote_terms: string;
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

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'cross-platform', label: 'Cross-Platform' },
];

const Settings = () => {
  const { user } = useAuth();
  const { deliverables, refetch: refetchDeliverables } = useDeliverables();

  const [settings, setSettings] = useState<CompanySettings>({
    company_name: 'Influence Flow',
    company_email: 'contact@influenceflow.app',
    company_phone: '(555) 123-4567',
    quote_terms: DEFAULT_TERMS,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Deliverable management state
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [newDeliverableName, setNewDeliverableName] = useState('');
  const [newDeliverablePlatform, setNewDeliverablePlatform] = useState('instagram');
  const [addingDeliverable, setAddingDeliverable] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Try to load settings from user profile
      const { data, error } = await supabase
        .from('profiles')
        .select('company_name, company_email, company_phone, quote_terms')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          company_name: data.company_name || 'Influence Flow',
          company_email: data.company_email || 'contact@influenceflow.app',
          company_phone: data.company_phone || '(555) 123-4567',
          quote_terms: data.quote_terms || DEFAULT_TERMS,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          company_name: settings.company_name,
          company_email: settings.company_email,
          company_phone: settings.company_phone,
          quote_terms: settings.quote_terms,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CompanySettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetTerms = () => {
    if (confirm('Reset quote terms to default? This will overwrite your current terms.')) {
      setSettings((prev) => ({ ...prev, quote_terms: DEFAULT_TERMS }));
    }
  };

  // Deliverable management functions
  const handleAddDeliverable = async () => {
    const trimmedName = newDeliverableName.trim();
    if (!trimmedName) {
      setAddError('Please enter a name');
      return;
    }

    // Check for duplicates (case-insensitive)
    const isDuplicate = deliverables.some(
      (d) => d.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setAddError('A deliverable with this name already exists');
      return;
    }

    setAddingDeliverable(true);
    setAddError(null);

    try {
      // Get the highest display_order
      const maxOrder = deliverables.reduce((max, d) => Math.max(max, d.display_order), 0);

      const { error } = await supabase.from('deliverables').insert([
        {
          name: trimmedName,
          platform: newDeliverablePlatform,
          display_order: maxOrder + 1,
          is_active: true,
        },
      ]);

      if (error) throw error;

      setNewDeliverableName('');
      setNewDeliverablePlatform('instagram');
      setShowAddDeliverable(false);
      refetchDeliverables();
    } catch (error: any) {
      console.error('Error adding deliverable:', error);
      setAddError(error.message || 'Failed to add deliverable');
    } finally {
      setAddingDeliverable(false);
    }
  };

  const handleStartEdit = (deliverable: Deliverable) => {
    setEditingId(deliverable.id);
    setEditName(deliverable.name);
  };

  const handleSaveEdit = async (deliverableId: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;

    // Check for duplicates (excluding current item)
    const isDuplicate = deliverables.some(
      (d) => d.id !== deliverableId && d.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      alert('A deliverable with this name already exists');
      return;
    }

    try {
      const { error } = await supabase
        .from('deliverables')
        .update({ name: trimmedName, updated_at: new Date().toISOString() })
        .eq('id', deliverableId);

      if (error) throw error;

      setEditingId(null);
      refetchDeliverables();
    } catch (error) {
      console.error('Error updating deliverable:', error);
    }
  };

  const handleDeleteDeliverable = async (deliverableId: string) => {
    try {
      // Check if this deliverable has any rates attached
      const { count } = await supabase
        .from('talent_rates')
        .select('*', { count: 'exact', head: true })
        .eq('deliverable_id', deliverableId);

      if (count && count > 0) {
        if (!confirm(`This deliverable has ${count} talent rate(s) attached. Deleting it will remove those rates. Continue?`)) {
          setDeletingId(null);
          return;
        }
      }

      const { error } = await supabase
        .from('deliverables')
        .delete()
        .eq('id', deliverableId);

      if (error) throw error;

      setDeletingId(null);
      refetchDeliverables();
    } catch (error) {
      console.error('Error deleting deliverable:', error);
    }
  };

  // Group deliverables by platform for display
  const deliverablesByPlatform = deliverables.reduce((acc, d) => {
    if (!acc[d.platform]) acc[d.platform] = [];
    acc[d.platform].push(d);
    return acc;
  }, {} as Record<string, Deliverable[]>);

  const platformNames: Record<string, string> = {
    'instagram': 'Instagram',
    'tiktok': 'TikTok',
    'youtube': 'YouTube',
    'cross-platform': 'Cross-Platform',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          <p className="mt-4 text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your company information and deliverable types</p>
      </div>

      {/* Deliverables Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Deliverable Types</h2>
              <p className="text-sm text-gray-500">Content types that talents can provide</p>
            </div>
          </div>
          {!showAddDeliverable && (
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setShowAddDeliverable(true)}
            >
              Add New
            </Button>
          )}
        </div>

        {/* Add New Deliverable Form */}
        {showAddDeliverable && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Deliverable</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="e.g., Instagram Live"
                  value={newDeliverableName}
                  onChange={(e) => {
                    setNewDeliverableName(e.target.value);
                    setAddError(null);
                  }}
                  error={addError || undefined}
                />
              </div>
              <div className="w-full sm:w-40">
                <Select
                  value={newDeliverablePlatform}
                  onChange={(e) => setNewDeliverablePlatform(e.target.value)}
                  options={PLATFORM_OPTIONS}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  icon={Check}
                  onClick={handleAddDeliverable}
                  disabled={addingDeliverable}
                >
                  {addingDeliverable ? 'Adding...' : 'Add'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    setShowAddDeliverable(false);
                    setNewDeliverableName('');
                    setAddError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Deliverables List */}
        <div className="space-y-4">
          {Object.entries(deliverablesByPlatform).map(([platform, platformDeliverables]) => (
            <div key={platform}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {platformNames[platform] || platform}
              </h4>
              <div className="space-y-1">
                {platformDeliverables.map((deliverable) => (
                  <div
                    key={deliverable.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    {editingId === deliverable.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(deliverable.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(deliverable.id)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-gray-900">{deliverable.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(deliverable)}
                            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {deletingId === deliverable.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteDeliverable(deliverable.id)}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(deliverable.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {deliverables.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No deliverables configured yet.</p>
              <p className="text-sm">Add your first deliverable type above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Company Information Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
            <Building2 className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
            <p className="text-sm text-gray-500">This information appears on your quote PDFs</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Company Name"
            value={settings.company_name}
            onChange={(e) => handleChange('company_name', e.target.value)}
            placeholder="Influence Flow"
            helperText="Your company or agency name"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={settings.company_email}
              onChange={(e) => handleChange('company_email', e.target.value)}
              placeholder="contact@influenceflow.app"
              helperText="Contact email for quotes"
            />

            <Input
              label="Phone Number"
              type="tel"
              value={settings.company_phone}
              onChange={(e) => handleChange('company_phone', e.target.value)}
              placeholder="(555) 123-4567"
              helperText="Contact phone number"
            />
          </div>
        </div>
      </div>

      {/* Quote Terms Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Default Quote Terms</h2>
              <p className="text-sm text-gray-500">Terms and conditions that appear on all quotes</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleResetTerms}>
            Reset to Default
          </Button>
        </div>

        <Textarea
          value={settings.quote_terms}
          onChange={(e) => handleChange('quote_terms', e.target.value)}
          rows={12}
          helperText="These terms will appear at the bottom of every quote PDF"
        />
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`rounded-lg p-4 ${
            saveMessage.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {saveMessage.text}
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          icon={Save}
          onClick={handleSave}
          disabled={saving}
          className="min-w-[150px]"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Preview Section */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">PDF Preview</h3>
        <p className="text-xs text-gray-600 mb-4">Your quotes will display:</p>
        <div className="bg-white rounded-lg p-4 border border-gray-300">
          <div className="border-b-2 border-brand-600 pb-3 mb-3">
            <h4 className="text-xl font-bold text-brand-600">{settings.company_name}</h4>
            <p className="text-xs text-gray-600">Quote Proposal</p>
          </div>
          <div className="space-y-1 text-xs text-gray-700">
            <div className="flex items-center">
              <Mail className="w-3 h-3 mr-2 text-gray-400" />
              {settings.company_email}
            </div>
            <div className="flex items-center">
              <Phone className="w-3 h-3 mr-2 text-gray-400" />
              {settings.company_phone}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
