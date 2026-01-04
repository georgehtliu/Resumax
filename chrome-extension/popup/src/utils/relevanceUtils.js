/**
 * Utility functions for converting relevance scores to user-friendly labels
 */

/**
 * Converts a relevance score (0-1) to a user-friendly label
 * @param {number} score - Relevance score between 0 and 1
 * @returns {string} User-friendly label (e.g., "9/10 Excellent")
 */
export function getRelevanceLabel(score) {
  // Convert 0-1 score to 0-10 scale and round to nearest integer
  const scoreOutOf10 = Math.round(score * 10);
  
  // Add brief descriptive text based on score
  let description = '';
  if (score >= 0.9) {
    description = 'Excellent';
  } else if (score >= 0.7) {
    description = 'Strong';
  } else if (score >= 0.5) {
    description = 'Moderate';
  } else {
    description = 'Weak';
  }
  
  return `${scoreOutOf10}/10 ${description}`;
}

/**
 * Gets the CSS class name for a relevance score
 * @param {number} score - Relevance score between 0 and 1
 * @returns {string} CSS class name
 */
export function getRelevanceClass(score) {
  if (score >= 0.9) {
    return 'relevance-high';
  } else if (score >= 0.7) {
    return 'relevance-good';
  } else if (score >= 0.5) {
    return 'relevance-moderate';
  } else {
    return 'relevance-low';
  }
}

/**
 * Gets a color code for a relevance score
 * @param {number} score - Relevance score between 0 and 1
 * @returns {string} Hex color code
 */
export function getRelevanceColor(score) {
  if (score >= 0.9) {
    return '#10b981'; // green
  } else if (score >= 0.7) {
    return '#3b82f6'; // blue
  } else if (score >= 0.5) {
    return '#f59e0b'; // amber
  } else {
    return '#6b7280'; // gray
  }
}

