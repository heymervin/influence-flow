import React, { useState, useEffect } from 'react';
import { Instagram, DollarSign, Calendar, Edit2, RefreshCw, Plus, Trash2, Award, User, Save } from 'lucide-react';
import Modal from './Modal';
import { Talent, Deliverable, supabase } from './supabaseClient';
import { useDeliverables } from './hooks';
import Button from './Button';

interface TalentDetailModalProps {
  talent: Talent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (talent: Talent) => void;
  onDelete?: (talent: Talent) => void;
  onRefreshStats?: (talent: Talent) => void;
  onAddToQuote?: (talent: Talent) => void;
}

type TabType = 'profile' | 'rates';

const TalentDetailModal: React.FC<TalentDetailModalProps> = ({
  talent,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onRefreshStats,
  onAddToQuote,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    dealCount: 0,
    avgDealSize: 0,
    lastDealDate: null as string | null,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Rates state
  const { deliverables } = useDeliverables();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loadingRates, setLoadingRates] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [ratesChanged, setRatesChanged] = useState(false);

  // Fetch revenue stats when modal opens
  useEffect(() => {
    if (talent && isOpen) {
      fetchRevenueStats();
      fetchRates();
      setActiveTab('profile');
      setRatesChanged(false);
    }
  }, [talent, isOpen]);

  const fetchRevenueStats = async () => {
    if (!talent) return;

    setLoadingStats(true);
    try {
      const { data: deals } = await supabase
        .from('deals')
        .select('commission_amount, deal_date')
        .eq('talent_id', talent.id);

      const totalRevenue = deals?.reduce((sum, d) => sum + (d.commission_amount || 0), 0) || 0;
      const dealCount = deals?.length || 0;
      const avgDealSize = dealCount > 0 ? totalRevenue / dealCount : 0;
      const lastDealDate = deals && deals.length > 0
        ? deals.reduce((latest, d) => d.deal_date > latest ? d.deal_date : latest, deals[0].deal_date)
        : null;

      setRevenueStats({
        totalRevenue,
        dealCount,
        avgDealSize,
        lastDealDate,
      });
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRates = async () => {
    if (!talent) return;

    setLoadingRates(true);
    try {
      const { data, error } = await supabase
        .from('talent_rates')
        .select('deliverable_id, base_rate')
        .eq('talent_id', talent.id);

      if (error) throw error;

      const ratesMap: Record<string, number> = {};
      data?.forEach((r) => {
        ratesMap[r.deliverable_id] = r.base_rate;
      });
      setRates(ratesMap);
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleRateChange = (deliverableId: string, value: string) => {
    const cents = Math.round(parseFloat(value || '0') * 100);
    setRates((prev) => ({ ...prev, [deliverableId]: cents }));
    setRatesChanged(true);
  };

  const saveRates = async () => {
    if (!talent) return;

    setSavingRates(true);
    try {
      // Upsert all rates
      const upsertData = Object.entries(rates)
        .filter(([_, rate]) => rate > 0)
        .map(([deliverableId, baseRate]) => ({
          talent_id: talent.id,
          deliverable_id: deliverableId,
          base_rate: baseRate,
        }));

      // Delete rates that are now 0 or empty
      const deleteIds = Object.entries(rates)
        .filter(([_, rate]) => rate === 0 || !rate)
        .map(([deliverableId]) => deliverableId);

      if (deleteIds.length > 0) {
        await supabase
          .from('talent_rates')
          .delete()
          .eq('talent_id', talent.id)
          .in('deliverable_id', deleteIds);
      }

      if (upsertData.length > 0) {
        const { error } = await supabase
          .from('talent_rates')
          .upsert(upsertData, { onConflict: 'talent_id,deliverable_id' });

        if (error) throw error;
      }

      setRatesChanged(false);
    } catch (error) {
      console.error('Error saving rates:', error);
    } finally {
      setSavingRates(false);
    }
  };

  if (!talent) return null;

  // Format currency from cents to dollars
  const formatCurrency = (cents: number | undefined | null) => {
    if (!cents) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Convert cents to dollars for input
  const centsToDisplay = (cents: number | undefined) => {
    if (!cents) return '';
    return (cents / 100).toString();
  };

  // Calculate days since last update
  const getDaysSinceUpdate = (lastUpdate: string | undefined | null) => {
    if (!lastUpdate) return null;
    const updateDate = new Date(lastUpdate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updateDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Status badge colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const handleRefreshStats = async () => {
    if (!onRefreshStats) return;
    setIsRefreshing(true);
    try {
      await onRefreshStats(talent);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(talent);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const daysSinceUpdate = getDaysSinceUpdate(talent.last_stats_update);

  // Group deliverables by platform
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col gap-6">
        {/* Header Section with Profile Photo */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Profile Photo */}
          <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600 flex-shrink-0 shadow-lg">
            {talent.avatar_url ? (
              <img
                src={talent.avatar_url}
                alt={talent.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                {talent.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Name, Category, Status */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{talent.name}</h3>
                <p className="text-gray-600 mb-2">{talent.category}</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(talent.status)}`}>
                  {talent.status}
                </span>
              </div>
            </div>

            {/* Social Handles */}
            <div className="flex flex-wrap gap-3 mt-3">
              {talent.instagram_handle && (
                <a
                  href={`https://instagram.com/${talent.instagram_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  {talent.instagram_handle}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-4 h-4 inline mr-1.5" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('rates')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'rates'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <DollarSign className="w-4 h-4 inline mr-1.5" />
              Rates
              {ratesChanged && <span className="ml-1 w-2 h-2 bg-orange-500 rounded-full inline-block" />}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <>
            {/* Stats Grid */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                <Instagram className="w-4 h-4" />
                Followers
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {talent.followers || 'N/A'}
              </div>
            </div>

            {/* Revenue Stats */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Revenue Performance
              </h4>
              {loadingStats ? (
                <div className="text-center py-4 text-gray-500">Loading stats...</div>
              ) : revenueStats.dealCount === 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  No deals recorded yet
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-brand-50 rounded-lg p-3">
                    <div className="text-xs text-brand-600 mb-1">Total Revenue</div>
                    <div className="text-lg font-bold text-brand-900">
                      {formatCurrency(revenueStats.totalRevenue)}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-600 mb-1">Deals Closed</div>
                    <div className="text-lg font-bold text-green-900">
                      {revenueStats.dealCount}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-purple-600 mb-1">Avg Deal Size</div>
                    <div className="text-lg font-bold text-purple-900">
                      {formatCurrency(revenueStats.avgDealSize)}
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="text-xs text-yellow-600 mb-1">Last Deal</div>
                    <div className="text-sm font-semibold text-yellow-900">
                      {revenueStats.lastDealDate
                        ? new Date(revenueStats.lastDealDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bio/Notes */}
            {(talent.bio || talent.notes) && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Bio & Notes</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {talent.bio && (
                    <p className="text-gray-700 mb-3">{talent.bio}</p>
                  )}
                  {talent.notes && (
                    <p className="text-gray-600 text-sm italic">{talent.notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Last Stats Update */}
            {daysSinceUpdate && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                Last stats update: {daysSinceUpdate}
              </div>
            )}
          </>
        )}

        {activeTab === 'rates' && (
          <div className="space-y-4">
            {loadingRates ? (
              <div className="text-center py-8 text-gray-500">Loading rates...</div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Set rates for each deliverable type. Enter the amount in dollars.
                </p>

                {Object.entries(deliverablesByPlatform).map(([platform, platformDeliverables]) => (
                  <div key={platform} className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-700">
                        {platformNames[platform] || platform}
                      </h5>
                    </div>
                    <div className="p-4 space-y-3">
                      {platformDeliverables.map((deliverable) => (
                        <div key={deliverable.id} className="flex items-center justify-between gap-4">
                          <label className="text-sm text-gray-700 flex-1">
                            {deliverable.name}
                          </label>
                          <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={centsToDisplay(rates[deliverable.id])}
                              onChange={(e) => handleRateChange(deliverable.id, e.target.value)}
                              placeholder="0"
                              className="w-full pl-7 pr-3 py-2 text-right text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {ratesChanged && (
                  <div className="flex justify-end pt-2">
                    <Button
                      icon={Save}
                      onClick={saveRates}
                      disabled={savingRates}
                    >
                      {savingRates ? 'Saving...' : 'Save Rates'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
          {onEdit && (
            <button
              onClick={() => {
                onEdit(talent);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
            >
              <Edit2 className="w-4 h-4" />
              Edit Talent
            </button>
          )}

          {onRefreshStats && (
            <button
              onClick={handleRefreshStats}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Stats'}
            </button>
          )}

          {onAddToQuote && (
            <button
              onClick={() => {
                onAddToQuote(talent);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add to Quote
            </button>
          )}

          {onDelete && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}

          {showDeleteConfirm && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-600">Are you sure?</span>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TalentDetailModal;
