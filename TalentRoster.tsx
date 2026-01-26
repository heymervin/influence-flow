import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Instagram, ChevronRight, RefreshCw, Globe } from 'lucide-react';
import { useTalents, useAllTalentSocialAccounts, useCategories, useAllTalentCategories } from './hooks';
import TalentDetailModal from './TalentDetailModal';
import { Talent, supabase, SocialPlatform } from './supabaseClient';
import { scrapeInstagramStats, scrapeMultipleInstagramStats } from './apifyService';
import Badge from './Badge';
import Button from './Button';
import TalentForm from './TalentForm';
import { formatFollowerCount } from './utils';

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

const getPlatformIcon = (platform: SocialPlatform, className?: string) => {
  switch (platform) {
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

const getPlatformIconColor = (platform: SocialPlatform): string => {
  const colors: Record<SocialPlatform, string> = {
    instagram: 'text-pink-600',
    tiktok: 'text-gray-800',
    youtube: 'text-red-600',
    twitch: 'text-purple-600',
    linkedin: 'text-blue-600',
    twitter: 'text-sky-500',
    facebook: 'text-indigo-600',
  };
  return colors[platform] || 'text-gray-600';
};

const TalentRoster = () => {
  const { talents, loading, error, refetch } = useTalents();
  const { getAccountsForTalent } = useAllTalentSocialAccounts();
  const { activeCategories, getCategoryById } = useCategories();
  const { getCategoriesForTalent } = useAllTalentCategories();
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [talentToEdit, setTalentToEdit] = useState<Talent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Filter talents based on search and category
  const filteredTalents = talents.filter(talent => {
    // Search filter
    const matchesSearch = !searchQuery ||
      talent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getAccountsForTalent(talent.id).some(a => a.handle.toLowerCase().includes(searchQuery.toLowerCase()));

    // Category filter
    const talentCategoryIds = getCategoriesForTalent(talent.id);
    const matchesCategory = !categoryFilter || talentCategoryIds.includes(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    console.log('[TalentRoster] Component mounted');
    return () => console.log('[TalentRoster] Component unmounted');
  }, []);

  console.log('[TalentRoster] Render - loading:', loading, 'talents:', talents?.length, 'error:', error);

  const handleTalentClick = (talent: Talent) => {
    setSelectedTalent(talent);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTalent(null);
  };

  const handleEdit = (talent: Talent) => {
    setTalentToEdit(talent);
    setIsFormOpen(true);
    setIsModalOpen(false); // Close detail modal if open
  };

  const handleDelete = async (talent: Talent) => {
    if (!confirm(`Are you sure you want to delete ${talent.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('talents')
        .delete()
        .eq('id', talent.id);

      if (error) throw error;

      // Refresh the talent list
      await refetch();

      // Close modal if this talent was selected
      if (selectedTalent?.id === talent.id) {
        setIsModalOpen(false);
        setSelectedTalent(null);
      }
    } catch (error) {
      console.error('Error deleting talent:', error);
      alert('Failed to delete talent. Please try again.');
    }
  };

  const handleAddNew = () => {
    setTalentToEdit(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setTalentToEdit(null);
  };

  const handleFormSuccess = () => {
    refetch(); // Refresh talent list
  };

  const handleRefreshStats = async (talent: Talent) => {
    const talentAccounts = getAccountsForTalent(talent.id);
    const instagramAccount = talentAccounts.find(a => a.platform === 'instagram');

    if (!instagramAccount) {
      alert('No Instagram account found for this talent');
      return;
    }

    try {
      setRefreshError(null);
      const stats = await scrapeInstagramStats(instagramAccount.handle);

      // Update social account in database
      const { error: updateError } = await supabase
        .from('talent_social_accounts')
        .update({
          follower_count: stats.follower_count,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instagramAccount.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh the talent list
      await refetch();

      // Stats refreshed successfully
    } catch (error) {
      console.error('Error refreshing stats:', error);
      setRefreshError(error instanceof Error ? error.message : 'Failed to refresh stats');
      alert('Failed to refresh stats. Please try again.');
    }
  };

  const handleRefreshAll = async () => {
    // Get all Instagram accounts from the social accounts
    const allInstagramAccounts = talents
      .map(t => {
        const accounts = getAccountsForTalent(t.id);
        const igAccount = accounts.find(a => a.platform === 'instagram');
        return igAccount ? { talentId: t.id, account: igAccount } : null;
      })
      .filter(Boolean) as { talentId: string; account: { id: string; handle: string } }[];

    if (allInstagramAccounts.length === 0) {
      alert('No talents with Instagram accounts found');
      return;
    }

    if (!confirm(`Refresh stats for ${allInstagramAccounts.length} talents? This may take a few minutes.`)) {
      return;
    }

    setIsRefreshingAll(true);
    setRefreshError(null);

    try {
      const handles = allInstagramAccounts.map(item => item.account.handle);
      const statsMap = await scrapeMultipleInstagramStats(handles);

      // Update all social accounts in database
      const updates = allInstagramAccounts.map(item => {
        const stats = statsMap.get(item.account.handle);
        if (!stats) return null;

        return supabase
          .from('talent_social_accounts')
          .update({
            follower_count: stats.follower_count,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.account.id);
      }).filter(Boolean);

      await Promise.all(updates);

      // Refresh the talent list
      await refetch();

      alert(`Successfully refreshed stats for ${allInstagramAccounts.length} talents!`);
    } catch (error) {
      console.error('Error refreshing all stats:', error);
      setRefreshError(error instanceof Error ? error.message : 'Failed to refresh stats');
      alert('Failed to refresh stats for some talents. Please try again.');
    } finally {
      setIsRefreshingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talent Roster</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your influencers and content creators</p>
        </div>
        <div className="flex gap-2">
          <Button
            icon={RefreshCw}
            variant="secondary"
            onClick={handleRefreshAll}
            disabled={isRefreshingAll || talents.length === 0}
          >
            {isRefreshingAll ? 'Refreshing...' : 'Refresh All'}
          </Button>
          <Button icon={Plus} onClick={handleAddNew}>Add New Talent</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search talents by name or handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Categories</option>
            {activeCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <div className="hidden sm:block h-full w-px bg-gray-200 mx-2"></div>
          <select className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-500">
            <option>Sort by: Name</option>
            <option>Sort by: Followers</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          <p className="mt-4 text-gray-500">Loading talents...</p>
        </div>
      ) : filteredTalents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">
            {talents.length === 0 ? 'No talents in your roster yet.' : 'No talents match your search.'}
          </p>
          {talents.length === 0 && (
            <Button icon={Plus} onClick={handleAddNew}>Add Your First Talent</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTalents.map((talent) => {
            const talentCategoryIds = getCategoriesForTalent(talent.id);
            const talentCategories = talentCategoryIds
              .map(id => getCategoryById(id))
              .filter(Boolean);

            return (
              <div
                key={talent.id}
                onClick={() => handleTalentClick(talent)}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer"
              >
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={talent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(talent.name)}`}
                    alt={talent.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge variant={talent.status === 'active' ? 'success' : 'warning'} className="capitalize">{talent.status.replace('-', ' ')}</Badge>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <p className="text-white text-sm font-medium">View detailed analytics</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{talent.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {talentCategories.length > 0 ? (
                        talentCategories.slice(0, 3).map(cat => (
                          <span
                            key={cat!.id}
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-${cat!.color}-100 text-${cat!.color}-700`}
                          >
                            {cat!.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No categories</span>
                      )}
                      {talentCategories.length > 3 && (
                        <span className="text-xs text-gray-500">+{talentCategories.length - 3}</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 py-2 border-y border-gray-100 space-y-1">
                    <p className="text-xs text-gray-500 mb-1">Followers</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {getAccountsForTalent(talent.id).length > 0 ? (
                        getAccountsForTalent(talent.id).slice(0, 3).map((account) => (
                          <p key={account.id} className={`text-sm font-semibold text-gray-900 flex items-center ${getPlatformIconColor(account.platform)}`}>
                            {getPlatformIcon(account.platform, 'w-3 h-3 mr-1')}
                            {formatFollowerCount(account.follower_count)}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400">No accounts</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end items-center">
                    <span className="text-brand-600 font-medium text-sm flex items-center group-hover:translate-x-1 transition-transform">
                      View Profile <ChevronRight className="w-4 h-4 ml-1" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add New Placeholder Card */}
          <button
            onClick={handleAddNew}
            className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-brand-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Add New Talent</p>
            <p className="text-xs text-gray-500 mt-1">Or import from CSV</p>
          </button>
        </div>
      )}

      {/* Talent Detail Modal */}
      <TalentDetailModal
        talent={selectedTalent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefreshStats={handleRefreshStats}
      />

      {/* Talent Form Modal */}
      <TalentForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        talent={talentToEdit}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default TalentRoster;
