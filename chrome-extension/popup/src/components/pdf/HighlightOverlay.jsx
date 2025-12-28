import React, { useState, useEffect } from 'react';

// Helper function to create overlay-based highlight (doesn't modify DOM)
// Returns highlight data with bounding rect information
export function createOverlayHighlight(range, containerElement, highlightColor) {
  try {
    // Get bounding rectangle of the selection relative to the container
    const rects = range.getClientRects();
    const containerRect = containerElement.getBoundingClientRect();
    
    if (rects.length === 0) {
      return null;
    }
    
    // Create highlight data with all rect positions
    const highlightRects = Array.from(rects).map(rect => ({
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height
    }));
    
    // Store selection text and range info for potential removal
    const selectedText = range.toString();
    
    return {
      id: `highlight-${Date.now()}-${Math.random()}`,
      rects: highlightRects,
      text: selectedText,
      color: highlightColor,
      // Store range info for removal if needed
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset
    };
  } catch (e) {
    console.error('Error creating overlay highlight:', e);
    return null;
  }
}

// Highlight Overlay Component - renders highlights as positioned overlays
export default function HighlightOverlay({ containerRef, highlights, onRemoveHighlight }) {
  const [containerRect, setContainerRect] = useState(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateRect = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const wrapper = containerRef.current.parentElement;
        if (wrapper) {
          const wrapperRect = wrapper.getBoundingClientRect();
          setContainerRect({
            left: rect.left - wrapperRect.left,
            top: rect.top - wrapperRect.top,
            width: rect.width,
            height: rect.height
          });
        }
      }
    };
    
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [containerRef, highlights]);
  
  const handleDoubleClick = (highlightId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemoveHighlight) {
      onRemoveHighlight(highlightId);
    }
  };
  
  if (!containerRect || !containerRef.current) return null;
  
  return (
    <div
      className="highlight-overlay-container"
      style={{
        position: 'absolute',
        left: `${containerRect.left}px`,
        top: `${containerRect.top}px`,
        width: `${containerRect.width}px`,
        height: `${containerRect.height}px`,
        pointerEvents: 'none',
        zIndex: 1
      }}
    >
      {highlights.map(highlight => (
        highlight.rects.map((rect, idx) => (
          <div
            key={`${highlight.id}-${idx}`}
            onDoubleClick={(e) => handleDoubleClick(highlight.id, e)}
            style={{
              position: 'absolute',
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              backgroundColor: highlight.color,
              opacity: 0.3,
              pointerEvents: 'auto',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
            title="Double-click to remove highlight"
          />
        ))
      ))}
    </div>
  );
}

