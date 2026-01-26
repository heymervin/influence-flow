import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera, Trash2, Plus, Instagram, Globe } from 'lucide-react';
import { Talent, supabase, Platform } from './supabaseClient';
import { useAuth } from './AuthContext';
import { useTalentSocialAccounts, usePlatforms } from './hooks';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';

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

interface TalentFormProps {
  isOpen: boolean;
  onClose: () => void;
  talent?: Talent | null;
  onSuccess?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'Fashion', label: 'Fashion' },
  { value: 'Beauty', label: 'Beauty' },
  { value: 'Lifestyle', label: 'Lifestyle' },
  { value: 'Fitness', label: 'Fitness' },
  { value: 'Tech', label: 'Tech' },
  { value: 'Food', label: 'Food' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'inactive', label: 'Inactive' },
];

interface SocialAccountInput {
  id?: string;
  platform: string; // slug from platforms table
  handle: string;
  follower_count?: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

const TalentForm = ({ isOpen, onClose, talent, onSuccess }: TalentFormProps) => {
  const { user } = useAuth();
  const isEditMode = !!talent;
  const { accounts: existingSocialAccounts, refetch: refetchSocialAccounts } = useTalentSocialAccounts(talent?.id || null);
  const { activePlatforms, getPlatformBySlug } = usePlatforms();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    status: 'active' as 'active' | 'on-hold' | 'inactive',
    avatar_url: '',
    bio: '',
    notes: '',
  });

  // Social accounts state
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountInput[]>([]);
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [newPlatform, setNewPlatform] = useState<string>('instagram');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (talent) {
      setFormData({
        name: talent.name || '',
        category: talent.category || '',
        status: talent.status || 'active',
        avatar_url: talent.avatar_url || '',
        bio: talent.bio || '',
        notes: talent.notes || '',
      });
      setPreviewUrl(talent.avatar_url || null);
    } else {
      // Reset form for new talent
      setFormData({
        name: '',
        category: '',
        status: 'active',
        avatar_url: '',
        bio: '',
        notes: '',
      });
      setPreviewUrl(null);
      setSocialAccounts([]);
    }
    setErrors({});
    setSubmitError(null);
    setShowAddPlatform(false);
  }, [talent, isOpen]);

  // Load existing social accounts when editing
  useEffect(() => {
    if (existingSocialAccounts.length > 0) {
      setSocialAccounts(existingSocialAccounts.map(acc => ({
        id: acc.id,
        platform: acc.platform,
        handle: acc.handle,
        follower_count: acc.follower_count,
      })));
    }
  }, [existingSocialAccounts]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSubmitError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setSubmitError(null);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `talents/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update form data and preview
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      setPreviewUrl(publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setSubmitError(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, avatar_url: '' }));
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Social account handlers
  const handleAddPlatform = () => {
    // Find a platform that's not already added
    const usedPlatforms = socialAccounts.filter(a => !a.isDeleted).map(a => a.platform);
    const availablePlatformsList = activePlatforms.filter(
      p => !usedPlatforms.includes(p.slug)
    );

    if (availablePlatformsList.length === 0) {
      setSubmitError('All platforms have been added');
      return;
    }

    setNewPlatform(availablePlatformsList[0].slug);
    setShowAddPlatform(true);
  };

  const handleConfirmAddPlatform = () => {
    setSocialAccounts(prev => [...prev, {
      platform: newPlatform,
      handle: '',
      isNew: true,
    }]);
    setShowAddPlatform(false);
  };

  const handleSocialAccountChange = (index: number, field: 'handle' | 'follower_count', value: string | number) => {
    setSocialAccounts(prev => prev.map((acc, i) =>
      i === index ? { ...acc, [field]: value } : acc
    ));
  };

  const handleDeleteSocialAccount = (index: number) => {
    setSocialAccounts(prev => prev.map((acc, i) =>
      i === index ? { ...acc, isDeleted: true } : acc
    ));
  };

  const handleRestoreSocialAccount = (index: number) => {
    setSocialAccounts(prev => prev.map((acc, i) =>
      i === index ? { ...acc, isDeleted: false } : acc
    ));
  };

  const getAvailablePlatforms = () => {
    const usedPlatforms = socialAccounts.filter(a => !a.isDeleted).map(a => a.platform);
    return activePlatforms.filter(p => !usedPlatforms.includes(p.slug));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    // Validate social accounts
    const activeAccounts = socialAccounts.filter(a => !a.isDeleted);
    activeAccounts.forEach((acc, index) => {
      const platform = getPlatformBySlug(acc.platform);
      if (!acc.handle.trim()) {
        newErrors[`social_${index}`] = `${platform?.name || acc.platform} handle is required`;
      } else if (acc.handle.startsWith('@')) {
        newErrors[`social_${index}`] = 'Handle should not include @';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (!user) {
      setSubmitError('You must be logged in to perform this action');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const talentData = {
        user_id: user.id,
        name: formData.name.trim(),
        category: formData.category,
        status: formData.status,
        avatar_url: formData.avatar_url.trim() || null,
        bio: formData.bio.trim() || null,
        notes: formData.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let talentId: string;

      if (isEditMode && talent) {
        // Update existing talent
        const { error } = await supabase
          .from('talents')
          .update(talentData)
          .eq('id', talent.id);

        if (error) throw error;
        talentId = talent.id;
      } else {
        // Create new talent
        const { data, error } = await supabase
          .from('talents')
          .insert([talentData])
          .select()
          .single();

        if (error) throw error;
        talentId = data.id;
      }

      // Handle social accounts
      // Delete removed accounts
      const deletedAccounts = socialAccounts.filter(a => a.isDeleted && a.id);
      for (const acc of deletedAccounts) {
        await supabase
          .from('talent_social_accounts')
          .delete()
          .eq('id', acc.id);
      }

      // Update existing accounts
      const existingAccounts = socialAccounts.filter(a => !a.isDeleted && a.id);
      for (const acc of existingAccounts) {
        const platform = getPlatformBySlug(acc.platform);
        const handle = acc.handle.trim().replace('@', '');
        await supabase
          .from('talent_social_accounts')
          .update({
            handle,
            follower_count: acc.follower_count || null,
            profile_url: platform?.url_prefix ? `${platform.url_prefix}${handle}` : null,
            platform_id: platform?.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', acc.id);
      }

      // Insert new accounts
      const newAccounts = socialAccounts.filter(a => !a.isDeleted && a.isNew && a.handle.trim());
      if (newAccounts.length > 0) {
        const accountsToInsert = newAccounts.map(acc => {
          const platform = getPlatformBySlug(acc.platform);
          const handle = acc.handle.trim().replace('@', '');
          return {
            talent_id: talentId,
            platform: acc.platform,
            platform_id: platform?.id || null,
            handle,
            follower_count: acc.follower_count || null,
            profile_url: platform?.url_prefix ? `${platform.url_prefix}${handle}` : null,
          };
        });

        const { error: insertError } = await supabase
          .from('talent_social_accounts')
          .insert(accountsToInsert);

        if (insertError) throw insertError;
      }

      // Refresh social accounts
      await refetchSocialAccounts();

      // Success - call onSuccess callback and close modal
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving talent:', error);
      setSubmitError(error.message || 'Failed to save talent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditMode ? 'Edit Talent' : 'Add New Talent'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <Input
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
          placeholder="e.g. Sarah Johnson"
        />

        {/* Category and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            error={errors.category}
            options={CATEGORY_OPTIONS}
            placeholder="Select a category"
            required
          />
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={STATUS_OPTIONS}
            required
          />
        </div>

        {/* Social Accounts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Social Media Accounts
          </label>
          <div className="space-y-3">
            {socialAccounts.filter(acc => !acc.isDeleted).map((account, index) => {
              const platformConfig = getPlatformBySlug(account.platform);
              const originalIndex = socialAccounts.findIndex(a => a === account);
              return (
                <div key={`${account.platform}-${index}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-[100px]">
                    {getPlatformIcon(platformConfig?.icon_name, 'w-4 h-4')}
                    <span className="text-sm font-medium text-gray-700">{platformConfig?.name || account.platform}</span>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Handle (without @)"
                      value={account.handle}
                      onChange={(e) => handleSocialAccountChange(originalIndex, 'handle', e.target.value)}
                      className={`px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none ${
                        errors[`social_${index}`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="Followers (optional)"
                      value={account.follower_count || ''}
                      onChange={(e) => handleSocialAccountChange(originalIndex, 'follower_count', e.target.value ? parseInt(e.target.value) : 0)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSocialAccount(originalIndex)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove platform"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {/* Add Platform UI */}
            {showAddPlatform && (
              <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg border border-brand-200">
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                >
                  {getAvailablePlatforms().map(platform => (
                    <option key={platform.slug} value={platform.slug}>
                      {platform.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleConfirmAddPlatform}
                  className="px-3 py-1.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPlatform(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Add Platform Button */}
            {!showAddPlatform && getAvailablePlatforms().length > 0 && (
              <button
                type="button"
                onClick={handleAddPlatform}
                className="flex items-center gap-2 px-3 py-2 text-sm text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Social Platform
              </button>
            )}

            {errors.social_0 && (
              <p className="text-sm text-red-500">{errors.social_0}</p>
            )}
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo
          </label>
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-dashed border-gray-300">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  onError={() => setPreviewUrl(null)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                  isUploading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                }`}
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : previewUrl ? 'Change Photo' : 'Upload Photo'}
              </label>

              {previewUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              )}

              <p className="text-xs text-gray-500">
                JPG, PNG or GIF. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Bio */}
        <Textarea
          label="Bio"
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          rows={3}
          placeholder="Short bio or description..."
          helperText="Optional: Brief description of the talent"
        />

        {/* Notes */}
        <Textarea
          label="Internal Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Private notes about this talent..."
          helperText="Optional: Notes for internal use only"
        />

        {/* Error Message */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Talent' : 'Add Talent'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TalentForm;
