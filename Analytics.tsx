import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Award, Calendar } from 'lucide-react';
import {
  useRevenueStats,
  useRevenueByTalent,
  useRevenueByClient,
  useRevenueOverTime,
  useQuotePipeline,
} from './hooks';
import Badge from './Badge';

const Analytics = () => {
  const { stats: revenueStats, loading: loadingRevenue } = useRevenueStats();
  const { revenueByTalent, loading: loadingTalents } = useRevenueByTalent();
  const { revenueByClient, loading: loadingClients } = useRevenueByClient();
  const { revenueData, loading: loadingOverTime } = useRevenueOverTime();
  const { pipeline, loading: loadingPipeline } = useQuotePipeline();

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const monthlyChange = calculatePercentageChange(
    revenueStats.revenueThisMonth,
    revenueStats.revenueLastMonth
  );

  const quarterlyChange = calculatePercentageChange(
    revenueStats.revenueThisQuarter,
    revenueStats.revenueLastQuarter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Track revenue, performance, and growth metrics</p>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Revenue</span>
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-brand-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loadingRevenue ? '...' : formatCurrency(revenueStats.totalRevenue)}
          </div>
          <p className="text-xs text-gray-500 mt-1">All-time earnings</p>
        </div>

        {/* Revenue This Month */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">This Month</span>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loadingRevenue ? '...' : formatCurrency(revenueStats.revenueThisMonth)}
          </div>
          <div className="flex items-center mt-1">
            {monthlyChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-xs font-medium ${monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(monthlyChange).toFixed(1)}% vs last month
            </span>
          </div>
        </div>

        {/* Average Deal Size */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Avg Deal Size</span>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loadingRevenue ? '...' : formatCurrency(revenueStats.avgDealSize)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Per closed deal</p>
        </div>

        {/* Win Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Win Rate</span>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {loadingRevenue ? '...' : `${revenueStats.winRate.toFixed(1)}%`}
          </div>
          <p className="text-xs text-gray-500 mt-1">Quotes accepted</p>
        </div>
      </div>

      {/* Revenue Over Time Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
        {loadingOverTime ? (
          <div className="text-center py-12 text-gray-500">Loading chart...</div>
        ) : revenueData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No revenue data yet</div>
        ) : (
          <div className="space-y-3">
            {revenueData.slice(-6).map((data) => {
              const maxRevenue = Math.max(...revenueData.map(d => d.revenue), 1);
              const widthPercent = (data.revenue / maxRevenue) * 100;
              const monthLabel = new Date(data.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

              return (
                <div key={data.month} className="flex items-center">
                  <div className="w-20 text-sm text-gray-600">{monthLabel}</div>
                  <div className="flex-1 relative">
                    <div
                      className="bg-brand-500 h-8 rounded-md transition-all hover:bg-brand-600"
                      style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    >
                      <div className="flex items-center justify-end h-full pr-3">
                        <span className="text-xs font-medium text-white">
                          {formatCurrency(data.revenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm text-gray-500">
                    {data.deals} {data.deals === 1 ? 'deal' : 'deals'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quote Pipeline Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Pipeline</h3>
        {loadingPipeline ? (
          <div className="text-center py-12 text-gray-500">Loading pipeline...</div>
        ) : (
          <div className="space-y-4">
            {/* Draft */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Badge variant="neutral">Draft</Badge>
                <span className="text-sm font-medium text-gray-900">{pipeline.draft.count} quotes</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(pipeline.draft.value)}</span>
            </div>

            {/* Sent */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Badge variant="default">Sent</Badge>
                <span className="text-sm font-medium text-gray-900">{pipeline.sent.count} quotes</span>
              </div>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(pipeline.sent.value)}</span>
            </div>

            {/* Accepted */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Badge variant="success">Accepted</Badge>
                <span className="text-sm font-medium text-gray-900">{pipeline.accepted.count} quotes</span>
              </div>
              <span className="text-lg font-bold text-green-700">{formatCurrency(pipeline.accepted.value)}</span>
            </div>

            {/* Rejected */}
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Badge variant="danger">Rejected</Badge>
                <span className="text-sm font-medium text-gray-900">{pipeline.rejected.count} quotes</span>
              </div>
              <span className="text-lg font-bold text-red-700">{formatCurrency(pipeline.rejected.value)}</span>
            </div>

            {/* Expired */}
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Badge variant="warning">Expired</Badge>
                <span className="text-sm font-medium text-gray-900">{pipeline.expired.count} quotes</span>
              </div>
              <span className="text-lg font-bold text-yellow-700">{formatCurrency(pipeline.expired.value)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout for Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Talent */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Talent</h3>
          {loadingTalents ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : revenueByTalent.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No deals recorded yet</div>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Talent</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Deals</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {revenueByTalent.slice(0, 10).map((talent) => (
                    <tr key={talent.talent_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{talent.talent_name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{talent.deal_count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-600">
                        {formatCurrency(talent.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Revenue by Client */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Client</h3>
          {loadingClients ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : revenueByClient.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No deals recorded yet</div>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Client</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Deals</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {revenueByClient.slice(0, 10).map((client) => (
                    <tr key={client.client_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{client.client_name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{client.deal_count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-600">
                        {formatCurrency(client.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pending Pipeline Card */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl p-6 shadow-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-brand-100 text-sm font-medium mb-1">Pending Pipeline Value</p>
            <p className="text-3xl font-bold">{formatCurrency(revenueStats.pendingPipeline)}</p>
            <p className="text-brand-100 text-sm mt-2">Quotes currently sent and awaiting response</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
