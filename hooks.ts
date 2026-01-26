import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import type { Talent, Quote, Deal, Client, Deliverable, TalentRate, TalentSocialAccount, SocialPlatform, Platform, Category, TalentCategory, DeliverableAddonRule, DeliverableCategory } from './supabaseClient';

export const useTalents = () => {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('[useTalents] Hook initialized, calling fetchTalents...');
    fetchTalents();
  }, []);

  const fetchTalents = async () => {
    try {
      console.log('[useTalents] fetchTalents started, setting loading to true');
      setLoading(true);

      console.log('[useTalents] Calling Supabase API...');
      const { data, error } = await supabase
        .from('talents')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('[useTalents] API response received');
      console.log('[useTalents] Data:', data);
      console.log('[useTalents] Error:', error);

      if (error) throw error;

      console.log(`[useTalents] Setting talents: ${data?.length || 0} records`);
      setTalents(data || []);
    } catch (err) {
      console.error('[useTalents] Error fetching talents:', err);
      setError(err as Error);
    } finally {
      console.log('[useTalents] fetchTalents complete, setting loading to false');
      setLoading(false);
    }
  };

  return { talents, loading, error, refetch: fetchTalents };
};

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  return { quotes, loading, error, refetch: fetchQuotes };
};

export const useDashboardStats = () => {
  const [stats, setStats] = useState({
    activeQuotes: 0,
    pendingRevenue: 0,
    talentRosterCount: 0,
    winRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch active quotes
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('status, total_amount')
        .in('status', ['draft', 'sent']);

      const activeQuotes = quotesData?.length || 0;
      const pendingRevenue = quotesData?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;

      // Fetch talent count
      const { count: talentCount } = await supabase
        .from('talents')
        .select('*', { count: 'exact', head: true });

      // Calculate win rate
      const { data: allQuotes } = await supabase
        .from('quotes')
        .select('status');

      const totalQuotes = allQuotes?.length || 0;
      const acceptedQuotes = allQuotes?.filter(q => q.status === 'accepted').length || 0;
      const winRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

      setStats({
        activeQuotes,
        pendingRevenue: pendingRevenue / 100, // Convert from cents to dollars
        talentRosterCount: talentCount || 0,
        winRate,
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
};

// Analytics Hooks for Business Intelligence

export const useRevenueStats = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    revenueThisQuarter: 0,
    revenueLastQuarter: 0,
    pendingPipeline: 0,
    avgDealSize: 0,
    winRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueStats();
  }, []);

  const fetchRevenueStats = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const thisQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const lastQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
      const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);

      // Total revenue from all deals
      const { data: allDeals } = await supabase
        .from('deals')
        .select('commission_amount');

      const totalRevenue = allDeals?.reduce((sum, d) => sum + (d.commission_amount || 0), 0) || 0;

      // Revenue this month
      const { data: thisMonthDeals } = await supabase
        .from('deals')
        .select('commission_amount')
        .gte('deal_date', thisMonthStart.toISOString());

      const revenueThisMonth = thisMonthDeals?.reduce((sum, d) => sum + (d.commission_amount || 0), 0) || 0;

      // Revenue last month
      const { data: lastMonthDeals } = await supabase
        .from('deals')
        .select('commission_amount')
        .gte('deal_date', lastMonthStart.toISOString())
        .lte('deal_date', lastMonthEnd.toISOString());

      const revenueLastMonth = lastMonthDeals?.reduce((sum, d) => sum + (d.commission_amount || 0), 0) || 0;

      // Revenue this quarter
      const { data: thisQuarterDeals } = await supabase
        .from('deals')
        .select('commission_amount')
        .gte('deal_date', thisQuarterStart.toISOString());

      const revenueThisQuarter = thisQuarterDeals?.reduce((sum, d) => sum + (d.commission_amount || 0), 0) || 0;

      // Revenue last quarter
      const { data: lastQuarterDeals } = await supabase
        .from('deals')
        .select('commission_amount')
        .gte('deal_date', lastQuarterStart.toISOString())
        .lte('deal_date', lastQuarterEnd.toISOString());

      const revenueLastQuarter = lastQuarterDeals?.reduce((sum, d) => sum + (d.commission_amount || 0), 0) || 0;

      // Pending pipeline (sent quotes)
      const { data: sentQuotes } = await supabase
        .from('quotes')
        .select('total_amount')
        .eq('status', 'sent');

      const pendingPipeline = sentQuotes?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;

      // Average deal size
      const avgDealSize = allDeals && allDeals.length > 0
        ? totalRevenue / allDeals.length
        : 0;

      // Win rate
      const { data: allQuotes } = await supabase
        .from('quotes')
        .select('status');

      const closedQuotes = allQuotes?.filter(q => q.status === 'accepted' || q.status === 'rejected').length || 0;
      const acceptedQuotes = allQuotes?.filter(q => q.status === 'accepted').length || 0;
      const winRate = closedQuotes > 0 ? (acceptedQuotes / closedQuotes) * 100 : 0;

      setStats({
        totalRevenue,
        revenueThisMonth,
        revenueLastMonth,
        revenueThisQuarter,
        revenueLastQuarter,
        pendingPipeline,
        avgDealSize,
        winRate,
      });
    } catch (err) {
      console.error('Error fetching revenue stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchRevenueStats };
};

export const useRevenueByTalent = () => {
  const [revenueByTalent, setRevenueByTalent] = useState<Array<{
    talent_id: string;
    talent_name: string;
    deal_count: number;
    total_revenue: number;
    avg_deal_size: number;
    last_deal_date: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueByTalent();
  }, []);

  const fetchRevenueByTalent = async () => {
    try {
      setLoading(true);

      const { data: deals } = await supabase
        .from('deals')
        .select('talent_id, commission_amount, deal_date, talents(name)')
        .not('talent_id', 'is', null);

      // Group by talent
      const talentMap = new Map<string, {
        talent_id: string;
        talent_name: string;
        deal_count: number;
        total_revenue: number;
        last_deal_date: string | null;
      }>();

      deals?.forEach((deal: any) => {
        const talentId = deal.talent_id;
        const talentName = deal.talents?.name || 'Unknown Talent';
        const revenue = deal.commission_amount || 0;

        if (!talentMap.has(talentId)) {
          talentMap.set(talentId, {
            talent_id: talentId,
            talent_name: talentName,
            deal_count: 0,
            total_revenue: 0,
            last_deal_date: null,
          });
        }

        const current = talentMap.get(talentId)!;
        current.deal_count += 1;
        current.total_revenue += revenue;

        if (!current.last_deal_date || deal.deal_date > current.last_deal_date) {
          current.last_deal_date = deal.deal_date;
        }
      });

      const result = Array.from(talentMap.values()).map(t => ({
        ...t,
        avg_deal_size: t.deal_count > 0 ? t.total_revenue / t.deal_count : 0,
      })).sort((a, b) => b.total_revenue - a.total_revenue);

      setRevenueByTalent(result);
    } catch (err) {
      console.error('Error fetching revenue by talent:', err);
    } finally {
      setLoading(false);
    }
  };

  return { revenueByTalent, loading, refetch: fetchRevenueByTalent };
};

