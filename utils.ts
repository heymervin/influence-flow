/**
 * Format a number to a compact string (e.g., 10000 → 10K, 1500000 → 1.5M)
 */
export const formatFollowerCount = (count: number | undefined | null): string => {
  if (!count && count !== 0) return 'N/A';
  if (count === 0) return '0';

  if (count >= 1000000) {
    const millions = count / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }

  if (count >= 1000) {
    const thousands = count / 1000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
  }

  return count.toString();
};

/**
 * Parse a follower string (e.g., "10K", "1.5M", "10,000") to a number
 */
export const parseFollowerString = (str: string | undefined | null): number | null => {
  if (!str) return null;

  // Remove commas and whitespace
  const cleaned = str.replace(/,/g, '').trim().toUpperCase();

  // Handle K suffix (thousands)
  if (cleaned.endsWith('K')) {
    const num = parseFloat(cleaned.slice(0, -1));
    return isNaN(num) ? null : Math.round(num * 1000);
  }

  // Handle M suffix (millions)
  if (cleaned.endsWith('M')) {
    const num = parseFloat(cleaned.slice(0, -1));
    return isNaN(num) ? null : Math.round(num * 1000000);
  }

  // Handle plain numbers
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
};
