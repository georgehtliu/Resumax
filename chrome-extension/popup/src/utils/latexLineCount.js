/**
 * Utility to estimate LaTeX line count for bullet points in Jake's Resume template
 * 
 * Jake's Resume typically uses:
 * - ~140-150 characters per line for bullet points with \small font
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

  // Updated to match actual resume capacity - bullets can be much longer
  // With \small font and adjusted margins, ~140-150 chars per line is realistic
  const CHARS_PER_LINE = 145;
  const effectiveLength = text.trim().length + 2;
  const lineCount = Math.max(1, Math.ceil(effectiveLength / CHARS_PER_LINE));
  // Don't cap at 3 - allow longer bullets to be estimated correctly
  return lineCount;
}

/**
 * Get line count category for styling
 * @param {string} text - The bullet point text
 * @returns {Object} { count: number, category: 'single' | 'double' | 'overflow', warning: boolean }
 */
export function getLineCountInfo(text) {
  const count = estimateLatexLines(text);
  
  if (count === 0) {
    return { count: 0, category: 'empty', warning: false };
  } else if (count === 1) {
    return { count: 1, category: 'single', warning: false };
  } else if (count === 2) {
    return { count: 2, category: 'double', warning: false };
  } else {
    return { count, category: 'overflow', warning: true };
  }
}