export const useRevenueByClient = () => {
  const [revenueByClient, setRevenueByClient] = useState<Array<{
    client_id: string;
    client_name: string;
    deal_count: number;
    total_revenue: number;
    avg_deal_size: number;
    last_deal_date: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueByClient();
  }, []);

  const fetchRevenueByClient = async () => {
    try {
      setLoading(true);

      const { data: deals } = await supabase
        .from('deals')
        .select('client_id, commission_amount, deal_date, clients(name)')
        .not('client_id', 'is', null);

      // Group by client
      const clientMap = new Map<string, {
        client_id: string;
        client_name: string;
        deal_count: number;
        total_revenue: number;
        last_deal_date: string | null;
      }>();

      deals?.forEach((deal: any) => {
        const clientId = deal.client_id;
        const clientName = deal.clients?.name || 'Unknown Client';
        const revenue = deal.commission_amount || 0;

        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            client_id: clientId,
            client_name: clientName,
            deal_count: 0,
            total_revenue: 0,
            last_deal_date: null,
          });
        }

        const current = clientMap.get(clientId)!;
        current.deal_count += 1;
        current.total_revenue += revenue;

        if (!current.last_deal_date || deal.deal_date > current.last_deal_date) {
          current.last_deal_date = deal.deal_date;
        }
      });

      const result = Array.from(clientMap.values()).map(c => ({
        ...c,
        avg_deal_size: c.deal_count > 0 ? c.total_revenue / c.deal_count : 0,
      })).sort((a, b) => b.total_revenue - a.total_revenue);

      setRevenueByClient(result);
    } catch (err) {
      console.error('Error fetching revenue by client:', err);
    } finally {
      setLoading(false);
    }
  };

  return { revenueByClient, loading, refetch: fetchRevenueByClient };
};

