import React, { useState } from 'react';
import './OptimizationPanel.css';

/**
 * Optimization Panel Component
 * 
 * Displays optimization results:
 * - Selected bullets with relevance scores
 * - Before/after comparison
 * - Gap analysis
 * - Customization options
 */
function OptimizationPanel({ result, onClose }) {
  const [selectedBullets, setSelectedBullets] = useState(result.selectedBullets || []);
  const [editingBullet, setEditingBullet] = useState(null);

  if (!result) return null;

  return (
    <div className="optimization-panel">
      <div className="panel-header">
        <h2>Optimization Results</h2>
        <button className="btn-icon" onClick={onClose} title="Close">
          ×
        </button>
      </div>

      <div className="panel-stats">
        <div className="stat">
          <span className="stat-label">Selected:</span>
          <span className="stat-value">{selectedBullets.length} bullets</span>
        </div>
        <div className="stat">
          <span className="stat-label">Mode:</span>
          <span className="stat-value">{result.mode || 'strict'}</span>
        </div>
      </div>

      <div className="bullets-comparison">
        <h3>Optimized Bullets</h3>
        {selectedBullets.map((bullet, index) => (
          <div key={bullet.id || index} className="bullet-comparison">
            <div className="bullet-header">
              <span className="bullet-index">{index + 1}</span>
              <span className="relevance-score">
                Relevance: {(bullet.relevanceScore || 0).toFixed(2)}
              </span>
            </div>
            
            <div className="comparison-row">
              <div className="bullet-before">
                <label>Original</label>
                <p>{bullet.original || bullet.text}</p>
              </div>
              
              <div className="arrow">→</div>
              
              <div className="bullet-after">
                <label>Optimized</label>
                {editingBullet === bullet.id ? (
                  <textarea
                    className="bullet-edit"
                    value={bullet.rewritten}
                    onChange={(e) => {
                      const updated = selectedBullets.map(b =>
                        b.id === bullet.id
                          ? { ...b, rewritten: e.target.value }
                          : b
                      );
                      setSelectedBullets(updated);
                    }}
                    onBlur={() => setEditingBullet(null)}
                    rows={3}
                  />
                ) : (
                  <p onClick={() => setEditingBullet(bullet.id)}>
                    {bullet.rewritten || bullet.text}
                  </p>
                )}
              </div>
            </div>

            <div className="bullet-actions">
              <button className="btn-small">✓ Use</button>
              <button
                className="btn-small"
                onClick={() => setEditingBullet(bullet.id)}
              >
                Edit
              </button>
              <button className="btn-small">Swap</button>
            </div>
          </div>
        ))}
      </div>

      {result.gaps && result.gaps.length > 0 && (
        <div className="gaps-section">
          <h3>Gaps Identified</h3>
          <p className="gaps-description">
            The following skills/experiences are mentioned in the job description
            but not strongly represented in your resume:
          </p>
          <ul className="gaps-list">
            {result.gaps.map((gap, index) => (
              <li key={index}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel-actions">
        <button className="btn btn-primary btn-large">
          Export Resume (PDF)
        </button>
        <button className="btn btn-secondary btn-large">
          Customize Selection
        </button>
      </div>
    </div>
  );
}

export default OptimizationPanel;


