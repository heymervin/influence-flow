import React, { useState, useEffect } from 'react';
import { Save, Building2, Mail, Phone, FileText, Package, Plus, Trash2, Edit2, X, Check, Globe, Instagram } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase, Deliverable, Platform, Category } from './supabaseClient';
import { useDeliverables, usePlatforms, useCategories } from './hooks';
import { Tag } from 'lucide-react';
import Input from './Input';
import Textarea from './Textarea';
import Button from './Button';
import Select from './Select';

// Platform icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TwitchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
  </svg>
);

const getPlatformIcon = (iconName: string | undefined, className?: string) => {
  switch (iconName) {
    case 'instagram':
      return <Instagram className={className} />;
    case 'tiktok':
      return <TikTokIcon className={className} />;
    case 'youtube':
      return <YouTubeIcon className={className} />;
    case 'twitch':
      return <TwitchIcon className={className} />;
    default:
      return <Globe className={className} />;
  }
};

const COLOR_OPTIONS = [
  { value: 'pink', label: 'Pink' },
  { value: 'gray', label: 'Gray' },
  { value: 'red', label: 'Red' },
  { value: 'purple', label: 'Purple' },
  { value: 'blue', label: 'Blue' },
  { value: 'sky', label: 'Sky' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'green', label: 'Green' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'orange', label: 'Orange' },
];

