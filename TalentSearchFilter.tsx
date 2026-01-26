import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronRight, Instagram } from 'lucide-react';
import type { Talent } from './supabaseClient';
import { useCategories, useAllTalentCategories, useAllTalentSocialAccounts } from './hooks';

interface TalentSearchFilterProps {
  talents: Talent[];
  onSelectTalent: (talentId: string) => void;
}

// Follower range presets
const FOLLOWER_RANGES: Record<string, [number, number] | null> = {
  any: null,
  nano: [0, 10000],
  micro: [10000, 50000],
  mid: [50000, 100000],
  macro: [100000, Infinity],
};

const FOLLOWER_LABELS: Record<string, string> = {
  any: 'Any Size',
  nano: '< 10K (Nano)',
  micro: '10K - 50K (Micro)',
  mid: '50K - 100K (Mid)',
  macro: '100K+ (Macro)',
};

// Platform icons component
const PlatformIcon = ({ platform, className = "w-3.5 h-3.5" }: { platform: string; className?: string }) => {
  switch (platform) {
    case 'instagram':
      return <Instagram className={className} />;
    case 'tiktok':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      );
    case 'youtube':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    default:
      return <div className={`${className} rounded-full bg-gray-400`} />;
  }
};

const formatFollowerCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const TalentSearchFilter: React.FC<TalentSearchFilterProps> = ({
  talents,
  onSelectTalent,
}) => {
  // Hooks for data
  const { activeCategories } = useCategories();
  const { getCategoriesForTalent } = useAllTalentCategories();
  const { getAccountsForTalent } = useAllTalentSocialAccounts();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [followerRange, setFollowerRange] = useState<string>('any');

  // Dropdown open state
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [followerDropdownOpen, setFollowerDropdownOpen] = useState(false);

  // Refs for click outside
  const categoryRef = useRef<HTMLDivElement>(null);
  const platformRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (platformRef.current && !platformRef.current.contains(e.target as Node)) {
        setPlatformDropdownOpen(false);
      }
      if (followerRef.current && !followerRef.current.contains(e.target as Node)) {
        setFollowerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get unique platforms from all talents
  const availablePlatforms = useMemo(() => {
    const platforms = new Set<string>();
    talents.forEach(talent => {
      const accounts = getAccountsForTalent(talent.id);
      accounts.forEach(acc => platforms.add(acc.platform));
    });
    return Array.from(platforms).sort();
  }, [talents, getAccountsForTalent]);

  // Filter talents
  const filteredTalents = useMemo(() => {
    return talents.filter(talent => {
      // Search filter
      if (searchQuery && !talent.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category filter
      if (selectedCategories.length > 0) {
        const talentCategoryIds = getCategoriesForTalent(talent.id);
        if (!selectedCategories.some(catId => talentCategoryIds.includes(catId))) {
          return false;
        }
      }

      // Platform filter
      if (selectedPlatforms.length > 0) {
        const talentAccounts = getAccountsForTalent(talent.id);
        if (!selectedPlatforms.some(platform =>
          talentAccounts.some(acc => acc.platform === platform)
        )) {
          return false;
        }
      }

      // Follower range filter
      const range = FOLLOWER_RANGES[followerRange];
      if (range) {
        const [min, max] = range;
        const talentAccounts = getAccountsForTalent(talent.id);
        const hasAccountInRange = talentAccounts.some(acc =>
          (acc.follower_count || 0) >= min && (acc.follower_count || 0) <= max
        );
        if (!hasAccountInRange) return false;
      }

      return true;
    });
  }, [talents, searchQuery, selectedCategories, selectedPlatforms, followerRange, getCategoriesForTalent, getAccountsForTalent]);

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Toggle platform selection
  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedPlatforms([]);
    setFollowerRange('any');
  };

  const hasActiveFilters = searchQuery || selectedCategories.length > 0 || selectedPlatforms.length > 0 || followerRange !== 'any';

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search talents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Category Filter */}
        <div ref={categoryRef} className="relative">
          <button
            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              selectedCategories.length > 0
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>
              {selectedCategories.length > 0
                ? `${selectedCategories.length} Categor${selectedCategories.length === 1 ? 'y' : 'ies'}`
                : 'Category'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {categoryDropdownOpen && (
            <div className="absolute z-20 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-64 overflow-y-auto">
              {activeCategories.map(category => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{category.name}</span>
                </label>
              ))}
              {activeCategories.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-500">No categories available</p>
              )}
            </div>
          )}
        </div>

        {/* Platform Filter */}
        <div ref={platformRef} className="relative">
          <button
            onClick={() => setPlatformDropdownOpen(!platformDropdownOpen)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              selectedPlatforms.length > 0
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>
              {selectedPlatforms.length > 0
                ? `${selectedPlatforms.length} Platform${selectedPlatforms.length === 1 ? '' : 's'}`
                : 'Platform'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {platformDropdownOpen && (
            <div className="absolute z-20 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              {availablePlatforms.map(platform => (
                <label
                  key={platform}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="flex items-center gap-1.5 text-sm text-gray-700">
                    <PlatformIcon platform={platform} />
                    <span className="capitalize">{platform}</span>
                  </span>
                </label>
              ))}
              {availablePlatforms.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-500">No platforms available</p>
              )}
            </div>
          )}
        </div>

        {/* Follower Range Filter */}
        <div ref={followerRef} className="relative">
          <button
            onClick={() => setFollowerDropdownOpen(!followerDropdownOpen)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              followerRange !== 'any'
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{FOLLOWER_LABELS[followerRange]}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {followerDropdownOpen && (
            <div className="absolute z-20 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              {Object.entries(FOLLOWER_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setFollowerRange(key);
                    setFollowerDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    followerRange === key ? 'text-brand-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}

        {/* Results Count */}
        <span className="ml-auto text-sm text-gray-500">
          {filteredTalents.length} of {talents.length} talents
        </span>
      </div>

      {/* Talent List */}
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {filteredTalents.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <p>No talents match your filters</p>
            <button
              onClick={clearFilters}
              className="mt-2 text-sm text-brand-600 hover:text-brand-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredTalents.map(talent => {
            const categories = getCategoriesForTalent(talent.id);
            const categoryNames = activeCategories
              .filter(c => categories.includes(c.id))
              .map(c => c.name);
            const accounts = getAccountsForTalent(talent.id);

            return (
              <button
                key={talent.id}
                onClick={() => onSelectTalent(talent.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <img
                  src={talent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(talent.name)}`}
                  alt={talent.name}
                  className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{talent.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                    {categoryNames.length > 0 && (
                      <span>{categoryNames.join(', ')}</span>
                    )}
                    {categoryNames.length > 0 && accounts.length > 0 && (
                      <span>•</span>
                    )}
                    {accounts.map(acc => (
                      <span key={acc.platform} className="flex items-center gap-1">
                        <PlatformIcon platform={acc.platform} />
                        {formatFollowerCount(acc.follower_count || 0)}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TalentSearchFilter;
