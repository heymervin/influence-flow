import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] Initializing client...');
console.log('[Supabase] URL:', supabaseUrl);
console.log('[Supabase] Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

console.log('[Supabase] Client created successfully');

// Type definitions for database tables
export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'manager' | 'viewer';
  company_name?: string;
  company_email?: string;
  company_phone?: string;
  quote_terms?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Talent {
  id: string;
  user_id: string;
  name: string;
  category: string;
  status: 'active' | 'on-hold' | 'inactive';
  avatar_url?: string;
  bio?: string;
  notes?: string;
  source_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  user_id: string;
  client_id?: string;
  client_name: string;
  campaign_name: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  quote_number?: string;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  valid_until?: string;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  accepted_at?: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  talent_id?: string;
  talent_name: string;
  description: string;
  rate_type: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'quote_sent' | 'quote_accepted' | 'quote_rejected' | 'new_talent' | 'system';
  title: string;
  message?: string;
  link_url?: string;
  read: boolean;
  created_at: string;
}

export interface QuoteRevision {
  id: string;
  quote_id: string;
  revision_number: number;
  changes_summary?: string;
  previous_total?: number;
  new_total?: number;
  changed_fields?: Record<string, { old: any; new: any }>;
  created_at: string;
  created_by?: string;
}

export interface Deal {
  id: string;
  user_id: string;
  quote_id?: string;
  talent_id?: string;
  client_id?: string;
  deal_date: string;
  gross_amount: number; // in cents
  commission_rate: number; // percentage (e.g., 15.00)
  commission_amount: number; // in cents
  net_to_talent: number; // in cents
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Deliverable types (content types that talents can provide)
export type DeliverableCategory = 'content' | 'paid_ad_rights' | 'talent_boosting' | 'ugc' | 'exclusivity' | 'agency_fee';

export interface Deliverable {
  id: string;
  name: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'cross-platform' | 'all';
  category: DeliverableCategory;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Talent rates for each deliverable
export interface TalentRate {
  id: string;
  talent_id: string;
  deliverable_id: string;
  base_rate: number; // in cents
  created_at: string;
  updated_at: string;
  // Joined fields (optional, for queries)
  deliverable?: Deliverable;
  talent?: Talent;
}

// Keep Service as alias for backward compatibility
export type Service = Deliverable;

// Platform entity from database
export interface Platform {
  id: string;
  name: string;
  slug: string;
  icon_name?: string;
  color: string;
  url_prefix?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Social media platforms supported (legacy type for backward compatibility)
export type SocialPlatform = string;

// Social account for a talent
export interface TalentSocialAccount {
  id: string;
  talent_id: string;
  platform: string; // slug from platforms table
  platform_id?: string; // foreign key to platforms table
  handle: string;
  follower_count?: number;
  profile_url?: string;
  created_at: string;
  updated_at: string;
}

// Platform display configuration (legacy - kept for backward compatibility during migration)
// New code should use the usePlatforms() hook instead
export const SOCIAL_PLATFORMS: Record<string, { name: string; color: string; urlPrefix: string }> = {
  instagram: { name: 'Instagram', color: 'pink', urlPrefix: 'https://instagram.com/' },
  tiktok: { name: 'TikTok', color: 'gray', urlPrefix: 'https://tiktok.com/@' },
  youtube: { name: 'YouTube', color: 'red', urlPrefix: 'https://youtube.com/@' },
  twitch: { name: 'Twitch', color: 'purple', urlPrefix: 'https://twitch.tv/' },
  linkedin: { name: 'LinkedIn', color: 'blue', urlPrefix: 'https://linkedin.com/in/' },
  twitter: { name: 'Twitter/X', color: 'sky', urlPrefix: 'https://twitter.com/' },
  facebook: { name: 'Facebook', color: 'indigo', urlPrefix: 'https://facebook.com/' },
};

// Category entity from database
export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Talent category junction
export interface TalentCategory {
  id: string;
  talent_id: string;
  category_id: string;
  created_at: string;
  category?: Category; // Joined field
}
