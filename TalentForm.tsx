import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera, Trash2 } from 'lucide-react';
import { Talent, supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';

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

const TalentForm = ({ isOpen, onClose, talent, onSuccess }: TalentFormProps) => {
  const { user } = useAuth();
  const isEditMode = !!talent;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    instagram_handle: '',
    tiktok_handle: '',
    category: '',
    status: 'active' as 'active' | 'on-hold' | 'inactive',
    avatar_url: '',
    bio: '',
    notes: '',
  });

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
        instagram_handle: talent.instagram_handle || '',
        tiktok_handle: talent.tiktok_handle || '',
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
        instagram_handle: '',
        tiktok_handle: '',
        category: '',
        status: 'active',
        avatar_url: '',
        bio: '',
        notes: '',
      });
      setPreviewUrl(null);
    }
    setErrors({});
    setSubmitError(null);
  }, [talent, isOpen]);

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

    if (!formData.instagram_handle.trim()) {
      newErrors.instagram_handle = 'Instagram handle is required';
    } else if (formData.instagram_handle.startsWith('@')) {
      newErrors.instagram_handle = 'Instagram handle should not include @';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

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
        instagram_handle: formData.instagram_handle.trim().replace('@', ''),
        tiktok_handle: formData.tiktok_handle.trim().replace('@', '') || null,
        category: formData.category,
        status: formData.status,
        avatar_url: formData.avatar_url.trim() || null,
        bio: formData.bio.trim() || null,
        notes: formData.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (isEditMode && talent) {
        // Update existing talent
        const { error } = await supabase
          .from('talents')
          .update(talentData)
          .eq('id', talent.id);

        if (error) throw error;
      } else {
        // Create new talent
        const { error } = await supabase
          .from('talents')
          .insert([talentData]);

        if (error) throw error;
      }

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

        {/* Social Handles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Instagram Handle"
            name="instagram_handle"
            value={formData.instagram_handle}
            onChange={handleChange}
            error={errors.instagram_handle}
            required
            placeholder="e.g. sarahjohnson (without @)"
            helperText="Don't include the @ symbol"
          />
          <Input
            label="TikTok Handle"
            name="tiktok_handle"
            value={formData.tiktok_handle}
            onChange={handleChange}
            placeholder="e.g. sarahjohnson (without @)"
            helperText="Optional - Don't include the @ symbol"
          />
        </div>

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
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Talent' : 'Add Talent'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TalentForm;