export const useRevenueOverTime = () => {
  const [revenueData, setRevenueData] = useState<Array<{
    month: string;
    revenue: number;
    deals: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueOverTime();
  }, []);

  const fetchRevenueOverTime = async () => {
    try {
      setLoading(true);

      // Get last 12 months of deals
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const { data: deals } = await supabase
        .from('deals')
        .select('deal_date, commission_amount')
        .gte('deal_date', twelveMonthsAgo.toISOString())
        .order('deal_date', { ascending: true });

      // Group by month
      const monthMap = new Map<string, { revenue: number; deals: number }>();

      // Initialize last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(monthKey, { revenue: 0, deals: 0 });
      }

      // Aggregate deals by month
      deals?.forEach((deal) => {
        const date = new Date(deal.deal_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (monthMap.has(monthKey)) {
          const current = monthMap.get(monthKey)!;
          current.revenue += deal.commission_amount || 0;
          current.deals += 1;
        }
      });

      const result = Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        deals: data.deals,
      }));

      setRevenueData(result);
    } catch (err) {
      console.error('Error fetching revenue over time:', err);
    } finally {
      setLoading(false);
    }
  };

  return { revenueData, loading, refetch: fetchRevenueOverTime };
};

export const useQuotePipeline = () => {
  const [pipeline, setPipeline] = useState({
    draft: { count: 0, value: 0 },
    sent: { count: 0, value: 0 },
    accepted: { count: 0, value: 0 },
    rejected: { count: 0, value: 0 },
    expired: { count: 0, value: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      setLoading(true);

      const { data: quotes } = await supabase
        .from('quotes')
        .select('status, total_amount');

      const stats = {
        draft: { count: 0, value: 0 },
        sent: { count: 0, value: 0 },
        accepted: { count: 0, value: 0 },
        rejected: { count: 0, value: 0 },
        expired: { count: 0, value: 0 },
      };

      quotes?.forEach((quote) => {
        const status = quote.status as keyof typeof stats;
        if (stats[status]) {
          stats[status].count += 1;
          stats[status].value += quote.total_amount || 0;
        }
      });

      setPipeline(stats);
    } catch (err) {
      console.error('Error fetching quote pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  return { pipeline, loading, refetch: fetchPipeline };
};

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('[useClients] Hook initialized, calling fetchClients...');
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      console.log('[useClients] fetchClients started, setting loading to true');
      setLoading(true);

      console.log('[useClients] Calling Supabase API...');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      console.log('[useClients] API response received');
      console.log('[useClients] Data:', data);
      console.log('[useClients] Error:', error);
      console.log('[useClients] Data count:', data?.length || 0);

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('[useClients] Error fetching clients:', err);
    } finally {
      console.log('[useClients] fetchClients complete, setting loading to false');
      setLoading(false);
    }
  };

  return { clients, loading, error, refetch: fetchClients };
};

// Deliverables hook - fetch all available deliverable types
export const useDeliverables = () => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchDeliverables();
  }, []);

  const fetchDeliverables = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deliverables')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setDeliverables(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching deliverables:', err);
    } finally {
      setLoading(false);
    }
  };

  return { deliverables, loading, error, refetch: fetchDeliverables };
};

