import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Instagram, ChevronRight, RefreshCw } from 'lucide-react';
import { useTalents } from './hooks';
import TalentDetailModal from './TalentDetailModal';
import { Talent, supabase } from './supabaseClient';
import { scrapeInstagramStats, scrapeMultipleInstagramStats } from './apifyService';
import Badge from './Badge';
import Button from './Button';
import TalentForm from './TalentForm';

const TalentRoster = () => {
  const { talents, loading, error, refetch } = useTalents();
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [talentToEdit, setTalentToEdit] = useState<Talent | null>(null);

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
    if (!talent.instagram_handle) {
      alert('No Instagram handle found for this talent');
      return;
    }

    try {
      setRefreshError(null);
      const stats = await scrapeInstagramStats(talent.instagram_handle);

      // Update talent in database
      const { error: updateError } = await supabase
        .from('talents')
        .update({
          follower_count: stats.follower_count,
          followers: stats.followers,
          engagement_rate: stats.engagement_rate,
          last_stats_update: stats.last_stats_update,
        })
        .eq('id', talent.id);

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
    const talentsWithHandles = talents.filter(t => t.instagram_handle);

    if (talentsWithHandles.length === 0) {
      alert('No talents with Instagram handles found');
      return;
    }

    if (!confirm(`Refresh stats for ${talentsWithHandles.length} talents? This may take a few minutes.`)) {
      return;
    }

    setIsRefreshingAll(true);
    setRefreshError(null);

    try {
      const handles = talentsWithHandles.map(t => t.instagram_handle!);
      const statsMap = await scrapeMultipleInstagramStats(handles);

      // Update all talents in database
      const updates = talentsWithHandles.map(talent => {
        const stats = statsMap.get(talent.instagram_handle!);
        if (!stats) return null;

        return supabase
          .from('talents')
          .update({
            follower_count: stats.follower_count,
            followers: stats.followers,
            engagement_rate: stats.engagement_rate,
            last_stats_update: stats.last_stats_update,
          })
          .eq('id', talent.id);
      }).filter(Boolean);

      await Promise.all(updates);

      // Refresh the talent list
      await refetch();

      alert(`Successfully refreshed stats for ${talentsWithHandles.length} talents!`);
    } catch (error) {
      console.error('Error refreshing all stats:', error);
      setRefreshError(error instanceof Error ? error.message : 'Failed to refresh stats');
      alert('Failed to refresh stats for some talents. Please try again.');
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const handleAddToQuote = (talent: Talent) => {
    // TODO: Implement add to quote functionality
    console.log('Add to quote:', talent);
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
            placeholder="Search talents by name or category..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" icon={Filter} size="md" className="flex-1 sm:flex-none">Filters</Button>
          <div className="hidden sm:block h-full w-px bg-gray-200 mx-2"></div>
          <select className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-500">
            <option>Sort by: Name</option>
            <option>Sort by: Followers</option>
            <option>Sort by: Engagement</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          <p className="mt-4 text-gray-500">Loading talents...</p>
        </div>
      ) : talents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">No talents in your roster yet.</p>
          <Button icon={Plus} onClick={handleAddNew}>Add Your First Talent</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {talents.map((talent) => (
            <div
              key={talent.id}
              onClick={() => handleTalentClick(talent)}
              className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer"
            >
              <div className="relative h-56 bg-gray-100 overflow-hidden">
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
              <div className="p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{talent.name}</h3>
                  <p className="text-sm text-gray-500">{talent.category}</p>
                </div>

                <div className="mb-4 py-3 border-y border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Followers</p>
                    <p className="text-sm font-semibold text-gray-900 flex items-center">
                      <Instagram className="w-3 h-3 mr-1 text-pink-600" />
                      {talent.followers || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">
                    Post: <span className="text-gray-900 font-semibold">${talent.rate_post ? (talent.rate_post / 100).toFixed(0) : 'N/A'}</span>
                  </span>
                  <span className="text-brand-600 font-medium text-xs flex items-center group-hover:translate-x-1 transition-transform">
                    View Profile <ChevronRight className="w-3 h-3 ml-1" />
                  </span>
                </div>
              </div>
            </div>
          ))}

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
        onAddToQuote={handleAddToQuote}
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
