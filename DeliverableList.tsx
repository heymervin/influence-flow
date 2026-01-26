import React, { useState } from 'react';
import { Edit2, Trash2, MoreVertical, Check, X, Instagram, Globe } from 'lucide-react';
import { supabase, Deliverable } from './supabaseClient';

// Platform icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const getPlatformIcon = (platform: string, className?: string) => {
  switch (platform?.toLowerCase()) {
    case 'instagram':
      return <Instagram className={className} />;
    case 'tiktok':
      return <TikTokIcon className={className} />;
    case 'youtube':
      return <YouTubeIcon className={className} />;
    default:
      return <Globe className={className} />;
  }
};

const getPlatformDisplayName = (platform: string): string => {
  switch (platform?.toLowerCase()) {
    case 'instagram':
      return 'Instagram';
    case 'tiktok':
      return 'TikTok';
    case 'youtube':
      return 'YouTube';
    case 'cross-platform':
      return 'Cross-Platform';
    case 'all':
      return 'All Platforms';
    default:
      return platform?.charAt(0).toUpperCase() + platform?.slice(1) || 'Unknown';
  }
};

interface DeliverableListProps {
  deliverables: Deliverable[];
  category: string;
  onRefresh: () => void;
}

const DeliverableList: React.FC<DeliverableListProps> = ({ deliverables, category, onRefresh }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleStartEdit = (deliverable: Deliverable) => {
    setEditingId(deliverable.id);
    setEditName(deliverable.name);
    setMenuOpenId(null);
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
      onRefresh();
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

      // Also delete any addon rules
      await supabase
        .from('deliverable_addon_rules')
        .delete()
        .or(`base_deliverable_id.eq.${deliverableId},addon_deliverable_id.eq.${deliverableId}`);

      const { error } = await supabase
        .from('deliverables')
        .delete()
        .eq('id', deliverableId);

      if (error) throw error;

      setDeletingId(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting deliverable:', error);
    }
  };

  const handleToggleActive = async (deliverable: Deliverable) => {
    try {
      const { error } = await supabase
        .from('deliverables')
        .update({ is_active: !deliverable.is_active, updated_at: new Date().toISOString() })
        .eq('id', deliverable.id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error toggling deliverable:', error);
    }
  };

  if (deliverables.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No {category} deliverables configured.</p>
        <p className="text-sm mt-1">Add your first {category} deliverable using the button above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
        <div className="col-span-5">Name</div>
        <div className="col-span-3">Platform</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* List Items */}
      {deliverables.map((deliverable) => (
        <div
          key={deliverable.id}
          className={`grid grid-cols-12 gap-4 items-center px-3 py-3 rounded-lg transition-colors ${
            deliverable.is_active ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-100 opacity-60'
          }`}
        >
          {/* Name */}
          <div className="col-span-5">
            {editingId === deliverable.id ? (
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{deliverable.name}</span>
                {deliverable.is_addon && (
                  <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                    Add-on
                  </span>
                )}
                {deliverable.default_multiplier && (
                  <span className="text-xs text-gray-500">
                    ({Math.round(deliverable.default_multiplier * 100)}%)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Platform */}
          <div className="col-span-3">
            <div className="flex items-center gap-2">
              {getPlatformIcon(deliverable.platform, 'w-4 h-4 text-gray-500')}
              <span className="text-sm text-gray-600">
                {getPlatformDisplayName(deliverable.platform)}
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="col-span-2">
            <button
              onClick={() => handleToggleActive(deliverable)}
              className={`px-2 py-1 text-xs rounded ${
                deliverable.is_active
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {deliverable.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>

          {/* Actions */}
          <div className="col-span-2 flex items-center justify-end gap-1">
            {editingId !== deliverable.id && (
              <>
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
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DeliverableList;
