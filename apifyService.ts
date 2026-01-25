// Apify Instagram Follower Scraper Service
// Handles fetching follower counts and engagement stats from Instagram
// Uses Vercel serverless function to avoid CORS issues

interface ApifyDatasetItem {
  username: string;
  followersCount?: number;
  engagementRate?: number;
  profileUrl?: string;
  error?: string;
}

interface ScrapedStats {
  follower_count: number;
  followers: string; // Formatted like "125K"
  engagement_rate?: number;
  last_stats_update: string;
}

interface ApiResponse {
  success: boolean;
  data: ApifyDatasetItem[];
  error?: string;
}

// Format follower count to human-readable string (e.g., 125000 -> "125K")
const formatFollowers = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

// Call the Vercel API route to scrape Instagram stats
const callScraperApi = async (usernames: string[]): Promise<ApifyDatasetItem[]> => {
  const response = await fetch('/api/scrape-instagram', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ usernames }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'No data returned from API');
  }

  return result.data;
};

// Main function: Scrape stats for a single talent
export const scrapeInstagramStats = async (instagramHandle: string): Promise<ScrapedStats> => {
  try {
    const username = instagramHandle.replace('@', '');
    const results = await callScraperApi([username]);

    if (results.length === 0 || results[0].error) {
      throw new Error(results[0]?.error || 'No data returned from scraper');
    }

    const data = results[0];
    const follower_count = data.followersCount || 0;

    return {
      follower_count,
      followers: formatFollowers(follower_count),
      engagement_rate: data.engagementRate ? parseFloat(data.engagementRate.toFixed(2)) : undefined,
      last_stats_update: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Apify] Error scraping stats:', error);
    throw error;
  }
};

// Bulk scrape for multiple talents
export const scrapeMultipleInstagramStats = async (
  handles: string[]
): Promise<Map<string, ScrapedStats>> => {
  try {
    const usernames = handles.map(h => h.replace('@', ''));
    const results = await callScraperApi(usernames);

    const statsMap = new Map<string, ScrapedStats>();

    results.forEach(data => {
      if (data.username && !data.error) {
        const follower_count = data.followersCount || 0;
        statsMap.set(`@${data.username}`, {
          follower_count,
          followers: formatFollowers(follower_count),
          engagement_rate: data.engagementRate ? parseFloat(data.engagementRate.toFixed(2)) : undefined,
          last_stats_update: new Date().toISOString(),
        });
      }
    });

    return statsMap;
  } catch (error) {
    console.error('[Apify] Error bulk scraping stats:', error);
    throw error;
  }
};
