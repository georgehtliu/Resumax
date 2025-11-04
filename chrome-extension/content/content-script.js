/**
 * Content Script
 * 
 * Injected into job posting pages (LinkedIn, Indeed, etc.)
 * 
 * Responsibilities:
 * - Extract job descriptions from page DOM
 * - Detect job posting pages
 * - Inject UI elements for job extraction
 * - Communicate with background service worker
 */

// ============================================================================
// JOB DESCRIPTION EXTRACTION
// ============================================================================

/**
 * Extract job description from current page
 * Uses DOM selectors specific to major job sites
 */
function extractJobDescription() {
  const hostname = window.location.hostname;
  
  // LinkedIn job postings
  if (hostname.includes('linkedin.com')) {
    return extractFromLinkedIn();
  }
  
  // Indeed job postings
  if (hostname.includes('indeed.com')) {
    return extractFromIndeed();
  }
  
  // Glassdoor job postings
  if (hostname.includes('glassdoor.com')) {
    return extractFromGlassdoor();
  }
  
  // Generic extraction (fallback)
  return extractGeneric();
}

/**
 * Extract from LinkedIn job posting
 */
function extractFromLinkedIn() {
  // LinkedIn structure: job description is in specific containers
  const selectors = [
    '[data-job-id] .description__text',
    '.show-more-less-html__markup',
    '.jobs-description-content__text',
    '[class*="job-description"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.innerText.trim();
    }
  }
  
  return null;
}

/**
 * Extract from Indeed job posting
 */
function extractFromIndeed() {
  const selectors = [
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[data-testid="job-description"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.innerText.trim();
    }
  }
  
  return null;
}

/**
 * Extract from Glassdoor job posting
 */
function extractFromGlassdoor() {
  const selectors = [
    '[data-test="job-description"]',
    '.jobDescriptionContent',
    '.jobDescription'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.innerText.trim();
    }
  }
  
  return null;
}

/**
 * Generic extraction - uses candidate scoring for better accuracy
 * 
 * Strategy:
 * 1. Collect potential content elements (candidates)
 * 2. Score each candidate based on keywords, length, structure
 * 3. Sort by score and return best match
 * 4. Fallback to keyword-based paragraph extraction
 */
