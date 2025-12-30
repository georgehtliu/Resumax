import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import ResumeRenderer from '../resume/ResumeRenderer';
import HighlightOverlay, { createOverlayHighlight } from '../pdf/HighlightOverlay';
import { findBulletText as findBulletTextUtil, findBulletContext as findBulletContextUtil } from '../../utils/resumeUtils';
import { generateAnonymousUsername } from '../../utils/anonymousUsernames';
import { useWebSocket } from '../../hooks/useWebSocket';
import { supabase } from '../../config/supabase';
import './RevieweeView.css';

// Mock resume data - in real implementation, this would come from the selected resume
const getMockResumeForReviewee = () => ({
  id: 'mock-reviewee-resume-1',
  name: 'Software Engineer Resume',
  resume_data: {
    personalInfo: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@email.com',
      phone: '(555) 123-4567',
      linkedin: 'linkedin.com/in/sarahjohnson',
      github: 'github.com/sarahjohnson'
    },
    skills: [
      { id: 'skill-1', title: 'Programming Languages', skills: ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go'] },
      { id: 'skill-2', title: 'Frameworks', skills: ['React', 'Node.js', 'Django', 'FastAPI', 'Express'] },
      { id: 'skill-3', title: 'Tools & Technologies', skills: ['AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB'] }
    ],
    experiences: [
      {
        id: 'exp-1',
        company: 'TechCorp Inc.',
        role: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        startDate: '2021-01',
        endDate: 'Present',
        bullets: [
          { id: 'bullet-1', text: 'Led development of microservices architecture serving 10M+ daily active users, reducing latency by 40% and improving system reliability' },
          { id: 'bullet-2', text: 'Architected and implemented real-time data processing pipeline using Apache Kafka and Apache Spark, processing 5TB of data daily' },
          { id: 'bullet-3', text: 'Mentored team of 5 junior engineers, conducting code reviews and establishing best practices that improved code quality by 30%' }
        ],
        selectedBullets: [
          { id: 'bullet-1', text: 'Led development of microservices architecture serving 10M+ daily active users, reducing latency by 40% and improving system reliability' },
          { id: 'bullet-2', text: 'Architected and implemented real-time data processing pipeline using Apache Kafka and Apache Spark, processing 5TB of data daily' },
          { id: 'bullet-3', text: 'Mentored team of 5 junior engineers, conducting code reviews and establishing best practices that improved code quality by 30%' }
        ]
      },
      {
        id: 'exp-2',
        company: 'StartupXYZ',
        role: 'Full Stack Developer',
        location: 'Remote',
        startDate: '2019-06',
        endDate: '2020-12',
        bullets: [
          { id: 'bullet-4', text: 'Built responsive web application using React and Node.js, increasing user engagement by 50% and reducing page load time by 60%' },
          { id: 'bullet-5', text: 'Designed and implemented RESTful API with 99.9% uptime, handling 1M+ requests per day' }
        ],
        selectedBullets: [
          { id: 'bullet-4', text: 'Built responsive web application using React and Node.js, increasing user engagement by 50% and reducing page load time by 60%' },
          { id: 'bullet-5', text: 'Designed and implemented RESTful API with 99.9% uptime, handling 1M+ requests per day' }
        ]
      }
    ],
    education: [
      {
        id: 'edu-1',
        school: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        endDate: '2019',
        bullets: [
          { id: 'bullet-6', text: 'Graduated Magna Cum Laude with GPA 3.8/4.0' },
          { id: 'bullet-7', text: 'Relevant Coursework: Data Structures, Algorithms, Database Systems, Software Engineering' }
        ],
        selectedBullets: [
          { id: 'bullet-6', text: 'Graduated Magna Cum Laude with GPA 3.8/4.0' },
          { id: 'bullet-7', text: 'Relevant Coursework: Data Structures, Algorithms, Database Systems, Software Engineering' }
        ]
      }
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'E-Commerce Platform',
        technologies: 'React, Node.js, PostgreSQL, AWS',
        bullets: [
          { id: 'bullet-8', text: 'Developed full-stack e-commerce platform with payment integration, supporting 10K+ concurrent users' },
          { id: 'bullet-9', text: 'Implemented automated testing suite achieving 85% code coverage, reducing bugs by 40%' }
        ],
        selectedBullets: [
          { id: 'bullet-8', text: 'Developed full-stack e-commerce platform with payment integration, supporting 10K+ concurrent users' },
          { id: 'bullet-9', text: 'Implemented automated testing suite achieving 85% code coverage, reducing bugs by 40%' }
        ]
      }
    ],
    customSections: []
  }
});

