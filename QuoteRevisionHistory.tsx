import React, { useEffect, useState } from 'react';
import { Clock, TrendingUp, TrendingDown, FileText, Copy } from 'lucide-react';
import { QuoteRevision, supabase } from './supabaseClient';

interface QuoteRevisionHistoryProps {
  quoteId: string;
}

const QuoteRevisionHistory: React.FC<QuoteRevisionHistoryProps> = ({ quoteId }) => {
  const [revisions, setRevisions] = useState<QuoteRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRevisions();
  }, [quoteId]);

  const fetchRevisions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('quote_revisions')
        .select('*')
        .eq('quote_id', quoteId)
        .order('revision_number', { ascending: false });

      if (fetchError) throw fetchError;

      setRevisions(data || []);
    } catch (err) {
      console.error('Error fetching revisions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch revisions');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number | undefined | null): string => {
    if (!cents) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const getTotalChange = (revision: QuoteRevision) => {
    if (!revision.previous_total || !revision.new_total) return null;
    const change = revision.new_total - revision.previous_total;
    return {
      amount: Math.abs(change),
      isIncrease: change > 0,
      percentage: ((change / revision.previous_total) * 100).toFixed(1),
    };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
        <p className="mt-2 text-sm text-gray-500">Loading revision history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No revision history yet</p>
        <p className="text-xs text-gray-400 mt-1">Changes to this quote will be tracked here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">Revision History</h4>
        <span className="text-xs text-gray-500">{revisions.length} revision{revisions.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Timeline */}
      <div className="relative space-y-4">
        {/* Vertical line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200"></div>

        {revisions.map((revision, index) => {
          const change = getTotalChange(revision);

          return (
            <div key={revision.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 ${
                index === 0
                  ? 'bg-brand-600 border-brand-600'
                  : 'bg-white border-gray-300'
              }`}></div>

              {/* Content */}
              <div className={`bg-white border rounded-lg p-4 ${
                index === 0 ? 'border-brand-200 shadow-sm' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900">
                        Version {revision.revision_number}
                      </span>
                      {index === 0 && (
                        <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full font-medium">
                          Current
                        </span>
                      )}
                    </div>

                    {revision.changes_summary && (
                      <p className="text-sm text-gray-700 mb-2">{revision.changes_summary}</p>
                    )}

                    {/* Total change indicator */}
                    {change && (
                      <div className="flex items-center gap-2 mt-2">
                        {change.isIncrease ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">
                              +{formatCurrency(change.amount)} ({change.percentage}%)
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600 font-medium">
                              -{formatCurrency(change.amount)} ({change.percentage}%)
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Changed fields detail */}
                    {revision.changed_fields && Object.keys(revision.changed_fields).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Changed fields:</p>
                        <div className="space-y-1">
                          {Object.entries(revision.changed_fields).map(([field, values]) => (
                            <div key={field} className="text-xs text-gray-600">
                              <span className="font-medium capitalize">{field.replace('_', ' ')}:</span>{' '}
                              <span className="line-through text-gray-400">
                                {typeof values.old === 'number' ? formatCurrency(values.old) : values.old}
                              </span>
                              {' → '}
                              <span className="font-medium text-gray-900">
                                {typeof values.new === 'number' ? formatCurrency(values.new) : values.new}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(revision.created_at)}</span>
                    </div>

                    {/* Actions */}
                    <button
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                      onClick={() => {
                        // TODO: Implement "Duplicate as new version" functionality
                        console.log('Duplicate version:', revision.revision_number);
                      }}
                    >
                      <Copy className="w-3 h-3" />
                      Duplicate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuoteRevisionHistory;