function extractGeneric() {
  // 1. Remove noise elements (navigation, ads, headers, footers)
  const excludeSelectors = [
    'nav', 'header', 'footer', 'aside',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
    '.ad', '.advertisement', '.sidebar', '.menu', '.navigation',
    'script', 'style', 'noscript', 'iframe',
    '[class*="cookie"]', '[class*="banner"]', '[id*="cookie"]',
    '[class*="header"]', '[class*="footer"]', '[class*="nav"]',
    '[id*="header"]', '[id*="footer"]', '[id*="nav"]',
    '[class*="skip"]', '[class*="skip-to"]', // Skip links
    '[aria-label*="navigation"]', '[aria-label*="menu"]',
    'button', 'a[href*="#"]', // Buttons and anchor links
  ];
  
  const excludeElements = new Set();
  excludeSelectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => excludeElements.add(el));
    } catch (e) {
      // Ignore invalid selectors
    }
  });
  
  // Helper function to check if element should be excluded
  function shouldExclude(el) {
    if (excludeElements.has(el)) return true;
    
    // Check element's class and id
    const classList = el.className || '';
    const id = el.id || '';
    const text = (el.textContent || '').toLowerCase().trim();
    
    // Exclude common navigation/header/footer patterns
    if (classList.toLowerCase().match(/(header|footer|nav|menu|banner|cookie|skip|sidebar)/) ||
        id.toLowerCase().match(/(header|footer|nav|menu|banner|cookie|skip|sidebar)/)) {
      return true;
    }
    
    // Exclude small text elements that are likely navigation
    if (text.length < 50 && (
      text.includes('skip') || 
      text.includes('cookie') || 
      text.includes('accept') || 
      text.includes('decline') ||
      text.includes('sign in') ||
      text.includes('search')
    )) {
      return true;
    }
    
    // Also exclude if parent is excluded
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      if (excludeElements.has(parent)) return true;
      parent = parent.parentElement;
    }
    return false;
  }
  
  // Helper function to clean text (remove navigation noise)
  function cleanText(text) {
    if (!text) return '';
    
    // Step 1: Remove multi-line cookie notices and navigation blocks (more aggressive)
    // Use . to match any character including newlines
    const blockPatterns = [
      // Cookie notices (handle all variations)
      /This site uses.*?cookies.*?for more information.*?(?:Decline|Accept|Privacy Notice)?/gis,
      /This site uses necessary cookies.*?(?:(?!At |Bring|Seeking|Work as).)*?(?:Decline|Accept)/gis,
      /Cookie.*?Policy.*?(?:Accept|Decline|Privacy)/gis,
      
      // Navigation blocks
      /^Skip to main content\s*/i,
      /English\s*Sign In\s*Search for Jobs\s*/gi,
      /Read More\s*Follow Us\s*/gi,
      
      // Footer content
      /Job Applicant Privacy Notice\s*/gi,
      /© \d{4}.*?Inc.*?rights reserved\.?\s*/gi,
      /Privacy Policy and Terms:.*/gi,
      /Click on this link.*/gi,
    ];
    
    let cleaned = text;
    blockPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Step 2: Split into lines and filter aggressively
    const lines = cleaned.split('\n')
      .map(line => line.trim())
      .filter((line, index, allLines) => {
        if (line.length === 0) return false;
        
        const lower = line.toLowerCase();
        
        // Filter out cookie notice lines (even if pattern didn't catch them)
        if (lower.includes('this site uses') && lower.includes('cookie')) return false;
        if (lower.includes('for more information') && lower.includes('cookie')) return false;
        if (lower === 'decline' || lower === 'accept cookies') return false;
        
        // Filter out navigation
        if (lower === 'skip to main content') return false;
        if (lower === 'english' || lower === 'sign in' || lower === 'search for jobs') return false;
        
        // Filter out page metadata
        if (lower.includes('page is loaded')) return false;
        if (line.match(/^\d{4}.*?Intern.*?\(.*?\).*?page is loaded/i)) return false;
        
        // Filter out metadata labels AND their values
        const metadataLabels = [
          'locations', 'time type', 'posted on', 'time left to apply',
          'job requisition id', 'date posted:', 'country:', 'location:',
          'position role type:', 'security clearance:', 'u.s. citizen',
          'end date:', 'posted today'
        ];
        
        // Check if this line is a metadata label
        if (metadataLabels.some(label => lower.startsWith(label) || lower === label)) {
          return false;
        }
        
        // Check if previous line was a metadata label - if so, this is likely the value
        if (index > 0) {
          const prevLine = allLines[index - 1].toLowerCase();
          if (metadataLabels.some(label => prevLine.startsWith(label) || prevLine === label)) {
            // This is a metadata value - filter it out
            // But allow if it looks like a job description (has "At" or company name)
            if (!lower.match(/^at\s+[a-z]+,/i) && !lower.match(/^[a-z]+\s+[a-z]+\s+[a-z]+/i)) {
              return false;
            }
          }
        }
        
        // Filter out standalone "Apply" buttons
        if (line === 'Apply' || line === 'APPLY') return false;
        
        // Filter out job title repeats (more flexible pattern)
        if (line.match(/^\d{4}.*?Intern.*?\(.*?\)/i) && line.length < 100) {
          return false;
        }
        
        // Filter out addresses (TX234: Richardson...)
        if (line.match(/^[A-Z]{2}\d+:/) && line.length < 100) return false;
        
        // Filter out short navigation items
        if (line.length < 20 && (
          lower.includes('skip') || 
          lower.includes('cookie') ||
          lower.includes('sign in') ||
          lower.includes('search')
        )) {
          return false;
        }
        
        return true;
      });
    
    // Step 3: Find the actual start of job description (more aggressive)
    const jobDescriptionStarters = [
      /^About Us:/i,
      /^About the Role:/i,
      /^About the Company:/i,
      /^What You Will Do:/i,
      /^Responsibilities:/i,
      /^Job Description:/i,
      /^Position Overview:/i,
      /^Overview:/i,
      /^Description:/i,
      /^Role:/i,
      /^At .+?, the foundation/i, // "At Company, the foundation..."
      /^At .+?, the/i, // "At Company, the..." (more flexible)
      /^Bring your talent/i,
      /^Seeking students/i,
      /^Work as a/i,
    ];
    
    let startIndex = 0;
    // First, try to find explicit section headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (jobDescriptionStarters.some(pattern => pattern.test(line))) {
        startIndex = i;
        break;
      }
    }
    
    // If no explicit header found, look for "At Company" pattern (very common)
    if (startIndex === 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^At [A-Z][a-z]+(?:,|\.|$)/i) && line.length > 50) {
          startIndex = i;
          break;
        }
      }
    }
    
    // If still not found, look for first substantial paragraph
    if (startIndex === 0 && lines.length > 10) {
      for (let i = 0; i < Math.min(30, lines.length); i++) {
        const line = lines[i];
        if (line.length > 100 && 
            !line.match(/^(This site|Skip|Cookie|English|Sign|Search|Apply|locations|time type)/i) &&
            !line.match(/^[A-Z]{2}\d+:/) && // Not an address
            !line.match(/^\d{4}.*?Intern.*?\(/i)) { // Not a job title
          startIndex = i;
          break;
        }
      }
    }
    
    // Step 4: Find where job description ends (footer content)
    const footerPatterns = [
      /^RTX is an Equal Opportunity/i,
      /^RTX is an aerospace/i,
      /^The salary range for this role/i,
      /^Hired applicants may be eligible/i,
      /^This position requires a security clearance/i,
      /^As part of our commitment/i,
      /^Clearance Information:/i,
      /^Additional Details:/i,
      /^What We Offer:/i,
      /^DCSA Consolidated Adjudication/i,
    ];
    
    let endIndex = lines.length;
    // Look in last 50 lines (not just 30) for footer content
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 50); i--) {
      if (footerPatterns.some(pattern => pattern.test(lines[i]))) {
        // Stop at the footer - don't include it
        endIndex = i;
        break;
      }
    }
    
    // Extract the relevant portion
    const relevantLines = lines.slice(startIndex, endIndex);
    
    // Step 5: Final cleanup - remove any remaining noise lines
    const finalLines = relevantLines.filter(line => {
      const lower = line.toLowerCase();
      
      // Remove very short lines that are likely noise (unless they're part of a list)
      if (line.length < 10 && !line.match(/^[•\-\d+\.]/)) {
        const noiseWords = ['apply', 'locations', 'time type', 'posted', 'decline', 'accept', 'english', 'sign', 'search'];
        if (noiseWords.some(word => lower.includes(word))) {
          return false;
        }
      }
      
      // Remove any remaining cookie/job title noise
      if (lower.includes('page is loaded') || 
          line.match(/^\d{4}.*?Intern.*?\(.*?\)$/i) ||
          line.match(/^[A-Z]{2}\d+:/)) {
        return false;
      }
      
      return true;
    });
    
    return finalLines.join('\n').trim();
  }
  
  // 2. Find main content candidates
  const candidates = [];
  const mainSelectors = [
    '[data-job-description]',
    '.job-description',
    '#job-description',
    '[class*="description"]',
    'section[aria-label*="description"]',
    '[class*="job-content"]',
    '[class*="job-details"]',
    '[class*="job-info"]',
    'main',
    'article',
    '[role="main"]',
    'section',
    'div'
  ];
  
  mainSelectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        if (shouldExclude(el)) return;
        
        const rawText = el.innerText.trim();
        // Only consider elements with reasonable length (300-15000 chars)
        if (rawText.length > 300 && rawText.length < 15000) {
          // Clean the text to remove navigation noise
          const cleanedText = cleanText(rawText);
          
          // Skip if cleaned text is too short (likely mostly noise)
          if (cleanedText.length < 300) return;
          
          const score = scoreJobDescription(cleanedText);
          candidates.push({
            element: el,
            text: cleanedText,
            length: cleanedText.length,
            score: score
          });
        }
      });
    } catch (e) {
      // Ignore invalid selectors
    }
  });
  
  // 3. Sort by score and return best match
  candidates.sort((a, b) => b.score - a.score);
  
  if (candidates.length > 0 && candidates[0].score > 20) {
    // Additional cleaning pass on the final result
    return cleanText(candidates[0].text);
  }
  
  // 4. Fallback: extract paragraphs with job keywords
  const jobKeywords = [
    'responsibilities', 'requirements', 'qualifications',
    'job description', 'about the role', 'what you\'ll do',
    'required skills', 'experience', 'education', 'salary',
    'benefits', 'location', 'remote', 'hybrid', 'full-time',
    'part-time', 'contract', 'permanent'
  ];
  
  const paragraphs = Array.from(document.querySelectorAll('p, li, div'))
    .filter(el => {
      if (shouldExclude(el)) return false;
      const text = el.innerText.trim().toLowerCase();
      return jobKeywords.some(keyword => text.includes(keyword)) &&
             el.innerText.trim().length > 100;
    })
    .map(el => el.innerText.trim())
    .filter((text, index, self) => {
      // Remove duplicates
      return self.indexOf(text) === index;
    });
  
  if (paragraphs.length > 0) {
    const combined = paragraphs.join('\n\n').substring(0, 5000);
    return cleanText(combined);
  }
  
  // 5. Try main content area (but exclude obvious navigation)
  const main = document.querySelector('main, article, [role="main"]');
  if (main) {
    // Try to find the actual content section, not the whole main
    const contentSections = main.querySelectorAll('section, div[class*="content"], div[class*="description"]');
    if (contentSections.length > 0) {
      for (const section of contentSections) {
        if (shouldExclude(section)) continue;
        const text = cleanText(section.innerText.trim());
        if (text.length > 500 && scoreJobDescription(text) > 20) {
          return text.substring(0, 5000);
        }
      }
    }
    
    // Fallback to main but clean it
    const mainText = main.innerText.trim();
    if (mainText.length > 500) {
      return cleanText(mainText).substring(0, 5000);
    }
  }
  
  // 6. Last resort: get body text but filter heavily
  const bodyText = document.body.innerText.trim();
  if (bodyText.length > 500) {
    // Try to extract just the middle section (skip first and last 20% which are usually nav/footer)
    const lines = bodyText.split('\n');
    const skipLines = Math.floor(lines.length * 0.2);
    const coreLines = lines.slice(skipLines, lines.length - skipLines);
    const coreText = coreLines.join('\n');
    return cleanText(coreText).substring(0, 5000);
  }
  
  return '';
}