const ICON_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'globe', label: 'Globe (Generic)' },
];

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
  const { profile } = useAuth();
  const { deliverables, refetch: refetchDeliverables } = useDeliverables();
  const { platforms, refetch: refetchPlatforms, createPlatform, updatePlatform, deletePlatform } = usePlatforms();
  const { categories, refetch: refetchCategories, createCategory, updateCategory, deleteCategory } = useCategories();

  const isAdmin = profile?.role === 'admin';

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

  // Platform management state
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [newPlatformData, setNewPlatformData] = useState({
    name: '',
    slug: '',
    icon_name: 'globe',
    color: 'gray',
    url_prefix: '',
  });
  const [addingPlatform, setAddingPlatform] = useState(false);
  const [platformAddError, setPlatformAddError] = useState<string | null>(null);
  const [editingPlatformId, setEditingPlatformId] = useState<string | null>(null);
  const [editPlatformData, setEditPlatformData] = useState<Partial<Platform>>({});
  const [deletingPlatformId, setDeletingPlatformId] = useState<string | null>(null);

  // Category management state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    slug: '',
    color: 'gray',
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryAddError, setCategoryAddError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryData, setEditCategoryData] = useState<Partial<Category>>({});
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

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

  // Platform management functions
  const handleAddPlatform = async () => {
    const trimmedName = newPlatformData.name.trim();
    const trimmedSlug = newPlatformData.slug.trim().toLowerCase().replace(/\s+/g, '-');

    if (!trimmedName) {
      setPlatformAddError('Please enter a platform name');
      return;
    }
    if (!trimmedSlug) {
      setPlatformAddError('Please enter a slug');
      return;
    }

    // Check for duplicates
    const isDuplicate = platforms.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase() || p.slug === trimmedSlug
    );
    if (isDuplicate) {
      setPlatformAddError('A platform with this name or slug already exists');
      return;
    }

    setAddingPlatform(true);
    setPlatformAddError(null);

    try {
      const maxOrder = platforms.reduce((max, p) => Math.max(max, p.display_order), 0);

      await createPlatform({
        name: trimmedName,
        slug: trimmedSlug,
        icon_name: newPlatformData.icon_name,
        color: newPlatformData.color,
        url_prefix: newPlatformData.url_prefix.trim() || undefined,
        is_active: true,
        display_order: maxOrder + 1,
      });

      setNewPlatformData({
        name: '',
        slug: '',
        icon_name: 'globe',
        color: 'gray',
        url_prefix: '',
      });
      setShowAddPlatform(false);
    } catch (error: any) {
      console.error('Error adding platform:', error);
      setPlatformAddError(error.message || 'Failed to add platform');
    } finally {
      setAddingPlatform(false);
    }
  };

  const handleStartEditPlatform = (platform: Platform) => {
    setEditingPlatformId(platform.id);
    setEditPlatformData({
      name: platform.name,
      slug: platform.slug,
      icon_name: platform.icon_name,
      color: platform.color,
      url_prefix: platform.url_prefix,
      is_active: platform.is_active,
    });
  };

  const handleSavePlatformEdit = async (platformId: string) => {
    if (!editPlatformData.name?.trim()) return;

    try {
      await updatePlatform(platformId, {
        name: editPlatformData.name.trim(),
        icon_name: editPlatformData.icon_name,
        color: editPlatformData.color,
        url_prefix: editPlatformData.url_prefix?.trim(),
        is_active: editPlatformData.is_active,
      });
      setEditingPlatformId(null);
    } catch (error) {
      console.error('Error updating platform:', error);
    }
  };

  const handleDeletePlatform = async (platformId: string) => {
    try {
      // Check if this platform has any social accounts attached
      const { count } = await supabase
        .from('talent_social_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('platform_id', platformId);

      if (count && count > 0) {
        if (!confirm(`This platform has ${count} talent account(s) attached. Deleting it will remove the platform reference from those accounts. Continue?`)) {
          setDeletingPlatformId(null);
          return;
        }
      }

      await deletePlatform(platformId);
      setDeletingPlatformId(null);
    } catch (error) {
      console.error('Error deleting platform:', error);
    }
  };

  const handleTogglePlatformActive = async (platform: Platform) => {
    try {
      await updatePlatform(platform.id, { is_active: !platform.is_active });
    } catch (error) {
      console.error('Error toggling platform:', error);
    }
  };

  // Category management functions
  const handleAddCategory = async () => {
    const trimmedName = newCategoryData.name.trim();
    const trimmedSlug = newCategoryData.slug.trim().toLowerCase().replace(/\s+/g, '-');

    if (!trimmedName) {
      setCategoryAddError('Please enter a category name');
      return;
    }
    if (!trimmedSlug) {
      setCategoryAddError('Please enter a slug');
      return;
    }

    // Check for duplicates
    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase() || c.slug === trimmedSlug
    );
    if (isDuplicate) {
      setCategoryAddError('A category with this name or slug already exists');
      return;
    }

    setAddingCategory(true);
    setCategoryAddError(null);

    try {
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.display_order), 0);

      await createCategory({
        name: trimmedName,
        slug: trimmedSlug,
        color: newCategoryData.color,
        is_active: true,
        display_order: maxOrder + 1,
      });

      setNewCategoryData({
        name: '',
        slug: '',
        color: 'gray',
      });
      setShowAddCategory(false);
    } catch (error: any) {
      console.error('Error adding category:', error);
      setCategoryAddError(error.message || 'Failed to add category');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleStartEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditCategoryData({
      name: category.name,
      slug: category.slug,
      color: category.color,
      is_active: category.is_active,
    });
  };

  const handleSaveCategoryEdit = async (categoryId: string) => {
    if (!editCategoryData.name?.trim()) return;

    try {
      await updateCategory(categoryId, {
        name: editCategoryData.name.trim(),
        color: editCategoryData.color,
        is_active: editCategoryData.is_active,
      });
      setEditingCategoryId(null);
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // Check if this category has any talents attached
      const { count } = await supabase
        .from('talent_categories')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (count && count > 0) {
        if (!confirm(`This category has ${count} talent(s) attached. Deleting it will remove the category from those talents. Continue?`)) {
          setDeletingCategoryId(null);
          return;
        }
      }

      await deleteCategory(categoryId);
      setDeletingCategoryId(null);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleToggleCategoryActive = async (category: Category) => {
    try {
      await updateCategory(category.id, { is_active: !category.is_active });
    } catch (error) {
      console.error('Error toggling category:', error);
    }
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
                        <div className="flex items-center gap-1">
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

      {/* Social Platforms Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Social Platforms</h2>
              <p className="text-sm text-gray-500">Manage available social media platforms for talents</p>
            </div>
          </div>
          {!showAddPlatform && isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setShowAddPlatform(true)}
            >
              Add Platform
            </Button>
          )}
        </div>

        {!isAdmin && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">Only administrators can modify platforms.</p>
          </div>
        )}

        {/* Add New Platform Form */}
        {showAddPlatform && isAdmin && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Platform</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Input
                label="Platform Name"
                placeholder="e.g., Threads"
                value={newPlatformData.name}
                onChange={(e) => {
                  setNewPlatformData(prev => ({
                    ...prev,
                    name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                  }));
                  setPlatformAddError(null);
                }}
              />
              <Input
                label="Slug (ID)"
                placeholder="e.g., threads"
                value={newPlatformData.slug}
                onChange={(e) => {
                  setNewPlatformData(prev => ({ ...prev, slug: e.target.value }));
                  setPlatformAddError(null);
                }}
                helperText="Lowercase, no spaces"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <Select
                label="Icon"
                value={newPlatformData.icon_name}
                onChange={(e) => setNewPlatformData(prev => ({ ...prev, icon_name: e.target.value }))}
                options={ICON_OPTIONS}
              />
              <Select
                label="Color"
                value={newPlatformData.color}
                onChange={(e) => setNewPlatformData(prev => ({ ...prev, color: e.target.value }))}
                options={COLOR_OPTIONS}
              />
              <Input
                label="URL Prefix"
                placeholder="https://threads.net/@"
                value={newPlatformData.url_prefix}
                onChange={(e) => setNewPlatformData(prev => ({ ...prev, url_prefix: e.target.value }))}
              />
            </div>
            {platformAddError && (
              <p className="text-sm text-red-600 mb-3">{platformAddError}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                icon={Check}
                onClick={handleAddPlatform}
                disabled={addingPlatform}
              >
                {addingPlatform ? 'Adding...' : 'Add Platform'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={X}
                onClick={() => {
                  setShowAddPlatform(false);
                  setNewPlatformData({
                    name: '',
                    slug: '',
                    icon_name: 'globe',
                    color: 'gray',
                    url_prefix: '',
                  });
                  setPlatformAddError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Platforms List */}
        <div className="space-y-2">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                platform.is_active ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-100 opacity-60'
              }`}
            >
              {editingPlatformId === platform.id && isAdmin ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 mr-2">
                  <input
                    type="text"
                    value={editPlatformData.name || ''}
                    onChange={(e) => setEditPlatformData(prev => ({ ...prev, name: e.target.value }))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="Name"
                  />
                  <select
                    value={editPlatformData.icon_name || 'globe'}
                    onChange={(e) => setEditPlatformData(prev => ({ ...prev, icon_name: e.target.value }))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    value={editPlatformData.color || 'gray'}
                    onChange={(e) => setEditPlatformData(prev => ({ ...prev, color: e.target.value }))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    {COLOR_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editPlatformData.url_prefix || ''}
                    onChange={(e) => setEditPlatformData(prev => ({ ...prev, url_prefix: e.target.value }))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="URL Prefix"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${platform.color}-100`}>
                    {getPlatformIcon(platform.icon_name, `w-4 h-4 text-${platform.color}-600`)}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({platform.slug})</span>
                    {!platform.is_active && (
                      <span className="text-xs text-orange-600 ml-2">(Disabled)</span>
                    )}
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="flex items-center gap-1">
                  {editingPlatformId === platform.id ? (
                    <>
                      <button
                        onClick={() => handleSavePlatformEdit(platform.id)}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingPlatformId(null)}
                        className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleTogglePlatformActive(platform)}
                        className={`px-2 py-1 text-xs rounded ${
                          platform.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {platform.is_active ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => handleStartEditPlatform(platform)}
                        className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {deletingPlatformId === platform.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeletePlatform(platform.id)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingPlatformId(null)}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingPlatformId(platform.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {platforms.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No platforms configured yet.</p>
              <p className="text-sm">Add your first platform above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Talent Categories Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Talent Categories</h2>
              <p className="text-sm text-gray-500">Manage categories for organizing talents</p>
            </div>
          </div>
          {!showAddCategory && isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setShowAddCategory(true)}
            >
              Add Category
            </Button>
          )}
        </div>

        {!isAdmin && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">Only administrators can modify categories.</p>
          </div>
        )}

        {/* Add New Category Form */}
        {showAddCategory && isAdmin && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Category</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <Input
                label="Category Name"
                placeholder="e.g., Automotive"
                value={newCategoryData.name}
                onChange={(e) => {
                  setNewCategoryData(prev => ({
                    ...prev,
                    name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                  }));
                  setCategoryAddError(null);
                }}
              />
              <Input
                label="Slug (ID)"
                placeholder="e.g., automotive"
                value={newCategoryData.slug}
                onChange={(e) => {
                  setNewCategoryData(prev => ({ ...prev, slug: e.target.value }));
                  setCategoryAddError(null);
                }}
                helperText="Lowercase, no spaces"
              />
              <Select
                label="Color"
                value={newCategoryData.color}
                onChange={(e) => setNewCategoryData(prev => ({ ...prev, color: e.target.value }))}
                options={COLOR_OPTIONS}
              />
            </div>
            {categoryAddError && (
              <p className="text-sm text-red-600 mb-3">{categoryAddError}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                icon={Check}
                onClick={handleAddCategory}
                disabled={addingCategory}
              >
                {addingCategory ? 'Adding...' : 'Add Category'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={X}
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryData({
                    name: '',
                    slug: '',
                    color: 'gray',
                  });
                  setCategoryAddError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Categories List */}
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                category.is_active ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-100 opacity-60'
              }`}
            >
              {editingCategoryId === category.id && isAdmin ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 mr-2">
                  <input
                    type="text"
                    value={editCategoryData.name || ''}
                    onChange={(e) => setEditCategoryData(prev => ({ ...prev, name: e.target.value }))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="Name"
                  />
                  <select
                    value={editCategoryData.color || 'gray'}
                    onChange={(e) => setEditCategoryData(prev => ({ ...prev, color: e.target.value }))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    {COLOR_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${category.color}-100`}>
                    <Tag className={`w-4 h-4 text-${category.color}-600`} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({category.slug})</span>
                    {!category.is_active && (
                      <span className="text-xs text-orange-600 ml-2">(Disabled)</span>
                    )}
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="flex items-center gap-1">
                  {editingCategoryId === category.id ? (
                    <>
                      <button
                        onClick={() => handleSaveCategoryEdit(category.id)}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCategoryId(null)}
                        className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleCategoryActive(category)}
                        className={`px-2 py-1 text-xs rounded ${
                          category.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => handleStartEditCategory(category)}
                        className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {deletingCategoryId === category.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingCategoryId(null)}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingCategoryId(category.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No categories configured yet.</p>
              <p className="text-sm">Add your first category above.</p>
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
