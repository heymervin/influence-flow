import React from 'react';
import { Instagram, Globe, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import type { PlatformSummary } from './hooks';

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
  switch (platform.toLowerCase()) {
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

const getPlatformColor = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'pink';
    case 'tiktok':
      return 'gray';
    case 'youtube':
      return 'red';
    case 'cross-platform':
      return 'purple';
    default:
      return 'blue';
  }
};

const getPlatformDisplayName = (platform: string): string => {
  switch (platform.toLowerCase()) {
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
      return platform.charAt(0).toUpperCase() + platform.slice(1);
  }
};

interface PlatformCardProps {
  platform: PlatformSummary;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PlatformCard: React.FC<PlatformCardProps> = ({ platform, onEdit, onDelete }) => {
  const color = getPlatformColor(platform.platform);
  const [showMenu, setShowMenu] = React.useState(false);

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`relative p-4 rounded-lg border ${colors.border} bg-white hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
            {getPlatformIcon(platform.platform, `w-5 h-5 ${colors.text}`)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {getPlatformDisplayName(platform.platform)}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              {platform.is_active ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs ${platform.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {platform.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                  {onEdit && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit();
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete();
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-lg font-bold text-gray-900">{platform.content_count}</p>
          <p className="text-xs text-gray-500">Content</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-lg font-bold text-gray-900">{platform.ugc_count}</p>
          <p className="text-xs text-gray-500">UGC</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-lg font-bold text-gray-900">{platform.addon_count}</p>
          <p className="text-xs text-gray-500">Add-ons</p>
        </div>
      </div>
    </div>
  );
};

export default PlatformCard;