function RevieweeView({ onBack, resumeId, roomId, partnerId }) {
  // Generate anonymous name for the reviewer
  const [reviewerAnonymousName] = useState(() => generateAnonymousUsername());
  
  // State
  const [userId, setUserId] = useState(null);
  const [resume, setResume] = useState(getMockResumeForReviewee());
  const [bulletComments, setBulletComments] = useState({});
  const [selectedBulletId, setSelectedBulletId] = useState(null);
  const [hoveredBulletId, setHoveredBulletId] = useState(null);
  const [bulletRefs, setBulletRefs] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const highlightColorRef = useRef('#fef08a');
  const resumePageRef = useRef(null);
  const chatEndRef = useRef(null);
  const highlightHandlerRef = useRef(null);
  const isResumeLoadedRef = useRef(false);
  const [highlights, setHighlights] = useState([]);

  // Get user ID from Supabase
  useEffect(() => {
    const getUserId = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
        }
      } catch (err) {
        console.error('Error getting user session:', err);
      }
    };
    getUserId();
  }, []);

  // Load resume data from saved_resumes
  useEffect(() => {
    const loadResume = async () => {
      if (!resumeId) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
          .from('saved_resumes')
          .select('*')
          .eq('id', resumeId)
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;

        if (data) {
          setResume({
            id: data.id,
            name: data.name,
            resume_data: data.resume_data,
          });
        }
      } catch (err) {
        console.error('Error loading resume:', err);
        // Fallback to mock data
      }
    };
    loadResume();
  }, [resumeId]);

  // WebSocket connection
  const {
    isConnected,
    sendMessage,
    on,
    connectionState,
  } = useWebSocket(userId, {
    autoConnect: !!userId && !!roomId,
  });

  // Join room when connected
  useEffect(() => {
    if (isConnected && roomId && sendMessage) {
      console.log('Joining room:', roomId);
      sendMessage({
        type: 'JOIN_ROOM',
        room_id: roomId,
      });
    }
  }, [isConnected, roomId, sendMessage]);

  // WebSocket message handlers
  useEffect(() => {
    if (!isConnected) return;

    // Handle new chat messages
    const unsubscribeMessage = on('NEW_MESSAGE', (message) => {
      setChatMessages(prev => [...prev, {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: message.sender_role === 'reviewee' ? 'reviewee' : 'reviewer',
        name: message.sender_role === 'reviewer' ? reviewerAnonymousName : 'You',
        message: message.message,
        timestamp: message.timestamp,
      }]);
    });

    // Handle highlights
    const unsubscribeHighlight = on('HIGHLIGHT_CREATED', (message) => {
      if (message.highlight.user_id !== userId) {
        setHighlights(prev => [...prev, {
          ...message.highlight,
          id: message.highlight.id,
        }]);
      }
    });

    const unsubscribeHighlightDeleted = on('HIGHLIGHT_DELETED', (message) => {
      setHighlights(prev => prev.filter(h => h.id !== message.highlight_id));
    });

    // Handle comments
    const unsubscribeComment = on('COMMENT_CREATED', (message) => {
      const comment = message.comment;
      setBulletComments(prev => ({
        ...prev,
        [comment.bullet_id]: [...(prev[comment.bullet_id] || []), {
          id: comment.id,
          author_name: comment.author_role === 'reviewer' ? reviewerAnonymousName : 'You',
          content: comment.content,
          created_at: comment.created_at,
          is_anonymous: true,
          bullet_id: comment.bullet_id,
          resolved: false,
        }]
      }));
    });

    const unsubscribeCommentUpdated = on('COMMENT_UPDATED', (message) => {
      const comment = message.comment;
      setBulletComments(prev => {
        const updated = { ...prev };
        if (updated[comment.bullet_id]) {
          updated[comment.bullet_id] = updated[comment.bullet_id].map(c =>
            c.id === comment.id ? { ...c, ...comment } : c
          );
        }
        return updated;
      });
    });

    const unsubscribeCommentDeleted = on('COMMENT_DELETED', (message) => {
      setBulletComments(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(bulletId => {
          updated[bulletId] = updated[bulletId].filter(c => c.id !== message.comment_id);
        });
        return updated;
      });
    });

    const unsubscribeCommentResolved = on('COMMENT_RESOLVED', (message) => {
      setBulletComments(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(bulletId => {
          updated[bulletId] = updated[bulletId].map(c =>
            c.id === message.comment_id ? { ...c, resolved: true } : c
          );
        });
        return updated;
      });
    });

    return () => {
      unsubscribeMessage();
      unsubscribeHighlight();
      unsubscribeHighlightDeleted();
      unsubscribeComment();
      unsubscribeCommentUpdated();
      unsubscribeCommentDeleted();
      unsubscribeCommentResolved();
    };
  }, [isConnected, on, userId, reviewerAnonymousName]);

  const findBulletText = useCallback((bulletId) => {
    return findBulletTextUtil({ resume_data: resume.resume_data }, bulletId);
  }, [resume]);

  const findBulletContext = useCallback((bulletId) => {
    return findBulletContextUtil({ resume_data: resume.resume_data }, bulletId);
  }, [resume]);

  // Keep ref in sync with state
  useEffect(() => {
    highlightColorRef.current = highlightColor;
  }, [highlightColor]);

  // Set up highlighting handler
  useEffect(() => {
    const resumeId = resume.id;
    if (isResumeLoadedRef.current === resumeId) return;
    
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) {
        return;
      }

      const range = selection.getRangeAt(0);
      const resumePage = resumePageRef.current;
      
      if (!resumePage || !resumePage.contains(range.commonAncestorContainer)) {
        return;
      }

      // Create overlay highlight (doesn't modify DOM)
      const highlightData = createOverlayHighlight(range, resumePage, highlightColorRef.current);
      if (highlightData) {
        setHighlights(prev => [...prev, highlightData]);
        
        // Send highlight to server via WebSocket
        if (isConnected && sendMessage) {
          sendMessage({
            type: 'CREATE_HIGHLIGHT',
            highlight: {
              id: highlightData.id,
              range: highlightData.range,
              color: highlightData.color,
              position: highlightData.position,
            }
          });
        }
      }
      
      // Clear selection
      selection.removeAllRanges();
    };

    // Wait for DOM to be ready
    const timeoutId = setTimeout(() => {
      const resumePage = resumePageRef.current;
      if (resumePage && isResumeLoadedRef.current !== resumeId) {
        resumePage.addEventListener('mouseup', handleMouseUp);
        highlightHandlerRef.current = handleMouseUp;
        isResumeLoadedRef.current = resumeId;
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      const resumePage = resumePageRef.current;
      if (resumePage && highlightHandlerRef.current) {
        resumePage.removeEventListener('mouseup', highlightHandlerRef.current);
        highlightHandlerRef.current = null;
      }
      if (isResumeLoadedRef.current === resumeId) {
        isResumeLoadedRef.current = false;
      }
    };
  }, [resume.id, isConnected, sendMessage]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !isConnected) return;
    
    // Send message via WebSocket
    sendMessage({
      type: 'SEND_MESSAGE',
      message: chatInput,
      timestamp: new Date().toISOString(),
    });

    // Optimistically add to local state
    setChatMessages(prev => [...prev, {
      id: `msg-${Date.now()}-temp`,
      sender: 'reviewee',
      name: 'You',
      message: chatInput,
      timestamp: new Date().toISOString()
    }]);

    setChatInput('');
  };

  const handleResolveComment = (commentId, bulletId) => {
    if (!isConnected) return;
    
    // Send resolve to server
    sendMessage({
      type: 'RESOLVE_COMMENT',
      comment_id: commentId,
    });

    // Optimistically update local state
    setBulletComments(prev => {
      const updated = { ...prev };
      if (updated[bulletId]) {
        updated[bulletId] = updated[bulletId].map(comment =>
          comment.id === commentId
            ? { ...comment, resolved: true }
            : comment
        );
      }
      return updated;
    });
  };

  const handleUnresolveComment = (commentId, bulletId) => {
    // For now, just update locally (could add UNRESOLVE_COMMENT message type later)
    setBulletComments(prev => {
      const updated = { ...prev };
      if (updated[bulletId]) {
        updated[bulletId] = updated[bulletId].map(comment =>
          comment.id === commentId
            ? { ...comment, resolved: false }
            : comment
        );
      }
      return updated;
    });
  };

  const scrollToBulletInHtml = (bulletId) => {
    const bulletElement = bulletRefs[bulletId];
    if (bulletElement) {
      bulletElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelectedBulletId(bulletId);
      setTimeout(() => setSelectedBulletId(null), 3000);
    }
  };

  const getAllBulletsWithComments = useCallback(() => {
    const bullets = [];
    Object.entries(bulletComments).forEach(([bulletId, commentsList]) => {
      if (commentsList.length > 0) {
        const bulletText = findBulletText(bulletId);
        const context = findBulletContext(bulletId);
        bullets.push({
          bulletId,
          bulletText,
          sectionType: context.sectionType,
          entryId: context.entryId,
          comments: commentsList
        });
      }
    });
    return bullets;
  }, [bulletComments, findBulletText, findBulletContext]);

  return (
    <div className="reviewee-view">
      <div className="reviewee-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div className="reviewee-header-content">
          <h1>My Resume Review</h1>
          <p className="reviewee-subtitle">Reviewing: {resume.name}</p>
        </div>
        <div className="highlight-controls">
          <label htmlFor="highlight-color-picker-reviewee" className="highlight-label">
            Highlight Color:
          </label>
          <input
            id="highlight-color-picker-reviewee"
            type="color"
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            className="highlight-color-picker"
            title="Select highlight color"
          />
          <span className="highlight-hint">Select text to highlight</span>
        </div>
      </div>

      <div className="reviewee-layout">
        <div className="reviewee-resume-section">
          <div className="resume-html-wrapper" style={{ position: 'relative' }}>
            <div 
              className="resume-page" 
              ref={resumePageRef}
              contentEditable="false"
              suppressContentEditableWarning={true}
            >
              <ResumeRenderer
                resume={resume}
                bulletComments={bulletComments}
                selectedBulletId={selectedBulletId}
                hoveredBulletId={hoveredBulletId}
                setSelectedBulletId={setSelectedBulletId}
                setHoveredBulletId={setHoveredBulletId}
                bulletRefs={bulletRefs}
                setBulletRefs={setBulletRefs}
              />
            </div>
            <HighlightOverlay 
              containerRef={resumePageRef}
              highlights={highlights}
              onRemoveHighlight={(highlightId) => {
                setHighlights(prev => prev.filter(h => h.id !== highlightId));
                // Send delete to server
                if (isConnected && sendMessage) {
                  sendMessage({
                    type: 'DELETE_HIGHLIGHT',
                    highlight_id: highlightId,
                  });
                }
              }}
            />
          </div>
        </div>

        <div className="reviewee-sidebar">
          <div className="chat-section">
            <div className="chat-header">
              <MessageSquare size={18} />
              <h3>Live Chat</h3>
              {connectionState && (
                <span className={`connection-status ${connectionState}`}>
                  {connectionState === 'connected' ? '●' : '○'}
                </span>
              )}
            </div>
            <div className="chat-messages">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.sender === 'reviewee' ? 'reviewee' : 'reviewer'}`}>
                  <div className="chat-message-header">
                    <span className="chat-message-name">{msg.name}</span>
                    <span className="chat-message-time">
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="chat-message-content">{msg.message}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleChatSubmit}>
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="chat-input"
                />
                <button type="submit" className="chat-send-button" disabled={!chatInput.trim()}>
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>

          <div className="comments-section">
            <div className="comments-header">
              <h3>Comments ({getAllBulletsWithComments().length})</h3>
            </div>
            <div className="comments-content">
              {getAllBulletsWithComments().length === 0 ? (
                <div className="no-comments">
                  <p>No comments yet. Reviewers will add feedback here.</p>
                </div>
              ) : (
                getAllBulletsWithComments().map(({ bulletId, bulletText, comments }) => (
                  <div key={bulletId} className="comment-group">
                    <div 
                      className="comment-group-header"
                      onClick={() => scrollToBulletInHtml(bulletId)}
                    >
                      <div className="comment-bullet-text">
                        {bulletText.substring(0, 60)}{bulletText.length > 60 ? '...' : ''}
                      </div>
                    </div>
                    <div className="comment-group-comments">
                      {comments.map(comment => (
                        <div 
                          key={comment.id} 
                          className={`comment-item ${comment.resolved ? 'resolved' : ''}`}
                        >
                          <div className="comment-header">
                            <span className="comment-author">{comment.author_name}</span>
                            <span className="comment-date">
                              {new Date(comment.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="comment-content">{comment.content}</div>
                          <div className="comment-actions">
                            {comment.resolved ? (
                              <button
                                className="resolve-button unresolved"
                                onClick={() => handleUnresolveComment(comment.id, bulletId)}
                                title="Mark as unresolved"
                              >
                                <CheckCircle2 size={16} />
                                <span>Resolved</span>
                              </button>
                            ) : (
                              <button
                                className="resolve-button"
                                onClick={() => handleResolveComment(comment.id, bulletId)}
                                title="Mark as resolved"
                              >
                                <CheckCircle2 size={16} />
                                <span>Resolve</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RevieweeView;

