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
 * Generic extraction - looks for large text blocks
 */
function extractGeneric() {
  // Look for common job description patterns
  const selectors = [
    '[data-job-description]',
    '.job-description',
    '#job-description',
    '[class*="description"]',
    'section[aria-label*="description"]',
    'article',
    'main section'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.innerText.trim();
      // Job descriptions are usually > 500 characters
      if (text.length > 500) {
        return text;
      }
    }
  }
  
  // Last resort: get body text
  return document.body.innerText.substring(0, 5000);
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


