/**
 * Utility to estimate LaTeX line count for bullet points in Jake's Resume template
 * 
 * Jake's Resume typically uses:
 * - ~60-70 characters per line for bullet points
 * - Narrow column width
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

  // Average characters per line in Jake's Resume template (conservative estimate)
  // Adjust based on actual template testing if needed
  const CHARS_PER_LINE = 65;
  
  const lineCount = Math.ceil(text.length / CHARS_PER_LINE);
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

