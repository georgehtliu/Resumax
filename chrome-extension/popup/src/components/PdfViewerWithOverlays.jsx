import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import CommentPromptModal from './CommentPromptModal';
import './PdfViewerWithOverlays.css';

// Set up PDF.js worker
// The worker file is copied to popup-build/ during build
// Since the popup HTML is also in popup-build/, we can use a relative path
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // In Chrome extension context - use relative path since worker is in same directory as popup
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
} else {
  // Fallback for development or non-extension context
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
}

/**
 * Text Anchor - Represents a position in the PDF that survives re-renders
 */
export function createTextAnchor(pageNumber, text, bbox, textHash) {
  return {
    page: pageNumber,
    text: text,
    bbox: {
      x: bbox.x,      // PDF coordinates (0-1 normalized)
      y: bbox.y,      // PDF coordinates (0-1 normalized)
      w: bbox.w,      // width in PDF coordinates
      h: bbox.h       // height in PDF coordinates
    },
    textHash: textHash || hashText(text)
  };
}

function hashText(text) {
  // Simple hash for text matching
  return text.substring(0, 50).replace(/\s+/g, ' ').trim();
}

/**
 * Coordinate Mapper - Converts between PDF coordinates and screen coordinates
 * PDF coordinates are normalized (0-1) with origin at bottom-left
 * Screen coordinates are pixels with origin at top-left
 */
class CoordinateMapper {
  constructor(viewport, scale, canvasWidth, canvasHeight) {
    this.viewport = viewport;
    this.scale = scale;
    // Canvas may be scaled by devicePixelRatio, so use actual canvas dimensions
    this.canvasWidth = canvasWidth || viewport.width;
    this.canvasHeight = canvasHeight || viewport.height;
  }

  // Convert PDF normalized coordinates (0-1) to screen pixels
  // PDF: (0,0) is bottom-left, Y increases upward
  // Screen: (0,0) is top-left, Y increases downward
  pdfToScreen(pdfX, pdfY) {
    return {
      x: pdfX * this.canvasWidth,
      y: (1 - pdfY) * this.canvasHeight // Flip Y: PDF bottom-up to screen top-down
    };
  }

  // Convert screen pixels to PDF normalized coordinates
  screenToPdf(screenX, screenY) {
    return {
      x: screenX / this.canvasWidth,
      y: 1 - (screenY / this.canvasHeight)
    };
  }

  // Get bounding box in screen coordinates
  // bbox: { x, y, w, h } in PDF normalized coordinates (0-1)
  // x, y is bottom-left corner in PDF coordinates (y=0 is bottom, y=1 is top)
  // Returns: { x, y, width, height } in screen pixels (top-left origin)
  bboxToScreen(bbox) {
    // PDF normalized coords: (x, y) is bottom-left corner, (x+w, y+h) is top-right
    // In PDF: y=0 is bottom, y=1 is top
    // In screen: y=0 is top, y=height is bottom
    
    // Top-left corner in screen coords
    const topLeftX = bbox.x * this.canvasWidth;
    // y in PDF is bottom of box, so top in screen is: (1 - y - h) * height
    const topLeftY = (1 - bbox.y - bbox.h) * this.canvasHeight;
    
    // Bottom-right corner in screen coords
    const bottomRightX = (bbox.x + bbox.w) * this.canvasWidth;
    const bottomRightY = (1 - bbox.y) * this.canvasHeight;
    
    // Ensure positive dimensions
    const width = Math.abs(bottomRightX - topLeftX);
    const height = Math.abs(bottomRightY - topLeftY);
    
    return {
      x: topLeftX,
      y: topLeftY,
      width: width,
      height: height
    };
  }
}

