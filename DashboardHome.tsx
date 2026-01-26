import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useDashboardStats, useQuotes, useTalents, useRevenueStats, useAllTalentSocialAccounts } from './hooks';
import { formatFollowerCount } from './utils';
import Badge from './Badge';
import Button from './Button';

const DashboardHome = () => {
  const { stats, loading: statsLoading } = useDashboardStats();
  const { stats: revenueStats, loading: revenueLoading } = useRevenueStats();
  const { quotes, loading: quotesLoading } = useQuotes();
  const { talents, loading: talentsLoading } = useTalents();
  const { getAccountsForTalent, loading: socialLoading } = useAllTalentSocialAccounts();

  const recentQuotes = quotes.slice(0, 5);

  // Get total followers for a talent across all platforms
  const getTotalFollowers = (talentId: string) => {
    const accounts = getAccountsForTalent(talentId);
    return accounts.reduce((sum, acc) => sum + (acc.follower_count || 0), 0);
  };

  // Top talents by follower count
  const topTalents = talents
    .map(t => ({ ...t, totalFollowers: getTotalFollowers(t.id) }))
    .filter(t => t.totalFollowers > 0)
    .sort((a, b) => b.totalFollowers - a.totalFollowers)
    .slice(0, 4);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const monthlyChange = calculatePercentageChange(
    revenueStats.revenueThisMonth,
    revenueStats.revenueLastMonth
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 p-6 rounded-xl shadow-lg text-white">
          <p className="text-sm font-medium text-brand-100 mb-1">Total Revenue</p>
          <h3 className="text-3xl font-bold mb-2">
            {revenueLoading ? '...' : formatCurrency(revenueStats.totalRevenue)}
          </h3>
          <p className="text-xs text-brand-100">Commission earned all-time</p>
        </div>

        {/* Revenue This Month */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">This Month</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {revenueLoading ? '...' : formatCurrency(revenueStats.revenueThisMonth)}
          </h3>
          <div className="flex items-center text-xs">
            {monthlyChange >= 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                <span className="font-medium text-green-600">+{monthlyChange.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                <span className="font-medium text-red-600">{monthlyChange.toFixed(1)}%</span>
              </>
            )}
            <span className="text-gray-500 ml-1">vs last month</span>
          </div>
        </div>

        {/* Pending Pipeline */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Pending Pipeline</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {statsLoading ? '...' : formatCurrency(stats.pendingRevenue * 100)}
          </h3>
          <p className="text-xs text-gray-500">{statsLoading ? '...' : stats.activeQuotes} active quotes</p>
        </div>

        {/* Win Rate */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Win Rate</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {revenueLoading ? '...' : `${revenueStats.winRate.toFixed(1)}%`}
          </h3>
          <p className="text-xs text-gray-500">{stats.talentRosterCount} talents in roster</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Quotes</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          {quotesLoading ? (
            <div className="text-center py-8 text-gray-500">Loading quotes...</div>
          ) : recentQuotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No quotes yet. Create your first quote!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Quote #</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQuotes.map((quote) => (
                    <tr key={quote.id} className="border-b hover:bg-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-900">#{quote.quote_number || quote.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">{quote.client_name}</td>
                      <td className="px-4 py-3">{quote.campaign_name}</td>
                      <td className="px-4 py-3">${((quote.total_amount || 0) / 100).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant={quote.status === 'accepted' ? 'success' : quote.status === 'sent' ? 'warning' : 'neutral'}>
                          {quote.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{new Date(quote.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
          </div>
          {talentsLoading || socialLoading ? (
            <div className="text-center py-8 text-gray-500">Loading talents...</div>
          ) : topTalents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No talents yet. Add your first talent!</div>
          ) : (
            <div className="space-y-4">
              {topTalents.map((talent, i) => (
                <div key={talent.id} className="flex items-center space-x-3 pb-3 border-b last:border-0 last:pb-0">
                  <div className="relative">
                    <img
                      src={talent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(talent.name)}`}
                      alt={talent.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-brand-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border border-white">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{talent.name}</p>
                    <p className="text-xs text-gray-500 truncate">{talent.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatFollowerCount(talent.totalFollowers)}</p>
                    <p className="text-xs text-gray-500">Followers</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
