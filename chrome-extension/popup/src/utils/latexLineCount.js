/**
 * Utility to estimate LaTeX line count for bullet points in Jake's Resume template
 * 
 * Jake's Resume typically uses:
 * - 110 characters per line for bullet points with \small font
 * - Narrow column width but with adjusted margins
 * 
 * This provides an approximate estimate for visual feedback
 */

/**
 * Estimate the number of lines a bullet point will take in LaTeX (Jake's Resume)
 * @param {string} text - The bullet point text
 * @returns {number} Estimated line count (1, 2, or more)
 */
export function estimateLatexLines(text) {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Standard character count per line for resume formatting
  const CHARS_PER_LINE = 110;
  const effectiveLength = text.trim().length + 2;
  const lineCount = Math.max(1, Math.ceil(effectiveLength / CHARS_PER_LINE));
  // Don't cap at 3 - allow longer bullets to be estimated correctly
  return lineCount;
}

/**
 * Get line count category for styling
 * @param {string} text - The bullet point text
 * @returns {Object} { count: number, exactCount: number, category: 'single' | 'double' | 'overflow' | 'near-single', warning: boolean, warningMessage: string }
 */
export function getLineCountInfo(text) {
  if (!text || text.trim().length === 0) {
    return { count: 0, exactCount: 0, category: 'empty', warning: false, warningMessage: '' };
  }

  // Calculate exact decimal line count
  const CHARS_PER_LINE = 110;
  const effectiveLength = text.trim().length + 2;
  const exactCount = Math.max(1, effectiveLength / CHARS_PER_LINE);
  const count = Math.ceil(exactCount);
  
  // Check if bullet is between 1.01 - 1.4 lines (suggest reducing to 1 line)
  if (exactCount > 1.01 && exactCount <= 1.4) {
    return { 
      count, 
      exactCount, 
      category: 'near-single', 
      warning: true, 
      warningMessage: 'Consider reducing to 1 line' 
    };
  }
  
  if (count === 0) {
    return { count: 0, exactCount: 0, category: 'empty', warning: false, warningMessage: '' };
  } else if (count === 1) {
    return { count: 1, exactCount, category: 'single', warning: false, warningMessage: '' };
  } else if (count === 2) {
    return { count: 2, exactCount, category: 'double', warning: false, warningMessage: '' };
  } else {
    return { count, exactCount, category: 'overflow', warning: true, warningMessage: '' };
  }
}