const PdfViewerWithOverlays = forwardRef(({ 
  pdfBase64, 
  comments = [], // Array of { id, anchor, content, author, created_at, bulletId }
  onTextSelect,
  onCommentClick,
  onCommentAdd, // Callback when a comment is added: (comment, bulletId, anchor) => void
  bullets = [], // Array of { id, text, ... } - bullet points to match against
  highlightedBulletId = null,
  scale: initialScale = 1.0
}, ref) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const overlayRef = useRef(null);
  const svgRef = useRef(null);
  
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(initialScale);
  const [loading, setLoading] = useState(true);
  const [selectedText, setSelectedText] = useState(null);
  const selectedTextRef = useRef(null); // Ref to avoid triggering re-renders during selection
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [mappers, setMappers] = useState({}); // { pageNum: CoordinateMapper }
  const [textContentCache, setTextContentCache] = useState({}); // Cache text content per page
  const [viewportCache, setViewportCache] = useState({}); // Cache viewport per page at scale 1.0
  const [highlights, setHighlights] = useState([]); // Array of { id, anchor, color }
  const [selectedColor, setSelectedColor] = useState('#FFEB3B'); // Default yellow
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [showCommentPrompt, setShowCommentPrompt] = useState(false);
  const [commentPromptBullet, setCommentPromptBullet] = useState(null);
  const [commentPromptAnchor, setCommentPromptAnchor] = useState(null);
  const baseViewportRef = useRef(null); // Store current baseViewport to avoid closure issues
  const overlayUpdateTimerRef = useRef(null); // Debounce overlay updates
  const renderOverlaysRef = useRef(null); // Ref to renderOverlays function to avoid dependency issues
  const highlightsRef = useRef([]); // Store highlights in ref to avoid triggering canvas re-renders
  const selectedColorRef = useRef('#FFEB3B'); // Store selectedColor in ref
  const isHighlightModeRef = useRef(false); // Store isHighlightMode in ref

  // Load PDF
  useEffect(() => {
    if (!pdfBase64) return;

    const loadPdf = async () => {
      try {
        setLoading(true);
        const binary = atob(pdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [pdfBase64]);

  // Position text and overlay layers to match canvas position
  const positionLayersToMatchCanvas = useCallback(() => {
    if (!canvasRef.current || !textLayerRef.current || !overlayRef.current) return;
    
    const canvas = canvasRef.current;
    const textLayer = textLayerRef.current;
    const overlay = overlayRef.current;
    const container = canvas.parentElement; // pdf-canvas-container
    
    // Get canvas CSS dimensions (not DPR-scaled buffer size)
    const cssWidth = parseFloat(canvas.style.width);
    const cssHeight = parseFloat(canvas.style.height);
    
    if (!cssWidth || !cssHeight) return; // Canvas not ready yet
    
    // Get canvas position relative to container
    // getBoundingClientRect already accounts for scroll position
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate offset relative to container
    const offsetX = canvasRect.left - containerRect.left;
    const offsetY = canvasRect.top - containerRect.top;
    
    // Position and size text layer to exactly match canvas
    textLayer.style.width = `${cssWidth}px`;
    textLayer.style.height = `${cssHeight}px`;
    textLayer.style.left = `${offsetX}px`;
    textLayer.style.top = `${offsetY}px`;
    
    // Position and size overlay layer to exactly match canvas
    overlay.style.width = `${cssWidth}px`;
    overlay.style.height = `${cssHeight}px`;
    overlay.style.left = `${offsetX}px`;
    overlay.style.top = `${offsetY}px`;
  }, []);

  // Setup text selection handler
  const setupTextSelection = useCallback((textContent, viewport, baseViewportParam) => {
    if (!baseViewportParam) return () => {}; // Return empty cleanup if no baseViewport
    
    // Store in ref to avoid closure issues
    baseViewportRef.current = baseViewportParam;
    
    // Store viewport for coordinate calculations
    const currentViewport = viewport;
    
    const handleSelection = () => {
      const baseViewport = baseViewportRef.current;
      if (!baseViewport) return;
      const selection = window.getSelection();
      if (selection.rangeCount === 0) {
        if (isHighlightMode) {
          selectedTextRef.current = null;
          // Don't update state here - only update ref to avoid re-renders during selection
        }
        return;
      }

      // Only process selection if in highlight mode
      if (!isHighlightMode) {
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedTextStr = range.toString().trim();
      
      if (!selectedTextStr || selectedTextStr.length < 1) {
        selectedTextRef.current = null;
        // Don't update state here - only update ref to avoid re-renders during selection
        return;
      }

      // Get the actual DOM elements in the selection
      const selectedElements = [];
      if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
        selectedElements.push(range.commonAncestorContainer.parentElement);
      } else {
        const walker = document.createTreeWalker(
          range.commonAncestorContainer,
          NodeFilter.SHOW_ELEMENT,
          null
        );
        let node;
        while (node = walker.nextNode()) {
          if (range.intersectsNode(node) && node.dataset.bboxX) {
            selectedElements.push(node);
          }
        }
      }

      if (selectedElements.length === 0) {
        // Fallback: find matching text items
        const matchingItems = [];
        const searchText = selectedTextStr.substring(0, 50).trim();
        
        for (let i = 0; i < textContent.items.length; i++) {
          const item = textContent.items[i];
          if (item.str && (
            item.str.includes(searchText.substring(0, 20)) || 
            searchText.substring(0, 20).includes(item.str)
          )) {
            matchingItems.push(item);
          }
        }

        if (matchingItems.length > 0 && baseViewport) {
          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          
          matchingItems.forEach(item => {
            if (!baseViewport || !baseViewport.transform) return;
            const tx = pdfjsLib.Util.transform(baseViewport.transform, item.transform);
            const x = tx[4];
            const y = tx[5];
            const w = item.width || 0;
            const h = item.height || 12;
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x + w);
            minY = Math.min(minY, y - h);
            maxY = Math.max(maxY, y);
          });

          const bbox = {
            x: minX / baseViewport.width,
            y: (baseViewport.height - maxY) / baseViewport.height,
            w: (maxX - minX) / baseViewport.width,
            h: (maxY - minY) / baseViewport.height
          };

        const anchor = createTextAnchor(currentPage, selectedTextStr, bbox);
        selectedTextRef.current = anchor;
        // Don't trigger render here - let the throttled handler do it
        return;
        }
        return;
      }

      // Calculate bounding box from selected DOM elements
      // The dataset values are stored in base viewport coordinates (scale 1.0)
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      selectedElements.forEach(el => {
        if (el.dataset.bboxX !== undefined) {
          const x = parseFloat(el.dataset.bboxX);
          const y = parseFloat(el.dataset.bboxY);
          const w = parseFloat(el.dataset.bboxW);
          const h = parseFloat(el.dataset.bboxH);
          
          // These are in base viewport coordinates (PDF coordinate system: origin at bottom-left)
          // y is the baseline (bottom of text), so top is y - h
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x + w);
          minY = Math.min(minY, y - h); // Top of text box
          maxY = Math.max(maxY, y); // Bottom of text box (baseline)
        }
      });

      if (minX !== Infinity && baseViewport) {
        // Use the exact same calculation as the fallback method
        // minY is the top (y - h), maxY is the bottom (y, the baseline)
        // Normalize to PDF coordinates (0-1) where (x, y) is bottom-left
        const bboxPdf = {
          x: minX / baseViewport.width,
          y: (baseViewport.height - maxY) / baseViewport.height, // Same as fallback
          w: (maxX - minX) / baseViewport.width,
          h: (maxY - minY) / baseViewport.height
        };

        const anchor = createTextAnchor(currentPage, selectedTextStr, bboxPdf);
        selectedTextRef.current = anchor;
        // Don't trigger render here - let the throttled handler do it
      }
    };

    // Use a debounced handler - don't render overlays during selection, only after it ends
    let selectionEndTimer;
    
    const debouncedHandler = () => {
      // Handle selection calculation (cheap operation, no rendering)
      handleSelection();
      
      // DO NOT render overlays during active selection - this causes flickering
      // Only render after selection stabilizes
      
      // Update state and render overlay preview only after selection ends
      // This prevents re-renders during dragging which cause flickering
      clearTimeout(selectionEndTimer);
      selectionEndTimer = setTimeout(() => {
        // Update state only after selection stabilizes (not during dragging)
        setSelectedText(selectedTextRef.current);
        // Render overlay preview ONLY after selection ends
        if (renderOverlaysRef.current) {
          requestAnimationFrame(() => {
            renderOverlaysRef.current();
          });
        }
      }, 300); // Wait 300ms after user stops dragging/selecting before updating
    };

    document.addEventListener('selectionchange', debouncedHandler);
    return () => {
      document.removeEventListener('selectionchange', debouncedHandler);
      clearTimeout(selectionEndTimer);
    };
  }, [currentPage, isHighlightMode]); // Removed renderOverlays from dependencies

  // Render text layer for text selection
  const renderTextLayer = useCallback(async (page, viewport, textContent, baseViewportParam) => {
    if (!textLayerRef.current || !canvasRef.current || !baseViewportParam) return;

    const baseViewport = baseViewportParam;
    const textLayer = textLayerRef.current;
    const canvas = canvasRef.current;
    textLayer.innerHTML = '';
    
    // Don't set width/height here - let positionLayersToMatchCanvas handle it
    textLayer.style.pointerEvents = 'auto'; // Always enable for text selection

    // Create text spans for each text item
    // Use CSS dimensions (viewport) not DPR-scaled buffer dimensions
    // The text layer matches the CSS size of the canvas
    if (!baseViewport || !baseViewport.width) return;
    const viewportScaleRatio = viewport.width / baseViewport.width;
    
    for (let i = 0; i < textContent.items.length; i++) {
      const item = textContent.items[i];
      if (!baseViewport || !baseViewport.transform) continue;
      const tx = pdfjsLib.Util.transform(baseViewport.transform, item.transform);
      const x = tx[4];
      const y = tx[5];
      const width = item.width;
      const height = item.height;

      // Scale to current viewport (CSS dimensions, not DPR-scaled)
      const scaledX = x * viewportScaleRatio;
      // PDF origin is bottom-left; CSS is top-left
      const scaledTop = (baseViewport.height - y) * viewportScaleRatio - height * viewportScaleRatio;
      const scaledHeight = height * viewportScaleRatio;
      const scaledWidth = width * viewportScaleRatio;
      
      // Calculate position and size
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.left = `${scaledX}px`;
      div.style.top = `${scaledTop}px`;
      div.style.fontSize = `${scaledHeight}px`;
      div.style.width = `${scaledWidth}px`;
      div.style.fontFamily = item.fontName;
      div.textContent = item.str;
      div.style.color = 'rgba(0, 0, 0, 0)'; // Transparent but selectable
      div.style.cursor = 'text';
      div.style.userSelect = 'text';
      div.style.webkitUserSelect = 'text';
      div.style.mozUserSelect = 'text';
      div.style.msUserSelect = 'text';
      div.style.whiteSpace = 'nowrap';
      div.style.pointerEvents = 'auto'; // Always enable for text selection
      div.style.lineHeight = '1';
      div.style.zIndex = '10';
      
      // Store bounding box data in base scale
      div.dataset.bboxX = x;
      div.dataset.bboxY = y;
      div.dataset.bboxW = width;
      div.dataset.bboxH = height;
      
      textLayer.appendChild(div);
    }

    // Setup text selection handler with base viewport for normalization
    // Re-setup when highlight mode changes
    if (baseViewportParam) {
      setupTextSelection(textContent, viewport, baseViewportParam);
    }
  }, [setupTextSelection, isHighlightMode]);

  // Match selected text to a bullet point using text similarity
  const matchSelectedTextToBullet = useCallback((selectedText) => {
    if (!selectedText || !bullets || bullets.length === 0) return null;
    
    const selectedTextNormalized = selectedText.text.trim().toLowerCase();
    
    // Find the best matching bullet point
    let bestMatch = null;
    let bestScore = 0;
    
    for (const bullet of bullets) {
      const bulletText = (bullet.text || '').trim().toLowerCase();
      
      // Exact match
      if (selectedTextNormalized === bulletText) {
        return bullet;
      }
      
      // Check if selected text is contained in bullet text (or vice versa)
      if (bulletText.includes(selectedTextNormalized) || selectedTextNormalized.includes(bulletText)) {
        const score = Math.min(selectedTextNormalized.length, bulletText.length) / Math.max(selectedTextNormalized.length, bulletText.length);
        if (score > bestScore && score > 0.7) { // Require at least 70% similarity
          bestScore = score;
          bestMatch = bullet;
        }
      }
      
      // Check word overlap (if texts are similar length)
      const selectedWords = selectedTextNormalized.split(/\s+/);
      const bulletWords = bulletText.split(/\s+/);
      const overlap = selectedWords.filter(word => bulletWords.includes(word)).length;
      const totalWords = Math.max(selectedWords.length, bulletWords.length);
      const wordScore = totalWords > 0 ? overlap / totalWords : 0;
      
      if (wordScore > bestScore && wordScore > 0.6) { // Require at least 60% word overlap
        bestScore = wordScore;
        bestMatch = bullet;
      }
    }
    
    return bestMatch;
  }, [bullets]);

  // Add highlight from selected text
  const addHighlight = useCallback(() => {
    const currentSelected = selectedTextRef.current;
    if (!currentSelected) return;
    
    // Try to match selected text to a bullet point
    const matchedBullet = matchSelectedTextToBullet(currentSelected);
    
    if (matchedBullet && onCommentAdd) {
      // Show comment prompt for matched bullet
      setCommentPromptBullet(matchedBullet);
      setCommentPromptAnchor(currentSelected);
      setShowCommentPrompt(true);
    } else {
      // Just add highlight without comment prompt
      const newHighlight = {
        id: `highlight-${Date.now()}-${Math.random()}`,
        anchor: currentSelected,
        color: selectedColorRef.current // Use ref instead of state
      };
      
      // Update ref first (immediate, no re-render)
      highlightsRef.current = [...highlightsRef.current, newHighlight];
      
      // Sync to state (triggers re-render only for UI that needs it, but doesn't trigger canvas re-render)
      setHighlights(highlightsRef.current);
      
      // Trigger overlay update
      if (renderOverlaysRef.current) {
        requestAnimationFrame(() => {
          renderOverlaysRef.current();
        });
      }
    }
    
    selectedTextRef.current = null;
    setSelectedText(null);
    window.getSelection().removeAllRanges();
  }, [matchSelectedTextToBullet, onCommentAdd]);

  // Handle comment save from prompt
  const handleCommentSave = useCallback((commentText) => {
    if (!commentPromptBullet || !commentPromptAnchor || !onCommentAdd) return;
    
    onCommentAdd(commentText, commentPromptBullet.id, commentPromptAnchor);
    
    // Also add highlight
    const newHighlight = {
      id: `highlight-${Date.now()}-${Math.random()}`,
      anchor: commentPromptAnchor,
      color: selectedColorRef.current // Use ref
    };
    
    // Update ref first
    highlightsRef.current = [...highlightsRef.current, newHighlight];
    
    // Sync to state
    setHighlights(highlightsRef.current);
    
    // Trigger overlay update
    if (renderOverlaysRef.current) {
      requestAnimationFrame(() => {
        renderOverlaysRef.current();
      });
    }
    
    // Close prompt
    setShowCommentPrompt(false);
    setCommentPromptBullet(null);
    setCommentPromptAnchor(null);
  }, [commentPromptBullet, commentPromptAnchor, onCommentAdd]);

  const handleCommentCancel = useCallback(() => {
    setShowCommentPrompt(false);
    setCommentPromptBullet(null);
    setCommentPromptAnchor(null);
  }, []);

  // Render comment overlays and connectors
  const renderOverlays = useCallback(() => {
    if (!overlayRef.current || !svgRef.current || !mappers[currentPage] || !canvasRef.current || !textLayerRef.current) return;

    // Don't reposition here - it's done by the effects that call this function

    const mapper = mappers[currentPage];
    const overlay = overlayRef.current;
    const currentSelectedText = selectedTextRef.current; // Use ref instead of state to avoid re-renders
    const currentHighlights = highlightsRef.current; // Use ref instead of state
    const currentSelectedColor = selectedColorRef.current; // Use ref
    const currentIsHighlightMode = isHighlightModeRef.current; // Use ref
    
    // Store ref to this function so it can be called from selection handler (avoid circular dependency)
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    
    // Clear previous overlays
    overlay.innerHTML = '';
    svg.innerHTML = '';

    // Get container for positioning (overlay positioning is handled by positionLayersToMatchCanvas)
    const container = canvas.parentElement;

    // Render user highlights - use ref instead of state
    const pageHighlights = currentHighlights.filter(h => h.anchor?.page === currentPage);
    pageHighlights.forEach(highlight => {
      const anchor = highlight.anchor;
      if (!anchor || !anchor.bbox) return;

      const screenBbox = mapper.bboxToScreen(anchor.bbox);
      const highlightDiv = document.createElement('div');
      highlightDiv.className = 'user-highlight';
      highlightDiv.style.position = 'absolute';
      highlightDiv.style.left = `${screenBbox.x}px`;
      highlightDiv.style.top = `${screenBbox.y}px`;
      highlightDiv.style.width = `${screenBbox.width}px`;
      highlightDiv.style.height = `${screenBbox.height}px`;
      highlightDiv.style.backgroundColor = highlight.color;
      highlightDiv.style.opacity = '0.3';
      highlightDiv.style.pointerEvents = 'none';
      highlightDiv.dataset.highlightId = highlight.id;
      
      overlay.appendChild(highlightDiv);
    });

    // Render selected text preview (if in highlight mode)
    // Use the same logic as text selection - calculate bounding box from selected DOM elements
    // This matches exactly what the browser highlights, rather than using range.getBoundingClientRect()
    // which can return incorrect dimensions for wrapped text
    if (currentIsHighlightMode && currentSelectedText && currentSelectedText.page === currentPage) {
      // Get the current selection and calculate bounding box from selected DOM elements
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textLayer = textLayerRef.current;
        
        if (textLayer) {
          try {
            // Get the actual DOM elements in the selection (same as text selection logic)
            const selectedElements = [];
            if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
              selectedElements.push(range.commonAncestorContainer.parentElement);
            } else {
              const walker = document.createTreeWalker(
                range.commonAncestorContainer,
                NodeFilter.SHOW_ELEMENT,
                null
              );
              let node;
              while (node = walker.nextNode()) {
                if (range.intersectsNode(node) && node.dataset.bboxX) {
                  selectedElements.push(node);
                }
              }
            }
            
            if (selectedElements.length > 0) {
              const textLayerRect = textLayer.getBoundingClientRect();
              
              // Calculate bounding box from actual DOM element positions
              let minX = Infinity, maxX = -Infinity;
              let minY = Infinity, maxY = -Infinity;
              
              selectedElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                // Convert to coordinates relative to text layer (which matches overlay)
                const x = rect.left - textLayerRect.left;
                const y = rect.top - textLayerRect.top;
                
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x + rect.width);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y + rect.height);
              });
              
              if (minX !== Infinity) {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'highlight-preview';
                previewDiv.style.position = 'absolute';
                previewDiv.style.left = `${minX}px`;
                previewDiv.style.top = `${minY}px`;
                previewDiv.style.width = `${maxX - minX}px`;
                previewDiv.style.height = `${maxY - minY}px`;
                previewDiv.style.backgroundColor = currentSelectedColor;
                previewDiv.style.opacity = '0.3';
                previewDiv.style.pointerEvents = 'none';
                previewDiv.style.border = `1px dashed ${currentSelectedColor}`;
                
                overlay.appendChild(previewDiv);
              }
            }
          } catch (e) {
            // Fallback: use coordinate conversion if DOM calculation fails
            const screenBbox = mapper.bboxToScreen(currentSelectedText.bbox);
            const previewDiv = document.createElement('div');
            previewDiv.className = 'highlight-preview';
            previewDiv.style.position = 'absolute';
            previewDiv.style.left = `${screenBbox.x}px`;
            previewDiv.style.top = `${screenBbox.y}px`;
            previewDiv.style.width = `${screenBbox.width}px`;
            previewDiv.style.height = `${screenBbox.height}px`;
            previewDiv.style.backgroundColor = currentSelectedColor;
            previewDiv.style.opacity = '0.3';
            previewDiv.style.pointerEvents = 'none';
            previewDiv.style.border = `1px dashed ${currentSelectedColor}`;
            
            overlay.appendChild(previewDiv);
          }
        }
      }
    }

    // Get comments for current page
    const pageComments = comments.filter(c => c.anchor?.page === currentPage);
    
    pageComments.forEach(comment => {
      const anchor = comment.anchor;
      if (!anchor || !anchor.bbox) return;

      // Convert PDF coordinates to screen coordinates
      // The mapper uses canvas dimensions, so coordinates are already relative to canvas
      const screenBbox = mapper.bboxToScreen(anchor.bbox);
      const isHovered = hoveredCommentId === comment.id;
      const isHighlighted = highlightedBulletId === comment.bulletId;

      // Create highlight overlay - overlay is positioned to match canvas, so use direct coordinates
      const highlight = document.createElement('div');
      highlight.className = `comment-highlight ${isHovered ? 'hovered' : ''} ${isHighlighted ? 'highlighted' : ''}`;
      highlight.style.position = 'absolute';
      highlight.style.left = `${screenBbox.x}px`;
      highlight.style.top = `${screenBbox.y}px`;
      highlight.style.width = `${screenBbox.width}px`;
      highlight.style.height = `${screenBbox.height}px`;
      highlight.style.pointerEvents = 'none';
      highlight.dataset.commentId = comment.id;
      
      overlay.appendChild(highlight);

      // Create SVG connector line to sidebar (if sidebar exists and is hovered)
      const sidebar = document.querySelector('.comments-side-panel');
      if (sidebar && (isHovered || isHighlighted)) {
        const sidebarRect = sidebar.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const startX = canvasRect.left - containerRect.left + screenBbox.x + screenBbox.width;
        const startY = canvasRect.top - containerRect.top + screenBbox.y + screenBbox.height / 2;
        const endX = sidebarRect.left - containerRect.left;
        const endY = startY; // Horizontal line for simplicity

        // Create curved SVG path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const midX = (startX + endX) / 2;
        path.setAttribute('d', `M ${startX} ${startY} Q ${midX} ${startY - 20} ${endX} ${endY}`);
        path.setAttribute('stroke', '#f59e0b');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.6');
        path.setAttribute('marker-end', 'url(#arrowhead)');
        
        svg.appendChild(path);
      }
    });

    // Add arrowhead marker definition if not already present
    if (!svg.querySelector('#arrowhead')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', 'arrowhead');
      marker.setAttribute('markerWidth', '10');
      marker.setAttribute('markerHeight', '10');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '3');
      marker.setAttribute('orient', 'auto');
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 3, 0 6');
      polygon.setAttribute('fill', '#f59e0b');
      marker.appendChild(polygon);
      defs.appendChild(marker);
      svg.appendChild(defs);
    }
    
    // Store ref to this function for use in selection handler
    renderOverlaysRef.current = renderOverlays;
  }, [comments, hoveredCommentId, mappers, currentPage, highlightedBulletId]); 
  // REMOVED: highlights, selectedColor, isHighlightMode - these are in refs now and don't trigger re-renders

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancelled = false;
    let renderTask = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;
        
        // Render PDF page to canvas first
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        // Set CSS size to logical viewport
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        // Set actual buffer scaled by device pixel ratio for sharpness
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        // Cancel any previous render task
        if (renderTask) {
          renderTask.cancel();
        }

        // Start new render task
        renderTask = page.render(renderContext);
        await renderTask.promise;
        
        if (cancelled) return;

        // Cache base viewport (scale 1.0) for coordinate normalization
        if (!viewportCache[currentPage]) {
          const baseViewport = page.getViewport({ scale: 1.0 });
          setViewportCache(prev => ({ ...prev, [currentPage]: baseViewport }));
        }
        
        // Store mapper for coordinate conversion
        // Use CSS dimensions (viewport.width/height) not DPR-scaled buffer dimensions
        // The overlay layer matches the CSS size of the canvas
        const mapper = new CoordinateMapper(viewport, scale, viewport.width, viewport.height);
        setMappers(prev => ({ ...prev, [currentPage]: mapper }));

        // Cache text content for this page (only once, at scale 1.0)
        if (!textContentCache[currentPage]) {
          const textContent = await page.getTextContent();
          setTextContentCache(prev => ({ ...prev, [currentPage]: textContent }));
        }

        // Render text layer for text selection (always render, but only enable selection in highlight mode)
        const baseViewport = viewportCache[currentPage] || page.getViewport({ scale: 1.0 });
        await renderTextLayer(page, viewport, textContentCache[currentPage] || await page.getTextContent(), baseViewport);
        
        // Position text and overlay layers to match canvas (after text layer is rendered)
        if (!cancelled) {
          requestAnimationFrame(() => {
            if (!cancelled) {
              positionLayersToMatchCanvas();
              renderOverlays();
            }
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error rendering page:', error);
        }
      }
    };

    renderPage();

    // Cleanup: cancel render if component unmounts or dependencies change
    return () => {
      cancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale, renderTextLayer, positionLayersToMatchCanvas, viewportCache, textContentCache]); 
  // REMOVED: renderOverlays, isHighlightMode - canvas doesn't care about these, overlays render separately

  // REMOVED: Text layer re-render effect - text layer doesn't need to re-render when highlight mode changes
  // Text layer is always rendered and selection is controlled via CSS/pointer-events, not re-rendering

  // Re-render overlays when comments, hover state change (highlights, selectedColor, isHighlightMode are in refs)
  useEffect(() => {
    if (mappers[currentPage] && renderOverlaysRef.current) {
      // Clear any pending update
      if (overlayUpdateTimerRef.current) {
        clearTimeout(overlayUpdateTimerRef.current);
      }
      overlayUpdateTimerRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          // Only render overlays, positioning is handled separately
          if (renderOverlaysRef.current) {
            renderOverlaysRef.current();
          }
        });
      }, 50); // Debounce overlay updates
    }
  }, [comments, hoveredCommentId, currentPage, highlightedBulletId, mappers]); 
  // REMOVED: highlights, selectedColor, isHighlightMode, positionLayersToMatchCanvas, renderOverlays
  
  // Update overlay preview when selectedText state changes (for UI, but selection is handled via ref)
  // This effect is mainly for when selection is finalized, not during dragging
  useEffect(() => {
    if (mappers[currentPage] && isHighlightModeRef.current && renderOverlaysRef.current) {
      // Sync ref with state (when state is updated from outside, like clearing selection)
      selectedTextRef.current = selectedText;
      requestAnimationFrame(() => {
        if (renderOverlaysRef.current) {
          renderOverlaysRef.current();
        }
      });
    }
  }, [selectedText, mappers, currentPage]);

  // Reposition layers when window resizes
  useEffect(() => {
    const handleResize = () => {
      positionLayersToMatchCanvas();
      if (mappers[currentPage] && renderOverlaysRef.current) {
        requestAnimationFrame(() => {
          if (renderOverlaysRef.current) {
            renderOverlaysRef.current();
          }
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [positionLayersToMatchCanvas, mappers, currentPage]);

  // Sync refs with state (for external updates, like props changing)
  useEffect(() => {
    highlightsRef.current = highlights;
    // Trigger overlay update when highlights change from outside
    if (renderOverlaysRef.current) {
      requestAnimationFrame(() => {
        if (renderOverlaysRef.current) {
          renderOverlaysRef.current();
        }
      });
    }
  }, [highlights]);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
    // Trigger overlay update when color changes
    if (renderOverlaysRef.current) {
      requestAnimationFrame(() => {
        if (renderOverlaysRef.current) {
          renderOverlaysRef.current();
        }
      });
    }
  }, [selectedColor]);

  useEffect(() => {
    isHighlightModeRef.current = isHighlightMode;
    // Trigger overlay update when highlight mode changes
    if (renderOverlaysRef.current) {
      requestAnimationFrame(() => {
        if (renderOverlaysRef.current) {
          renderOverlaysRef.current();
        }
      });
    }
  }, [isHighlightMode]);

  // Scroll to anchor
  const scrollToAnchor = useCallback((anchor) => {
    if (!anchor) return;
    
    if (anchor.page !== currentPage) {
      setCurrentPage(anchor.page);
      // Wait for page to render, then scroll
      setTimeout(() => {
        const mapper = mappers[anchor.page];
        if (mapper && containerRef.current) {
          const screenBbox = mapper.bboxToScreen(anchor.bbox);
          containerRef.current.scrollTo({
            top: screenBbox.y - 100,
            behavior: 'smooth'
          });
        }
      }, 200);
    } else {
      const mapper = mappers[currentPage];
      if (mapper && containerRef.current) {
        const screenBbox = mapper.bboxToScreen(anchor.bbox);
        containerRef.current.scrollTo({
          top: screenBbox.y - 100,
          behavior: 'smooth'
        });
      }
    }
  }, [currentPage, mappers]);

  // Find text position in PDF for a given bullet text
  const findTextPosition = useCallback(async (bulletText, pageNum = null) => {
    if (!pdfDoc) return null;

    const pagesToSearch = pageNum ? [pageNum] : Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
    const searchText = bulletText.trim();
    const searchTextLower = searchText.toLowerCase();

    for (const pageNum of pagesToSearch) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = textContentCache[pageNum] || await page.getTextContent();
      
      if (!textContentCache[pageNum]) {
        setTextContentCache(prev => ({ ...prev, [pageNum]: textContent }));
      }

      // Build full text and find exact match
      const fullText = textContent.items.map(item => item.str || '').join(' ');
      const fullTextLower = fullText.toLowerCase();
      
      if (!fullTextLower.includes(searchTextLower)) continue;
      
      // Find the starting position of the search text
      const searchIndex = fullTextLower.indexOf(searchTextLower);
      if (searchIndex === -1) continue;
      
      // Find which items contain the start and end of our search text
      let charCount = 0;
      let startItemIndex = -1;
      let endItemIndex = -1;
      
      for (let i = 0; i < textContent.items.length; i++) {
        const item = textContent.items[i];
        const itemText = item.str || '';
        const itemStart = charCount;
        const itemEnd = charCount + itemText.length;
        
        if (startItemIndex === -1 && searchIndex >= itemStart && searchIndex < itemEnd) {
          startItemIndex = i;
        }
        
        if (startItemIndex !== -1 && searchIndex + searchText.length <= itemEnd) {
          endItemIndex = i;
          break;
        }
        
        charCount += itemText.length;
        // Add space between items (except last)
        if (i < textContent.items.length - 1) {
          charCount += 1;
        }
      }
      
      if (startItemIndex === -1 || endItemIndex === -1) continue;
      
      // Get the exact items that contain the matching text
      const matchingItems = textContent.items.slice(startItemIndex, endItemIndex + 1);
      
      if (matchingItems.length === 0) continue;
      
      // Use the same coordinate calculation as the text selection handler
      const baseViewport = page.getViewport({ scale: 1.0 });
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      matchingItems.forEach(item => {
        // Use PDF.js transform to get absolute coordinates - SAME AS TEXT SELECTION
        const tx = pdfjsLib.Util.transform(baseViewport.transform, item.transform);
        const x = tx[4];
        const y = tx[5];
        const w = item.width || 0;
        const h = item.height || 12;
        
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x + w);
        minY = Math.min(minY, y - h);
        maxY = Math.max(maxY, y);
      });

      // Normalize to PDF coordinates (0-1) - SAME AS TEXT SELECTION
      const bbox = {
        x: minX / baseViewport.width,
        y: (baseViewport.height - maxY) / baseViewport.height,
        w: (maxX - minX) / baseViewport.width,
        h: (maxY - minY) / baseViewport.height
      };

      return createTextAnchor(pageNum, bulletText, bbox);
    }

    return null;
  }, [pdfDoc, textContentCache]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    setHoveredComment: (commentId) => {
      setHoveredCommentId(commentId);
    },
    scrollToAnchor: (anchor) => {
      scrollToAnchor(anchor);
    },
    findTextPosition: (bulletText, pageNum) => {
      return findTextPosition(bulletText, pageNum);
    }
  }), [scrollToAnchor, findTextPosition]);


  if (loading) {
    return <div className="pdf-viewer-loading">Loading PDF...</div>;
  }

  if (!pdfDoc) {
    return <div className="pdf-viewer-error">Failed to load PDF</div>;
  }

  const highlightColors = [
    { name: 'Yellow', value: '#FFEB3B' },
    { name: 'Green', value: '#4CAF50' },
    { name: 'Blue', value: '#2196F3' },
    { name: 'Pink', value: '#E91E63' },
    { name: 'Orange', value: '#FF9800' },
    { name: 'Purple', value: '#9C27B0' }
  ];

  return (
    <div className="pdf-viewer-with-overlays" ref={containerRef}>
      {/* Controls */}
      <div className="pdf-viewer-controls">
        <button 
          className="pdf-control-btn"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          ← Previous
        </button>
        <span className="pdf-page-info">Page {currentPage} of {pdfDoc.numPages}</span>
        <button 
          className="pdf-control-btn"
          onClick={() => setCurrentPage(Math.min(pdfDoc.numPages, currentPage + 1))}
          disabled={currentPage === pdfDoc.numPages}
        >
          Next →
        </button>
        <button 
          className="pdf-control-btn"
          onClick={() => {
            const newScale = Math.max(0.5, scale - 0.25);
            setScale(newScale);
          }}
        >
          Zoom Out ({Math.round(scale * 100)}%)
        </button>
        <button 
          className="pdf-control-btn"
          onClick={() => {
            const newScale = Math.min(3, scale + 0.25);
            setScale(newScale);
          }}
        >
          Zoom In ({Math.round(scale * 100)}%)
        </button>
        <button 
          className="pdf-control-btn"
          onClick={() => setScale(1.0)}
        >
          Reset (100%)
        </button>
        
        {/* Highlight Tool */}
        <div className="highlight-tool" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px', paddingLeft: '16px', borderLeft: '1px solid #d1d5db' }}>
          <button
            className={`pdf-control-btn ${isHighlightMode ? 'active' : ''}`}
            onClick={() => {
              const newMode = !isHighlightMode;
              setIsHighlightMode(newMode);
              isHighlightModeRef.current = newMode;
              // Trigger overlay update
              if (renderOverlaysRef.current) {
                requestAnimationFrame(() => {
                  if (renderOverlaysRef.current) {
                    renderOverlaysRef.current();
                  }
                });
              }
            }}
            style={isHighlightMode ? { backgroundColor: '#3b82f6', color: 'white' } : {}}
          >
            {isHighlightMode ? '✓ Highlighting' : 'Highlight'}
          </button>
          
          {isHighlightMode && (
            <>
              <div className="color-picker" style={{ display: 'flex', gap: '4px' }}>
                {highlightColors.map(color => (
                  <button
                    key={color.value}
                    className="color-btn"
                    onClick={() => {
                      setSelectedColor(color.value);
                      selectedColorRef.current = color.value;
                      // Trigger overlay update
                      if (renderOverlaysRef.current) {
                        requestAnimationFrame(() => {
                          if (renderOverlaysRef.current) {
                            renderOverlaysRef.current();
                          }
                        });
                      }
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: color.value,
                      border: selectedColor === color.value ? '2px solid #000' : '1px solid #ccc',
                      cursor: 'pointer'
                    }}
                    title={color.name}
                  />
                ))}
              </div>
              
              {selectedText && (
                <button
                  className="pdf-control-btn"
                  onClick={addHighlight}
                  style={{ backgroundColor: '#10b981', color: 'white' }}
                >
                  Add Highlight
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* PDF Canvas Container */}
      <div className="pdf-canvas-container">
        <canvas ref={canvasRef} className="pdf-canvas" />
        
        {/* Text Layer for Selection */}
        <div 
          ref={textLayerRef} 
          className="pdf-text-layer"
        />
        
        {/* Overlay Layer for Highlights */}
        <div 
          ref={overlayRef} 
          className="pdf-overlay-layer"
        />
        
        {/* SVG Layer for Connectors */}
        <svg 
          ref={svgRef} 
          className="pdf-connector-layer"
        />
      </div>

      {/* Selected Text Info */}
      {selectedText && (
        <div className="selected-text-info">
          <p>Selected: "{selectedText.text.substring(0, 50)}..."</p>
          <button 
            className="btn btn-primary"
            onClick={() => onTextSelect && onTextSelect(selectedText)}
          >
            Create Comment
          </button>
        </div>
      )}
      
      {/* Comment Prompt Modal */}
      <CommentPromptModal
        open={showCommentPrompt}
        bulletText={commentPromptBullet?.text || ''}
        onSave={handleCommentSave}
        onCancel={handleCommentCancel}
      />
    </div>
  );
});

PdfViewerWithOverlays.displayName = 'PdfViewerWithOverlays';

export default PdfViewerWithOverlays;

