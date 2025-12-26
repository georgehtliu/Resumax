import React, { useEffect, useRef, useState } from 'react';
import './PdfViewerWithMarkers.css';

function PdfViewerWithMarkers({ pdfBase64, highlightedBulletId, bullets, onBulletFound, onError }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [scale, setScale] = useState(1.5);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulletPositions, setBulletPositions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pdfBase64) {
      setLoading(false);
      return;
    }

    // Load PDF.js if not already loaded
    const loadPdfJs = async () => {
      if (window.pdfjsLib) {
        loadPdf();
        return;
      }

      // Try to load PDF.js dynamically
      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        script.onload = () => {
          if (window.pdfjsLib) {
            loadPdf();
          } else {
            console.error('PDF.js loaded but pdfjsLib not available');
            setLoading(false);
          }
        };
        script.onerror = () => {
          console.error('Failed to load PDF.js from CDN');
          setLoading(false);
          if (onError) {
            onError();
          }
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading PDF.js:', error);
        setLoading(false);
      }
    };

    loadPdfJs();
  }, [pdfBase64]);

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      renderPage();
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    if (pdfDoc && highlightedBulletId && bulletPositions[highlightedBulletId]) {
      // Switch to the page containing the highlighted bullet
      const position = bulletPositions[highlightedBulletId];
      if (position.page !== currentPage) {
        setCurrentPage(position.page);
      }
    }
  }, [highlightedBulletId, bulletPositions, pdfDoc, currentPage]);

  useEffect(() => {
    if (pdfDoc && bullets && bullets.length > 0) {
      findBulletPositions();
    }
  }, [pdfDoc, bullets]);

  const loadPdf = async () => {
    try {
      setLoading(true);
      const binary = atob(pdfBase64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Set worker source - use CDN worker
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setCurrentPage(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
        if (onError) {
          onError();
        }
      } finally {
        setLoading(false);
      }
  };

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      
      // Draw markers after rendering
      if (highlightedBulletId && bulletPositions[highlightedBulletId]) {
        drawMarkers(context, viewport);
      }
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };
  
  // Separate effect for animation
  useEffect(() => {
    if (!highlightedBulletId || !bulletPositions[highlightedBulletId] || !pdfDoc || currentPage !== bulletPositions[highlightedBulletId].page) {
      return;
    }
    
    let animationFrameId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const animate = () => {
      if (!highlightedBulletId || !bulletPositions[highlightedBulletId]) {
        return;
      }
      
      pdfDoc.getPage(currentPage).then(async (page) => {
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        
        // Re-render page to clear previous frame
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        drawMarkers(context, viewport);
        
        animationFrameId = requestAnimationFrame(animate);
      });
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [highlightedBulletId, bulletPositions, pdfDoc, currentPage, scale]);

  const findBulletPositions = async () => {
    if (!pdfDoc || !bullets || bullets.length === 0) return;

    const positions = {};
    
    try {
      // Search through all pages
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Search for each bullet text
        for (const bullet of bullets) {
          const bulletText = bullet.bulletText || '';
          if (!bulletText) continue;

          // Search for bullet text in page text
          const fullText = textContent.items.map(item => item.str).join(' ');
          const searchText = bulletText.substring(0, 50).trim(); // Use first 50 chars for matching
          
          if (fullText.includes(searchText)) {
            // Find the position and bounding box of the text
            let found = false;
            const viewport = page.getViewport({ scale: 1.0 });
            const matchingItems = [];
            
            // Find all items that match the bullet text
            for (let i = 0; i < textContent.items.length; i++) {
              const item = textContent.items[i];
              if (item.str && (item.str.includes(searchText.substring(0, 20)) || 
                  searchText.substring(0, 20).includes(item.str))) {
                matchingItems.push(item);
              }
            }
            
            if (matchingItems.length > 0) {
              // Calculate bounding box from all matching items
              let minX = Infinity, maxX = -Infinity;
              let minY = Infinity, maxY = -Infinity;
              let firstX = null, firstY = null;
              
              matchingItems.forEach((item, idx) => {
                const x = item.transform[4];
                const y = item.transform[5];
                const width = item.width || 0;
                const height = item.height || 12;
                
                if (idx === 0) {
                  firstX = x;
                  firstY = y;
                }
                
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x + width);
                minY = Math.min(minY, y - height);
                maxY = Math.max(maxY, y);
              });
              
              // Normalize to viewport coordinates (0-1)
              positions[bullet.bulletId] = {
                page: pageNum,
                x: firstX / viewport.width,
                y: (viewport.height - firstY) / viewport.height,
                // Bounding box for highlighting
                bbox: {
                  x: minX / viewport.width,
                  y: (viewport.height - maxY) / viewport.height,
                  width: (maxX - minX) / viewport.width,
                  height: (maxY - minY) / viewport.height
                },
                text: searchText,
                items: matchingItems
              };
              found = true;
            }
            
            // If exact match not found, estimate position based on bullet index
            if (!found && !positions[bullet.bulletId]) {
              const bulletIndex = bullets.indexOf(bullet);
              const totalBullets = bullets.length;
              const estimatedY = 0.3 + (bulletIndex / totalBullets) * 0.6; // Estimate Y position
              positions[bullet.bulletId] = {
                page: pageNum,
                x: 0.1,
                y: estimatedY,
                bbox: {
                  x: 0.08,
                  y: estimatedY - 0.01,
                  width: 0.8,
                  height: 0.02
                },
                text: searchText,
                estimated: true
              };
            }
          }
        }
      }
      
      setBulletPositions(positions);
      if (onBulletFound) {
        onBulletFound(positions);
      }
    } catch (error) {
      console.error('Error finding bullet positions:', error);
    }
  };

  const drawMarkers = (context, viewport) => {
    if (!highlightedBulletId || !bulletPositions[highlightedBulletId]) return;

    const position = bulletPositions[highlightedBulletId];
    if (position.page !== currentPage) return;

    context.save();

    // Get bullet position
    const bulletX = position.x * viewport.width;
    const bulletY = position.y * viewport.height;
    
    // Draw highlight rectangle around bullet text if bbox is available
    if (position.bbox) {
      const bboxX = position.bbox.x * viewport.width;
      const bboxY = position.bbox.y * viewport.height;
      const bboxWidth = position.bbox.width * viewport.width;
      const bboxHeight = position.bbox.height * viewport.height;
      
      // Draw highlight background (semi-transparent yellow)
      context.fillStyle = 'rgba(255, 235, 59, 0.4)'; // Light yellow highlight
      context.fillRect(bboxX - 2, bboxY - 2, bboxWidth + 4, bboxHeight + 4);
      
      // Draw border around highlight
      context.strokeStyle = '#f59e0b';
      context.lineWidth = 2;
      context.strokeRect(bboxX - 2, bboxY - 2, bboxWidth + 4, bboxHeight + 4);
      
      // Update bullet position to center of bbox for arrow
      const centerX = bboxX + bboxWidth / 2;
      const centerY = bboxY + bboxHeight / 2;
      
      // Draw arrow from left edge pointing to bullet
      const arrowStartX = 0;
      const arrowStartY = centerY;
      const arrowEndX = bboxX - 15; // Stop before the highlight box
      const arrowEndY = centerY;
      
      // Draw arrow line with shadow
      context.shadowColor = 'rgba(0, 0, 0, 0.3)';
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      
      context.strokeStyle = '#f59e0b';
      context.fillStyle = '#f59e0b';
      context.lineWidth = 3;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      
      // Draw curved arrow line
      context.beginPath();
      context.moveTo(arrowStartX, arrowStartY);
      // Add a slight curve
      const controlX = (arrowStartX + arrowEndX) / 2;
      const controlY = arrowStartY - 10;
      context.quadraticCurveTo(controlX, controlY, arrowEndX, arrowEndY);
      context.stroke();
      
      // Reset shadow for arrowhead
      context.shadowColor = 'transparent';
      context.shadowBlur = 0;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
      
      // Draw arrowhead (pointing right)
      const arrowSize = 12;
      context.beginPath();
      context.moveTo(arrowEndX, arrowEndY);
      context.lineTo(arrowEndX + arrowSize, arrowEndY - arrowSize / 2);
      context.lineTo(arrowEndX + arrowSize, arrowEndY + arrowSize / 2);
      context.closePath();
      context.fill();
      
      // Draw pulsing circle at arrow end
      const pulseRadius = 8 + Math.sin(Date.now() / 200) * 2; // Animated pulse
      context.beginPath();
      context.arc(arrowEndX, arrowEndY, pulseRadius, 0, 2 * Math.PI);
      context.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      context.lineWidth = 2;
      context.stroke();
      
      // Draw small circle at bullet center
      context.beginPath();
      context.arc(centerX, centerY, 5, 0, 2 * Math.PI);
      context.fillStyle = '#f59e0b';
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.stroke();
    } else {
      // Fallback: draw simple arrow if no bbox
      const arrowStartX = 0;
      const arrowStartY = bulletY;
      const arrowEndX = bulletX - 10;
      const arrowEndY = bulletY;
      
      context.strokeStyle = '#f59e0b';
      context.fillStyle = '#f59e0b';
      context.lineWidth = 3;
      
      context.beginPath();
      context.moveTo(arrowStartX, arrowStartY);
      context.lineTo(arrowEndX, arrowEndY);
      context.stroke();
      
      const arrowSize = 10;
      context.beginPath();
      context.moveTo(arrowEndX, arrowEndY);
      context.lineTo(arrowEndX - arrowSize, arrowEndY - arrowSize / 2);
      context.lineTo(arrowEndX - arrowSize, arrowEndY + arrowSize / 2);
      context.closePath();
      context.fill();
      
      // Highlight circle
      context.beginPath();
      context.arc(bulletX, bulletY, 6, 0, 2 * Math.PI);
      context.fillStyle = 'rgba(255, 235, 59, 0.5)';
      context.fill();
      context.strokeStyle = '#f59e0b';
      context.lineWidth = 2;
      context.stroke();
    }

    context.restore();
  };

  if (loading) {
    return <div className="pdf-viewer-loading">Loading PDF...</div>;
  }

  if (!window.pdfjsLib) {
    return <div className="pdf-viewer-error">PDF.js library not loaded. Please refresh the page.</div>;
  }

  if (!pdfDoc) {
    return <div className="pdf-viewer-error">Failed to load PDF</div>;
  }

  return (
    <div className="pdf-viewer-container" ref={containerRef}>
      <div className="pdf-viewer-controls">
        <button 
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="pdf-control-btn"
        >
          ← Previous
        </button>
        <span className="pdf-page-info">
          Page {currentPage} of {pdfDoc.numPages}
        </span>
        <button 
          onClick={() => setCurrentPage(Math.min(pdfDoc.numPages, currentPage + 1))}
          disabled={currentPage === pdfDoc.numPages}
          className="pdf-control-btn"
        >
          Next →
        </button>
        <button 
          onClick={() => setScale(Math.max(1, scale - 0.25))}
          className="pdf-control-btn"
        >
          Zoom Out
        </button>
        <button 
          onClick={() => setScale(Math.min(3, scale + 0.25))}
          className="pdf-control-btn"
        >
          Zoom In
        </button>
      </div>
      <div className="pdf-canvas-wrapper">
        <canvas ref={canvasRef} className="pdf-canvas" />
        {highlightedBulletId && bulletPositions[highlightedBulletId] && (
          <div className="pdf-marker-info">
            {bulletPositions[highlightedBulletId].estimated && (
              <span className="marker-estimated">Estimated position</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PdfViewerWithMarkers;

