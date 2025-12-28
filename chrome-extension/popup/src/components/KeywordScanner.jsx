import React from 'react';
import { Icon } from './ui/Icons';
import './KeywordScanner.css';

/**
 * Keyword Scanner Component
 * 
 * Displays keyword match results:
 * - Match percentage
 * - Found keywords
 * - Missing keywords
 */
function KeywordScanner({ keywordData, loading = false }) {
  if (loading) {
    return (
      <div className="keyword-scanner">
        <div className="keyword-scanner-header">
          <Icon name="search" size={18} />
          <h3>Scanning Keywords...</h3>
        </div>
      </div>
    );
  }

  if (!keywordData || !keywordData.statistics) {
    return null;
  }

  const { found_keywords = [], missing_keywords = [], statistics } = keywordData;
  const { match_percentage, total_keywords, found_count, missing_count } = statistics;

  // Determine color based on match percentage
  const getPercentageColor = (percentage) => {
    if (percentage >= 80) return '#10b981'; // green
    if (percentage >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const percentageColor = getPercentageColor(match_percentage);

  return (
    <div className="keyword-scanner">
      <div className="keyword-scanner-header">
        <Icon name="search" size={18} />
        <h3>Keyword Match</h3>
      </div>

      {/* Match Percentage */}
      <div className="keyword-statistics">
        <div className="match-percentage" style={{ color: percentageColor }}>
          <span className="percentage-value">{match_percentage}%</span>
          <span className="percentage-label">Match</span>
        </div>
        <div className="match-details">
          <div className="match-detail-item">
            <span className="detail-label">Found:</span>
            <span className="detail-value found">{found_count}</span>
          </div>
          <div className="match-detail-item">
            <span className="detail-label">Missing:</span>
            <span className="detail-value missing">{missing_count}</span>
          </div>
          <div className="match-detail-item">
            <span className="detail-label">Total:</span>
            <span className="detail-value">{total_keywords}</span>
          </div>
        </div>
      </div>

      {/* Found Keywords */}
      {found_keywords.length > 0 && (
        <div className="keyword-section">
          <div className="keyword-section-header">
            <Icon name="check-circle" size={16} style={{ color: '#10b981' }} />
            <h4>Keywords You Have ({found_keywords.length})</h4>
          </div>
          <div className="keyword-list found-keywords">
            {found_keywords.map((keyword, index) => (
              <div key={index} className="keyword-item found">
                <span className="keyword-name">{keyword.keyword}</span>
                {keyword.match_count > 1 && (
                  <span className="keyword-count">×{keyword.match_count}</span>
                )}
                {keyword.is_required && (
                  <span className="keyword-badge required">Required</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Keywords */}
      {missing_keywords.length > 0 && (
        <div className="keyword-section">
          <div className="keyword-section-header">
            <Icon name="x-circle" size={16} style={{ color: '#ef4444' }} />
            <h4>Missing Keywords ({missing_keywords.length})</h4>
          </div>
          <div className="keyword-list missing-keywords">
            {missing_keywords.map((keyword, index) => (
              <div key={index} className="keyword-item missing">
                <span className="keyword-name">{keyword.keyword}</span>
                {keyword.is_required && (
                  <span className="keyword-badge required">Required</span>
                )}
                {keyword.category !== 'other' && (
                  <span className="keyword-badge category">{keyword.category.replace('_', ' ')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {found_keywords.length === 0 && missing_keywords.length === 0 && (
        <div className="keyword-empty">
          <p>No keywords found in job description.</p>
        </div>
      )}
    </div>
  );
}

export default KeywordScanner;