// Alias for backward compatibility
export const useServices = () => {
  const { deliverables, ...rest } = useDeliverables();
  return { services: deliverables, ...rest };
};

// Talent rates hook - fetch rates for a specific talent
export const useTalentRates = (talentId: string | null) => {
  const [rates, setRates] = useState<TalentRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (talentId) {
      fetchRates();
    } else {
      setRates([]);
    }
  }, [talentId]);

  const fetchRates = async () => {
    if (!talentId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('talent_rates')
        .select('*, deliverable:deliverables(*)')
        .eq('talent_id', talentId);

      if (error) throw error;
      setRates(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching talent rates:', err);
    } finally {
      setLoading(false);
    }
  };

  return { rates, loading, error, refetch: fetchRates };
};

// Fetch all talent rates with deliverables (for calculator)
export const useAllTalentRates = () => {
  const [ratesMap, setRatesMap] = useState<Map<string, Map<string, number>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchAllRates();
  }, []);

  const fetchAllRates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('talent_rates')
        .select('talent_id, deliverable_id, base_rate');

      if (error) throw error;

      // Build a map: talentId -> deliverableId -> base_rate
      const map = new Map<string, Map<string, number>>();
      data?.forEach((tr) => {
        if (!map.has(tr.talent_id)) {
          map.set(tr.talent_id, new Map());
        }
        map.get(tr.talent_id)!.set(tr.deliverable_id, tr.base_rate);
      });

      setRatesMap(map);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching all talent rates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get base rate for a talent/deliverable
  const getRate = (talentId: string, deliverableId: string): number => {
    return ratesMap.get(talentId)?.get(deliverableId) || 0;
  };

  return { ratesMap, getRate, loading, error, refetch: fetchAllRates };
};

// Social accounts hook - fetch and manage social accounts for a talent
export const useTalentSocialAccounts = (talentId: string | null) => {
  const [accounts, setAccounts] = useState<TalentSocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!talentId) {
      setAccounts([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('talent_social_accounts')
        .select('*')
        .eq('talent_id', talentId)
        .order('platform', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching social accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [talentId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = async (account: Omit<TalentSocialAccount, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('talent_social_accounts')
        .insert([account])
        .select()
        .single();

      if (error) throw error;
      setAccounts(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding social account:', err);
      throw err;
    }
  };

  const updateAccount = async (id: string, updates: Partial<TalentSocialAccount>) => {
    try {
      const { data, error } = await supabase
        .from('talent_social_accounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setAccounts(prev => prev.map(acc => acc.id === id ? data : acc));
      return data;
    } catch (err) {
      console.error('Error updating social account:', err);
      throw err;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('talent_social_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAccounts(prev => prev.filter(acc => acc.id !== id));
    } catch (err) {
      console.error('Error deleting social account:', err);
      throw err;
    }
  };

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount
  };
};

// Fetch social accounts for multiple talents (for roster display)
export const useAllTalentSocialAccounts = () => {
  const [accountsMap, setAccountsMap] = useState<Map<string, TalentSocialAccount[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('talent_social_accounts')
        .select('*')
        .order('platform', { ascending: true });

      if (error) throw error;

      // Group by talent_id
      const map = new Map<string, TalentSocialAccount[]>();
      data?.forEach((account) => {
        if (!map.has(account.talent_id)) {
          map.set(account.talent_id, []);
        }
        map.get(account.talent_id)!.push(account);
      });

      setAccountsMap(map);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching all social accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAccounts();
  }, [fetchAllAccounts]);

  const getAccountsForTalent = (talentId: string): TalentSocialAccount[] => {
    return accountsMap.get(talentId) || [];
  };

  return {
    accountsMap,
    getAccountsForTalent,
    loading,
    error,
    refetch: fetchAllAccounts
  };
};

// Platforms hook - fetch all platforms from database
export const usePlatforms = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlatforms = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlatforms(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching platforms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  // Get active platforms only
  const activePlatforms = platforms.filter(p => p.is_active);

  // Get platform by slug
  const getPlatformBySlug = (slug: string): Platform | undefined => {
    return platforms.find(p => p.slug === slug);
  };

  // Get platform by ID
  const getPlatformById = (id: string): Platform | undefined => {
    return platforms.find(p => p.id === id);
  };

  // Create a new platform (admin only)
  const createPlatform = async (platform: Omit<Platform, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .insert([platform])
        .select()
        .single();

      if (error) throw error;
      setPlatforms(prev => [...prev, data].sort((a, b) => a.display_order - b.display_order));
      return data;
    } catch (err) {
      console.error('Error creating platform:', err);
      throw err;
    }
  };

  // Update a platform (admin only)
  const updatePlatform = async (id: string, updates: Partial<Platform>) => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setPlatforms(prev => prev.map(p => p.id === id ? data : p).sort((a, b) => a.display_order - b.display_order));
      return data;
    } catch (err) {
      console.error('Error updating platform:', err);
      throw err;
    }
  };

  // Delete a platform (admin only)
  const deletePlatform = async (id: string) => {
    try {
      const { error } = await supabase
        .from('platforms')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPlatforms(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting platform:', err);
      throw err;
    }
  };

  return {
    platforms,
    activePlatforms,
    loading,
    error,
    refetch: fetchPlatforms,
    getPlatformBySlug,
    getPlatformById,
    createPlatform,
    updatePlatform,
    deletePlatform
  };
};

// Categories hook - fetch all categories from database
export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Get active categories only
  const activeCategories = categories.filter(c => c.is_active);

  // Get category by slug
  const getCategoryBySlug = (slug: string): Category | undefined => {
    return categories.find(c => c.slug === slug);
  };

  // Get category by ID
  const getCategoryById = (id: string): Category | undefined => {
    return categories.find(c => c.id === id);
  };

  // Create a new category (admin only)
  const createCategory = async (category: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data].sort((a, b) => a.display_order - b.display_order));
      return data;
    } catch (err) {
      console.error('Error creating category:', err);
      throw err;
    }
  };

  // Update a category (admin only)
  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => prev.map(c => c.id === id ? data : c).sort((a, b) => a.display_order - b.display_order));
      return data;
    } catch (err) {
      console.error('Error updating category:', err);
      throw err;
    }
  };

  // Delete a category (admin only)
  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting category:', err);
      throw err;
    }
  };

  return {
    categories,
    activeCategories,
    loading,
    error,
    refetch: fetchCategories,
    getCategoryBySlug,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
  };
};

