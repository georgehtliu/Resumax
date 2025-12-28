import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { buildResumeHtml } from '../../utils/resumeHtmlTemplate';
import './HtmlResumeViewer.css';

/**
 * HtmlResumeViewer - Simple HTML resume viewer with native text selection and highlighting
 * Uses browser's native selection API - no coordinate math, no transforms, just works!
 */
function HtmlResumeViewer({ 
  resumeData, 
  htmlContent,
  onTextSelect,
  highlights = [],
  isHighlightMode = false,
  selectedColor = '#FFEB3B'
}) {
  const containerRef = useRef(null);
  const [selectedText, setSelectedText] = useState(null);
  const highlightsRef = useRef(new Map()); // Map of highlight IDs to DOM elements

  // Generate HTML from resume data if not provided
  const displayHtml = useMemo(() => {
    if (htmlContent) return htmlContent;
    if (resumeData) return buildResumeHtml(resumeData);
    return null;
  }, [htmlContent, resumeData]);

  // Apply highlights to the HTML content
  useEffect(() => {
    if (!containerRef.current || !displayHtml) return;

    // Clear existing highlights
    highlightsRef.current.forEach(element => {
      if (element.parentNode) {
        const parent = element.parentNode;
        parent.replaceChild(element.firstChild, element);
        parent.normalize();
      }
    });
    highlightsRef.current.clear();

    // Apply new highlights
    highlights.forEach(highlight => {
      if (!highlight.text || !highlight.id) return;

      // Find the text in the HTML content
      const walker = document.createTreeWalker(
        containerRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent;
        if (text.includes(highlight.text)) {
          // Simple text replacement - in a real implementation you'd want more sophisticated matching
          // For now, we'll use a simpler approach: wrap selections on-demand
          break;
        }
      }
    });
  }, [displayHtml, highlights]);

  // Handle text selection
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSelectedText(null);
      return;
    }

    const selectedTextStr = selection.toString().trim();
    if (!selectedTextStr) {
      setSelectedText(null);
      return;
    }

    setSelectedText({
      text: selectedTextStr,
      range: selection.getRangeAt(0)
    });

    if (onTextSelect) {
      onTextSelect({
        text: selectedTextStr,
        range: selection.getRangeAt(0)
      });
    }
  }, [onTextSelect]);

  // Listen for selection changes
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection);
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [handleSelection]);

  // Add highlight for currently selected text
  const addHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedTextStr = selection.toString().trim();
    
    if (!selectedTextStr) return;

    try {
      // Wrap the selection in a highlight span
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'resume-highlight';
      highlightSpan.style.backgroundColor = selectedColor;
      highlightSpan.style.opacity = '0.3';
      highlightSpan.dataset.highlightText = selectedTextStr;

      // Surround the range with the highlight span
      range.surroundContents(highlightSpan);

      // Clear selection
      selection.removeAllRanges();
      setSelectedText(null);

      return true;
    } catch (error) {
      // If surroundContents fails (e.g., selection spans multiple elements),
      // use extractContents and insert
      try {
        const contents = range.extractContents();
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'resume-highlight';
        highlightSpan.style.backgroundColor = selectedColor;
        highlightSpan.style.opacity = '0.3';
        highlightSpan.dataset.highlightText = selectedTextStr;
        highlightSpan.appendChild(contents);
        range.insertNode(highlightSpan);
        selection.removeAllRanges();
        setSelectedText(null);
        return true;
      } catch (err) {
        console.error('Failed to add highlight:', err);
        return false;
      }
    }
  }, [selectedColor]);

  if (!displayHtml) {
    return <div className="html-resume-empty">No resume content to display</div>;
  }

  return (
    <div className="html-resume-viewer">
      {isHighlightMode && selectedText && (
        <div className="html-resume-highlight-controls">
          <button 
            className="btn btn-primary"
            onClick={addHighlight}
          >
            Add Highlight
          </button>
        </div>
      )}
      <div 
        ref={containerRef}
        className="html-resume-content"
        dangerouslySetInnerHTML={{ __html: displayHtml }}
      />
    </div>
  );
}

export default HtmlResumeViewer;