/**
 * Score a text candidate based on how likely it is to be a job description
 * 
 * @param {string} text - The text to score
 * @returns {number} - Score (higher = more likely to be job description)
 */
function scoreJobDescription(text) {
  let score = 0;
  const lower = text.toLowerCase();
  
  // Job-related keywords that indicate job description content
  const jobKeywords = [
    'responsibilities', 'requirements', 'qualifications',
    'job description', 'about the role', 'what you\'ll do',
    'required skills', 'preferred skills', 'experience',
    'education', 'degree', 'salary', 'compensation',
    'benefits', 'location', 'remote', 'hybrid', 'full-time',
    'part-time', 'contract', 'permanent', 'employment',
    'apply', 'application', 'candidate', 'must have',
    'nice to have', 'we are looking for', 'you will'
  ];
  
  // 1. KEYWORD MATCHING (most important indicator)
  jobKeywords.forEach(keyword => {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = (text.match(regex) || []).length;
    score += matches * 5; // Each keyword occurrence = +5 points
  });
  
  // 2. LENGTH SCORING (ideal range for job descriptions)
  if (text.length >= 500 && text.length <= 5000) {
    score += 30; // Perfect length range
  } else if (text.length > 5000 && text.length <= 10000) {
    score += 10; // OK but might include extra content
  } else if (text.length > 10000) {
    score -= 20; // Too long = probably entire page content
  } else if (text.length < 500) {
    score -= 10; // Too short = probably not a full job description
  }
  
  // 3. STRUCTURE INDICATORS
  // Job descriptions often have bullet points or numbered lists
  if (text.includes('•') || text.includes('-') || text.match(/\d+\./)) {
    score += 10;
  }
  
  // Multiple paragraphs indicate structured content
  const paragraphBreaks = (text.match(/\n\n/g) || []).length;
  if (paragraphBreaks > 3) {
    score += 5;
  }
  
  // 4. PATTERN MATCHING
  // Look for common job description patterns
  if (lower.includes('years of experience') || lower.includes('years experience')) {
    score += 10;
  }
  
  if (lower.match(/\d+\+?\s*(years?|yrs?)\s+(of\s+)?experience/)) {
    score += 10;
  }
  
  // Degree requirements
  if (lower.match(/(bachelor|master|phd|degree|diploma)/)) {
    score += 5;
  }
  
  // Technology/skill mentions (common in tech job descriptions)
  const techKeywords = ['python', 'javascript', 'java', 'react', 'node', 'sql', 'aws', 'docker'];
  const techMatches = techKeywords.filter(keyword => lower.includes(keyword)).length;
  score += techMatches * 2; // Each tech keyword = +2 points
  
  return score;
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Listen for messages from background service worker or popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  switch (message.type) {
    case 'EXTRACT_JD':
      const jobDescription = extractJobDescription();
      sendResponse({
        success: !!jobDescription,
        jobDescription: jobDescription || '',
        url: window.location.href,
        title: document.title
      });
      break;
      
    case 'INJECT_UI':
      injectExtractionButton();
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true; // Keep message channel open for async
});