// Talent categories hook - fetch categories for a specific talent
export const useTalentCategories = (talentId: string | null) => {
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTalentCategories = useCallback(async () => {
    if (!talentId) {
      setCategoryIds([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('talent_categories')
        .select('category_id')
        .eq('talent_id', talentId);

      if (error) throw error;
      setCategoryIds(data?.map(tc => tc.category_id) || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching talent categories:', err);
    } finally {
      setLoading(false);
    }
  }, [talentId]);

  useEffect(() => {
    fetchTalentCategories();
  }, [fetchTalentCategories]);

  // Update talent categories (replace all)
  const updateTalentCategories = async (newCategoryIds: string[]) => {
    if (!talentId) return;

    try {
      // Delete existing categories
      await supabase
        .from('talent_categories')
        .delete()
        .eq('talent_id', talentId);

      // Insert new categories
      if (newCategoryIds.length > 0) {
        const inserts = newCategoryIds.map(categoryId => ({
          talent_id: talentId,
          category_id: categoryId,
        }));

        const { error } = await supabase
          .from('talent_categories')
          .insert(inserts);

        if (error) throw error;
      }

      setCategoryIds(newCategoryIds);
    } catch (err) {
      console.error('Error updating talent categories:', err);
      throw err;
    }
  };

  return {
    categoryIds,
    loading,
    error,
    refetch: fetchTalentCategories,
    updateTalentCategories
  };
};

// Fetch categories for all talents (for roster display and filtering)
export const useAllTalentCategories = () => {
  const [categoriesMap, setCategoriesMap] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllTalentCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('talent_categories')
        .select('talent_id, category_id');

      if (error) throw error;

      // Group by talent_id
      const map = new Map<string, string[]>();
      data?.forEach((tc) => {
        if (!map.has(tc.talent_id)) {
          map.set(tc.talent_id, []);
        }
        map.get(tc.talent_id)!.push(tc.category_id);
      });

      setCategoriesMap(map);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching all talent categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTalentCategories();
  }, [fetchAllTalentCategories]);

  const getCategoriesForTalent = (talentId: string): string[] => {
    return categoriesMap.get(talentId) || [];
  };

  return {
    categoriesMap,
    getCategoriesForTalent,
    loading,
    error,
    refetch: fetchAllTalentCategories
  };
};

// Terms Templates interface
export interface TermsTemplate {
  id: string;
  user_id: string | null;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Terms Templates hook
export const useTermsTemplates = () => {
  const [templates, setTemplates] = useState<TermsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('terms_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching terms templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTemplate = () => {
    return templates.find(t => t.is_default) || templates[0];
  };

  return { templates, loading, error, refetch: fetchTemplates, getDefaultTemplate };
};

// Talent Deliverable interface for rate card view
export interface TalentDeliverable {
  id: string;
  name: string;
  platform: string;
  category: DeliverableCategory;
  display_order: number;
  is_addon: boolean;
  addon_type: string | null;
  rate: number; // in cents
}

// Hook to fetch only deliverables where a talent has rates set
export const useTalentDeliverables = (talentId: string | null) => {
  const [deliverables, setDeliverables] = useState<TalentDeliverable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!talentId) {
      setDeliverables([]);
      return;
    }

    const fetchTalentDeliverables = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('talent_rates')
          .select(`
            base_rate,
            deliverable:deliverables!inner (
              id,
              name,
              platform,
              category,
              display_order,
              is_addon,
              addon_type
            )
          `)
          .eq('talent_id', talentId)
          .gt('base_rate', 0);

        if (error) throw error;

        const formatted: TalentDeliverable[] = (data || [])
          .filter((item: any) => item.deliverable) // Filter out any null deliverables
          .map((item: any) => ({
            id: item.deliverable.id,
            name: item.deliverable.name,
            platform: item.deliverable.platform,
            category: item.deliverable.category,
            display_order: item.deliverable.display_order,
            is_addon: item.deliverable.is_addon || false,
            addon_type: item.deliverable.addon_type,
            rate: item.base_rate,
          }))
          .sort((a: TalentDeliverable, b: TalentDeliverable) => a.display_order - b.display_order);

        setDeliverables(formatted);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching talent deliverables:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTalentDeliverables();
  }, [talentId]);

  // Separate main content from add-ons
  const mainDeliverables = useMemo(() =>
    deliverables.filter(d => !d.is_addon),
    [deliverables]
  );

  const addonDeliverables = useMemo(() =>
    deliverables.filter(d => d.is_addon),
    [deliverables]
  );

  // Group by category
  const groupedByCategory = useMemo(() => {
    return deliverables.reduce((acc, d) => {
      const cat = d.category || 'content';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(d);
      return acc;
    }, {} as Record<string, TalentDeliverable[]>);
  }, [deliverables]);

  return {
    deliverables,
    mainDeliverables,
    addonDeliverables,
    groupedByCategory,
    loading,
    error
  };
};

// Hook to fetch add-on rules for selected base deliverables
export const useAddonRules = (baseDeliverableIds: string[]) => {
  const [rules, setRules] = useState<DeliverableAddonRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (baseDeliverableIds.length === 0) {
      setRules([]);
      return;
    }

    const fetchRules = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('deliverable_addon_rules')
        .select(`
          *,
          addon:deliverables!addon_deliverable_id (
            id, name, category, platform
          )
        `)
        .in('base_deliverable_id', baseDeliverableIds)
        .eq('is_active', true);

      if (!error && data) {
        setRules(data);
      }

      setLoading(false);
    };

    fetchRules();
  }, [baseDeliverableIds.join(',')]);

  const getAddonsForBase = (baseId: string) => {
    return rules.filter(r => r.base_deliverable_id === baseId);
  };

  return { rules, getAddonsForBase, loading };
};