// ============================================================================
// UI INJECTION
// ============================================================================

/**
 * Inject extraction button into page
 */
function injectExtractionButton() {
  // Avoid duplicate injection
  if (document.getElementById('resume-optimizer-extract-btn')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'resume-optimizer-extract-btn';
  button.className = 'resume-optimizer-btn';
  button.textContent = '📄 Extract Job Description';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 12px 24px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  button.addEventListener('click', async () => {
    const jobDescription = extractJobDescription();
    
    if (!jobDescription) {
      alert('Could not extract job description from this page.');
      return;
    }
    
    // Send to background for processing
    chrome.runtime.sendMessage({
      type: 'EXTRACTED_JD',
      jobDescription: jobDescription,
      url: window.location.href,
      title: document.title
    }, (response) => {
      if (response && response.success) {
        button.textContent = '✓ Extracted!';
        button.style.background = '#2196F3';
        setTimeout(() => {
          button.remove();
        }, 2000);
      }
    });
  });
  
  document.body.appendChild(button);
}

// Auto-inject button on job posting pages
if (isJobPostingPage()) {
  injectExtractionButton();
}

/**
 * Detect if current page is a job posting
 */
function isJobPostingPage() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  return (
    hostname.includes('linkedin.com/jobs') ||
    hostname.includes('indeed.com/viewjob') ||
    hostname.includes('glassdoor.com/job-listing') ||
    pathname.includes('/job') ||
    pathname.includes('/career') ||
    document.title.toLowerCase().includes('job')
  );
}


