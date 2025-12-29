import React, { useState, useEffect } from 'react';
import ExperienceEditor from './components/editors/ExperienceEditor';
import EducationEditor from './components/editors/EducationEditor';
import ProjectEditor from './components/editors/ProjectEditor';
import CustomSectionEditor from './components/editors/CustomSectionEditor';
import PersonalInfoEditor from './components/editors/PersonalInfoEditor';
import SkillsEditor from './components/editors/SkillsEditor';
import Tabs from './components/ui/Tabs';
import GenerateResume from './components/GenerateResume';
import SavedResumes from './components/SavedResumes';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Onboarding from './components/Onboarding';
import SideNav from './components/ui/SideNav';
import Profile from './components/Profile';
import ResumeCoaching from './components/ResumeCoaching';
import About from './components/About';
import ResumeTips from './components/ResumeTips';
import Community from './components/Community';
import SharedResumeView from './components/resume/SharedResumeView';
import ToastContainer from './components/ui/ToastContainer';
import { useToast } from './hooks/useToast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { supabase } from './config/supabase';
import { storageService } from './services/storage';
import Skeleton, { SkeletonCard } from './components/ui/Skeleton';
import { Icon } from './components/ui/Icons';
import HumanCritiqueSelection from './components/coaching/HumanCritiqueSelection';
import ReviewResume from './components/coaching/ReviewResume';
import HaveResumeReviewed from './components/coaching/HaveResumeReviewed';
import './styles/design-system.css';
import './styles/animations.css';
import './App.css';

/**
 * Main App Component
 * 
 * State Management:
 * - Resume data (experiences, bullets)
 * - Current job description
 * - Optimization results
 */
function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const isManagerView = queryParams.get('view') === 'manager';
  const shareToken = queryParams.get('share');

  // If share token is present, show shared resume view (public, no auth required)
  if (shareToken) {
    return (
      <div className="app">
        <SharedResumeView shareToken={shareToken} />
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState(() => (isManagerView ? 'generate' : 'generate'));
  const [activeView, setActiveView] = useState(() => (isManagerView ? 'about' : 'generate'));
  const [humanCritiqueView, setHumanCritiqueView] = useState('selection'); // 'selection', 'review', 'get-reviewed'
  const [refreshSaved, setRefreshSaved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(() => {
    // Check localStorage for sign-in status
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('resumax_signed_in') === 'true';
    }
    return false;
  });
  
  // Check if current user is the test user
  const isTestUser = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Check new key first, fallback to old key for migration
      return localStorage.getItem('resume_master_is_test_user') === 'true' || localStorage.getItem('resumax_is_test_user') === 'true';
    }
    return false;
  };
  const [resume, setResume] = useState({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      github: ''
    },
    skills: [],
    experiences: [],
    education: [],
    projects: [],
    customSections: [],
    totalBullets: 0
  });

  // Toast notifications
  const { toasts, removeToast, success, error: showError } = useToast();

  // Reset human critique view when switching away from coaching-human
  useEffect(() => {
    if (activeView !== 'coaching-human') {
      setHumanCritiqueView('selection');
    }
  }, [activeView]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'cmd+s',
      handler: (e) => {
        if (isSignedIn && !isManagerView) {
          e.preventDefault();
          saveResumeData(resume);
          success('Resume saved');
        }
      },
      allowInInput: false,
    },
  ]);

  function openManagerPage() {
    const managerUrl =
      typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL('popup-build/index.html?view=manager')
        : `${window.location.origin}${window.location.pathname}?view=manager`;

    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: managerUrl });
    } else {
      window.open(managerUrl, '_blank', 'noopener');
    }
  }

  // Check for OAuth callback and handle auth state changes
  useEffect(() => {
    // Check for OAuth callback in URL hash
    const hash = window.location.hash.substring(1);
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const error = hashParams.get('error');
      
      if (error) {
        console.error('OAuth error:', error);
        // Clean up URL
        const cleanUrl = window.location.pathname + (window.location.search || '');
        window.history.replaceState({}, document.title, cleanUrl);
        return;
      }
      
      if (accessToken) {
        // User just came back from OAuth
        // Supabase will handle the session automatically via the hash
        supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
          if (session && !sessionError) {
            setIsSignedIn(true);
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem('resume_master_signed_in', 'true');
              localStorage.setItem('resume_master_user_email', session.user.email || '');
              // Migrate old keys
              localStorage.setItem('resumax_signed_in', 'true');
              localStorage.setItem('resumax_user_email', session.user.email || '');
            }
            // Clean up URL hash
            const cleanUrl = window.location.pathname + (window.location.search || '?view=manager');
            window.history.replaceState({}, document.title, cleanUrl);
          } else if (sessionError) {
            console.error('Session error:', sessionError);
          }
        });
      }
    }

    // Listen for auth state changes (including OAuth callbacks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      
      if (event === 'SIGNED_IN' && session) {
        setIsSignedIn(true);
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('resume_master_signed_in', 'true');
          localStorage.setItem('resume_master_user_email', session.user.email || '');
          // Migrate old keys
          localStorage.setItem('resumax_signed_in', 'true');
          localStorage.setItem('resumax_user_email', session.user.email || '');
        }
      } else if (event === 'SIGNED_OUT') {
        setIsSignedIn(false);
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('resume_master_signed_in');
          localStorage.removeItem('resume_master_user_email');
          // Remove old keys
          localStorage.removeItem('resumax_signed_in');
          localStorage.removeItem('resumax_user_email');
        }
      }
    });

    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsSignedIn(true);
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('resume_master_signed_in', 'true');
          localStorage.setItem('resume_master_user_email', session.user.email || '');
          // Migrate old keys
          localStorage.setItem('resumax_signed_in', 'true');
          localStorage.setItem('resumax_user_email', session.user.email || '');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Redirect to manager sign-in if not signed in and in popup view
  useEffect(() => {
    if (!isManagerView && !isSignedIn) {
      // Small delay to show the loading message, then redirect
      const timer = setTimeout(() => {
        openManagerPage();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isManagerView, isSignedIn]);

  // Check if user has data and show onboarding if needed
  useEffect(() => {
    async function checkDataAndShowOnboarding() {
      const testUser = isTestUser();
      
      if (isSignedIn && isManagerView) {
        // For test user, always load mock data
        if (testUser) {
          await initializeMockData();
          await loadResumeData();
          setLoading(false);
          return;
        }
        
        const existingResume = await storageService.getResume();
        const savedResumes = await storageService.getSavedResumes();
        
        const hasMasterData = 
          (existingResume.experiences && existingResume.experiences.length > 0) ||
          (existingResume.education && existingResume.education.length > 0) ||
          (existingResume.projects && existingResume.projects.length > 0) ||
          (existingResume.customSections && existingResume.customSections.length > 0);
        
        // Show onboarding if no data exists
        if (!hasMasterData && savedResumes.length === 0) {
          setShowOnboarding(true);
          setLoading(false);
        } else {
          setShowOnboarding(false);
          // Load data normally
          await initializeMockData();
          await loadResumeData();
          setLoading(false);
        }
      } else if (isSignedIn || isManagerView) {
        // Load data normally if signed in but not showing onboarding
        async function init() {
          // For test user, always initialize mock data
          if (testUser) {
            await initializeMockData();
          } else {
            await initializeMockData();
          }
          await loadResumeData();
          setLoading(false);
        }
        init();
      }
    }
    
    checkDataAndShowOnboarding();
  }, [isSignedIn, isManagerView]);

  /**
   * Initialize mock data if no data exists
   */
  async function initializeMockData() {
    try {
      const existingResume = await storageService.getResume();
      const savedResumes = await storageService.getSavedResumes();
      
      // Check if there's actual data (not just totalBullets, but actual bullets)
      const hasMasterData = 
        (existingResume.experiences && existingResume.experiences.length > 0) ||
        (existingResume.education && existingResume.education.length > 0) ||
        (existingResume.projects && existingResume.projects.length > 0) ||
        (existingResume.customSections && existingResume.customSections.length > 0);
      
      
      // FOR TESTING: Force initialization if localStorage has a flag OR if test user
      const forceInit = localStorage.getItem('forceInitMockData') === 'true' || isTestUser();
      if (forceInit && localStorage.getItem('forceInitMockData') === 'true') {
        localStorage.removeItem('forceInitMockData');
      }
      
      // For test user, always initialize mock data
      // For other users, only initialize if no data exists OR force init is enabled
      if ((!hasMasterData && savedResumes.length === 0) || forceInit) {
        if (forceInit) {
          // Clear existing data first
          await storageService.clearResume();
          // Clear saved resumes too
          const existingSaved = await storageService.getSavedResumes();
          for (const resume of existingSaved) {
            await storageService.deleteSavedResume(resume.id);
          }
        }
        // Initialize master resume with comprehensive realistic mock data
        const mockMasterResume = {
          personalInfo: {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane.doe@example.com',
            phone: '+1 (555) 123-4567',
            linkedin: 'linkedin.com/in/janedoe',
            github: 'github.com/janedoe'
          },
          skills: [
            {
              id: 'skill-1',
              title: 'Languages',
              skills: ['Python', 'JavaScript', 'Go', 'Java', 'SQL']
            },
            {
              id: 'skill-2',
              title: 'Frameworks & Libraries',
              skills: ['React', 'Node.js', 'Django', 'Spring Boot', 'GraphQL']
            },
            {
              id: 'skill-3',
              title: 'Cloud & DevOps',
              skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD']
            }
          ],
          experiences: [
            {
              id: 'exp-1',
              company: 'Google',
              role: 'Software Engineer II',
              startDate: 'Jun 2022',
              endDate: 'Present',
              bullets: [
                { id: 'bullet-1', text: 'Scaled Go/Python microservices for 10M+ daily requests while keeping uptime at 99.9%' },
                { id: 'bullet-2', text: 'Cut API latency 40% by tuning SQL and cache layers, saving $50K in annual infra costs through smarter resource allocation and query optimization strategies' },
                { id: 'bullet-3', text: 'Led three engineers to launch recommendations that raised engagement 25% and revenue $2M' },
                { id: 'bullet-4', text: 'Automated Jenkins and Docker pipelines enabling daily releases and trimming deploy time 60%, reducing manual errors and increasing team productivity through streamlined workflows' },
                { id: 'bullet-5', text: 'Built REST and gRPC services for 5M+ calls with sub-100ms latency to speed the mobile app' },
                { id: 'bullet-6', text: 'Mentored two junior engineers through reviews and design sessions, boosting velocity 20% and improving code quality standards across the team through knowledge sharing' }
              ]
            },
            {
              id: 'exp-2',
              company: 'Meta',
              role: 'Software Engineering Intern',
              startDate: 'Jun 2021',
              endDate: 'Aug 2021',
              bullets: [
                { id: 'bullet-9', text: 'Shipped accessible Marketplace UI components that lifted conversion by 15%' },
                { id: 'bullet-10', text: 'Built WebSocket plus Redis alerts trimming latency 30% and boosting engagement through real-time updates and improved user experience metrics' },
                { id: 'bullet-11', text: 'Optimized GraphQL queries to cut server load 25% and speed page renders' },
                { id: 'bullet-12', text: 'Launched A/B framework enabling data-led releases and reducing regression risk while increasing experiment velocity and team confidence in deployments' },
                { id: 'bullet-13', text: 'Delivered WCAG AA compliant flows with full keyboard navigation support' },
                { id: 'bullet-14', text: 'Implemented optimistic UI patterns to drop perceived latency from 400ms to 120ms, directly improving user satisfaction scores and reducing bounce rates through faster interactions' }
              ]
            },
            {
              id: 'exp-3',
              company: 'Amazon Web Services',
              role: 'Software Development Engineer Intern',
              startDate: 'Jun 2020',
              endDate: 'Aug 2020',
              bullets: [
                { id: 'bullet-15', text: 'Automated Java Spring tooling that saved 40 weekly hours on deployment prep' },
                { id: 'bullet-16', text: 'Built CloudWatch and Lambda alerts that halved incident detection time, reducing MTTR from 45 minutes to under 20 minutes through proactive monitoring' },
                { id: 'bullet-17', text: 'Tuned DynamoDB and ElastiCache to cut query latency by 35%' },
                { id: 'bullet-18', text: 'Containerized legacy batch jobs onto Fargate to lower ops overhead by 60% and improve resource utilization, enabling better cost management and scalability' },
                { id: 'bullet-19', text: 'Implemented blue/green deployment strategy to eliminate release downtime' },
                { id: 'bullet-20', text: 'Published CloudFormation modules standardizing VPC and IAM provisioning, reducing setup time from days to hours and ensuring consistent security configurations across all environments' }
              ]
            }
          ],
          education: [
            {
              id: 'edu-1',
              school: 'Stanford University',
              degree: 'B.S.',
              field: 'Computer Science',
              startDate: 'Sep 2018',
              endDate: 'Jun 2022',
              bullets: [
                { id: 'bullet-18', text: 'GPA 3.9/4.0, Magna Cum Laude, Dean\'s List in every term' },
                { id: 'bullet-19', text: 'Core courses: Algorithms, Machine Learning, Distributed Systems, Databases' },
                { id: 'bullet-20', text: 'Teaching assistant for CS161 supporting 50+ students with labs and grading' },
                { id: 'bullet-21', text: 'ML lab researcher building computer vision models for real-world datasets' }
              ]
            }
          ],
          projects: [
            {
              id: 'proj-1',
              name: 'Distributed Task Scheduler',
              description: 'High-performance distributed task scheduling system with fault tolerance',
              technologies: 'Go, Kubernetes, Redis, PostgreSQL, gRPC',
              startDate: 'Jan 2022',
              endDate: 'May 2022',
              bullets: [
                { id: 'bullet-22', text: 'Built Go + Kubernetes scheduler processing 100K concurrent jobs at 99.95% uptime' },
                { id: 'bullet-23', text: 'Implemented Raft-based leader election to coordinate task execution' },
                { id: 'bullet-24', text: 'Designed failover with replication to prevent task loss during node outages' },
                { id: 'bullet-25', text: 'Delivered Prometheus and Grafana dashboards for real-time system health' }
              ]
            },
            {
              id: 'proj-2',
              name: 'E-commerce Platform',
              description: 'Full-stack e-commerce platform with payment integration and inventory management',
              technologies: 'React, Node.js, Express, PostgreSQL, Stripe API, AWS',
              startDate: 'Sep 2020',
              endDate: 'Dec 2021',
              bullets: [
                { id: 'bullet-26', text: 'Shipped commerce app for 1000+ users with live inventory updates and order tracking' },
                { id: 'bullet-27', text: 'Integrated Stripe payments processing $50K+ with PCI-safe fraud checks' },
                { id: 'bullet-28', text: 'Implemented JWT RBAC to secure both admin and customer flows' },
                { id: 'bullet-29', text: 'Deployed on AWS EC2, RDS, S3, and CloudFront with backups and auto scaling' },
                { id: 'bullet-30', text: 'Tuned Postgres schema and queries to cut page load times by 45%' }
              ]
            },
            {
              id: 'proj-3',
              name: 'Machine Learning Recommender System',
              description: 'Content-based recommendation engine for video streaming platform',
              technologies: 'Python, TensorFlow, Scikit-learn, Flask, Redis',
              startDate: 'Jan 2021',
              endDate: 'May 2021',
              bullets: [
                { id: 'bullet-31', text: 'Trained hybrid recommendation model reaching 85% accuracy on streaming content' },
                { id: 'bullet-32', text: 'Processed 1M+ interactions with pandas pipelines and feature engineering' },
                { id: 'bullet-33', text: 'Hosted Flask API serving 10K requests per minute at 50ms latency' },
                { id: 'bullet-34', text: 'Added Redis caching to drop inference time 70% for returning users' }
              ]
            },
            {
              id: 'proj-4',
              name: 'Real-time Chat Application',
              description: 'WebSocket-based chat application with end-to-end encryption',
              technologies: 'React, Node.js, Socket.io, MongoDB, Redis, Docker',
              startDate: 'Jun 2020',
              endDate: 'Aug 2020',
              bullets: [
                { id: 'bullet-35', text: 'Built WebSocket chat supporting 500 users with persistent message storage' },
                { id: 'bullet-36', text: 'Implemented end-to-end encrypted messaging using the Web Crypto API' },
                { id: 'bullet-37', text: 'Scaled Node.js and MongoDB backend with Redis caching under 100ms latency' }
              ]
            }
          ],
          customSections: [
            {
              id: 'custom-2',
              title: 'Awards & Recognition',
              subtitle: '',
              bullets: [
                { id: 'bullet-45', text: 'Won Google Hackathon 2022 with an AI-powered code review companion' },
                { id: 'bullet-46', text: 'Received Stanford Engineering Excellence Award 2021 for top 5% GPA' },
                { id: 'bullet-47', text: 'Published consensus research at ACM Distributed Computing 2021' },
                { id: 'bullet-48', text: 'Won Meta intern hackathon with an accessibility helper for visually impaired users' }
              ]
            },
            {
              id: 'custom-3',
              title: 'Certifications',
              subtitle: '',
              bullets: [
                { id: 'bullet-49', text: 'AWS Certified Solutions Architect – Associate (2022)' },
                { id: 'bullet-50', text: 'Kubernetes Certified Application Developer (CKAD) (2023)' },
                { id: 'bullet-51', text: 'Google Cloud Professional Cloud Architect (2023)' }
              ]
            }
          ],
          totalBullets: 0
        };
        
        mockMasterResume.totalBullets = calculateTotalBullets(mockMasterResume);
        await storageService.saveResume(mockMasterResume);
        
        // Initialize saved resumes with realistic structured data
        const mockSavedResumes = [
          {
            id: 'resume-1',
            name: 'Google SWE - Backend/Infrastructure',
            createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
            updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            data: {
              experiences: [
                {
                  id: 'exp-saved-1',
                  company: 'Google',
                  role: 'Software Engineer II',
                  startDate: 'Jun 2022',
                  endDate: 'Present',
                  bullets: [
                    { id: 'bullet-saved-1', text: 'Scaled Go/Python microservices for 10M+ daily requests while keeping uptime at 99.9%' },
                    { id: 'bullet-saved-2', text: 'Cut API latency 40% by tuning SQL and cache layers, saving $50K in annual infra costs' },
                    { id: 'bullet-saved-3', text: 'Automated Jenkins and Docker pipelines enabling daily releases and trimming deploy time 60%' },
                    { id: 'bullet-saved-4', text: 'Built REST and gRPC services for 5M+ calls with sub-100ms latency to speed the mobile app' }
                  ]
                },
                {
                  id: 'exp-saved-2',
                  company: 'Amazon Web Services',
                  role: 'Software Development Engineer Intern',
                  startDate: 'Jun 2020',
                  endDate: 'Aug 2020',
                  bullets: [
                    { id: 'bullet-saved-5', text: 'Automated Java Spring tooling that saved 40 weekly hours on deployment prep' },
                    { id: 'bullet-saved-6', text: 'Built CloudWatch and Lambda alerts that halved incident detection time' }
                  ]
                }
              ],
              education: [
                {
                  id: 'edu-saved-1',
                  school: 'Stanford University',
                  degree: 'B.S.',
                  field: 'Computer Science',
                  startDate: 'Sep 2018',
                  endDate: 'Jun 2022',
                  bullets: [
                    { id: 'bullet-saved-7', text: 'GPA 3.9/4.0, Magna Cum Laude, Dean\'s List in every term' },
                    { id: 'bullet-saved-8', text: 'Core courses: Algorithms, Machine Learning, Distributed Systems, Databases' }
                  ]
                }
              ],
              projects: [
                {
                  id: 'proj-saved-1',
                  name: 'Distributed Task Scheduler',
                  description: 'High-performance distributed task scheduling system with fault tolerance',
                  technologies: 'Go, Kubernetes, Redis, PostgreSQL, gRPC',
                  startDate: 'Jan 2022',
                  endDate: 'May 2022',
                  bullets: [
                    { id: 'bullet-saved-9', text: 'Built Go + Kubernetes scheduler processing 100K concurrent jobs at 99.95% uptime' },
                    { id: 'bullet-saved-10', text: 'Implemented Raft-based leader election to coordinate task execution' }
                  ]
                }
              ],
              customSections: [
                {
                  id: 'custom-saved-1',
                  title: 'Awards & Recognition',
                  subtitle: '',
                  bullets: [
                    { id: 'bullet-saved-11', text: 'Won Google Hackathon 2022 with an AI-powered code review companion' },
                    { id: 'bullet-saved-12', text: 'Published consensus research at ACM Distributed Computing 2021' }
                  ]
                }
              ],
              jobDescription: 'Software Engineer position at Google focusing on backend infrastructure, distributed systems, and scalable microservices architecture...'
            }
          },
          {
            id: 'resume-2',
            name: 'Meta - Frontend Engineer',
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
            updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
            data: {
              experiences: [
                {
                  id: 'exp-saved-3',
                  company: 'Meta',
                  role: 'Software Engineering Intern',
                  startDate: 'Jun 2021',
                  endDate: 'Aug 2021',
                  bullets: [
                    { id: 'bullet-saved-15', text: 'Shipped accessible Marketplace UI components that lifted conversion by 15%' },
                    { id: 'bullet-saved-16', text: 'Built WebSocket plus Redis alerts trimming latency 30% and boosting engagement' },
                    { id: 'bullet-saved-17', text: 'Optimized GraphQL queries to cut server load 25% and speed page renders' }
                  ]
                }
              ],
              education: [
                {
                  id: 'edu-saved-2',
                  school: 'Stanford University',
                  degree: 'B.S.',
                  field: 'Computer Science',
                  startDate: 'Sep 2018',
                  endDate: 'Jun 2022',
                  bullets: [
                    { id: 'bullet-saved-18', text: 'GPA 3.9/4.0, Magna Cum Laude, Dean\'s List in every term' }
                  ]
                }
              ],
              projects: [
                {
                  id: 'proj-saved-2',
                  name: 'E-commerce Platform',
                  description: 'Full-stack e-commerce platform with payment integration',
                  technologies: 'React, Node.js, Express, PostgreSQL, Stripe API, AWS',
                  startDate: 'Sep 2020',
                  endDate: 'Dec 2021',
                  bullets: [
                    { id: 'bullet-saved-19', text: 'Shipped commerce app for 1000+ users with live inventory updates and order tracking' },
                    { id: 'bullet-saved-20', text: 'Integrated Stripe payments processing $50K+ with PCI-safe fraud checks' },
                    { id: 'bullet-saved-21', text: 'Tuned Postgres schema and queries to cut page load times by 45%' }
                  ]
                },
                {
                  id: 'proj-saved-3',
                  name: 'Real-time Chat Application',
                  description: 'WebSocket-based chat application with end-to-end encryption',
                  technologies: 'React, Node.js, Socket.io, MongoDB, Redis, Docker',
                  startDate: 'Jun 2020',
                  endDate: 'Aug 2020',
                  bullets: [
                    { id: 'bullet-saved-22', text: 'Built WebSocket chat supporting 500 users with persistent message storage' },
                    { id: 'bullet-saved-23', text: 'Implemented end-to-end encrypted messaging using the Web Crypto API' }
                  ]
                }
              ],
              customSections: [
                {
                  id: 'custom-saved-2',
                  title: 'Awards & Recognition',
                  subtitle: '',
                  bullets: [
                    { id: 'bullet-saved-24', text: 'Won Meta intern hackathon with an accessibility helper for visually impaired users' }
                  ]
                }
              ],
              jobDescription: 'Frontend Engineer role at Meta focusing on React, user experience, accessibility, and building scalable web applications...'
            }
          },
          {
            id: 'resume-3',
            name: 'Amazon - Full Stack SWE',
            createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
            updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
            data: {
              experiences: [
                {
                  id: 'exp-saved-4',
                  company: 'Google',
                  role: 'Software Engineer II',
                  startDate: 'Jun 2022',
                  endDate: 'Present',
                  bullets: [
                    { id: 'bullet-saved-28', text: 'Scaled Go/Python microservices for 10M+ daily requests while keeping uptime at 99.9%' },
                    { id: 'bullet-saved-29', text: 'Cut API latency 40% by tuning SQL and cache layers, saving $50K in annual infra costs' },
                    { id: 'bullet-saved-30', text: 'Created React WebSocket analytics dashboards so product could monitor live user behavior' }
                  ]
                },
                {
                  id: 'exp-saved-5',
                  company: 'Amazon Web Services',
                  role: 'Software Development Engineer Intern',
                  startDate: 'Jun 2020',
                  endDate: 'Aug 2020',
                  bullets: [
                    { id: 'bullet-saved-31', text: 'Automated Java Spring tooling that saved 40 weekly hours on deployment prep' },
                    { id: 'bullet-saved-32', text: 'Built CloudWatch and Lambda alerts that halved incident detection time' },
                    { id: 'bullet-saved-33', text: 'Tuned DynamoDB and ElastiCache to cut query latency by 35%' }
                  ]
                }
              ],
              education: [
                {
                  id: 'edu-saved-3',
                  school: 'Stanford University',
                  degree: 'B.S.',
                  field: 'Computer Science',
                  startDate: 'Sep 2018',
                  endDate: 'Jun 2022',
                  bullets: [
                    { id: 'bullet-saved-34', text: 'GPA 3.9/4.0, Magna Cum Laude, Dean\'s List in every term' },
                    { id: 'bullet-saved-35', text: 'Core courses: Algorithms, Machine Learning, Distributed Systems, Databases' }
                  ]
                }
              ],
              projects: [
                {
                  id: 'proj-saved-4',
                  name: 'E-commerce Platform',
                  description: 'Full-stack e-commerce platform with payment integration',
                  technologies: 'React, Node.js, Express, PostgreSQL, Stripe API, AWS',
                  startDate: 'Sep 2020',
                  endDate: 'Dec 2021',
                  bullets: [
                    { id: 'bullet-saved-36', text: 'Shipped commerce app for 1000+ users with live inventory updates and order tracking' },
                    { id: 'bullet-saved-37', text: 'Implemented JWT RBAC to secure both admin and customer flows' },
                    { id: 'bullet-saved-38', text: 'Deployed on AWS EC2, RDS, S3, and CloudFront with backups and auto scaling' }
                  ]
                }
              ],
              customSections: [
                {
                  id: 'custom-saved-3',
                  title: 'Certifications',
                  subtitle: '',
                  bullets: [
                    { id: 'bullet-saved-39', text: 'AWS Certified Solutions Architect – Associate (2022)' },
                    { id: 'bullet-saved-40', text: 'Kubernetes Certified Application Developer (CKAD) (2023)' }
                  ]
                },
                {
                  id: 'custom-saved-4',
                  title: 'Certifications',
                  subtitle: '',
                  bullets: [
                    { id: 'bullet-saved-43', text: 'Google Cloud Professional Cloud Architect (2023)' }
                  ]
                }
              ],
              jobDescription: 'Full Stack Software Engineer position at Amazon focusing on building scalable web applications, cloud infrastructure, and microservices...'
            }
          }
        ];
        
        // Save mock resumes with their original timestamps
        for (const resume of mockSavedResumes) {
          await storageService.saveGeneratedResume(resume.name, resume.data, resume.createdAt);
        }
        
        
        // Reload the data to ensure it's displayed
        await loadResumeData();
      } else {
        // Data already exists, skip initialization
      }
    } catch (error) {
      console.error('❌ Error initializing mock data:', error);
    }
  }

  /**
   * Load resume from Chrome storage
   */
  async function loadResumeData() {
    setLoading(true);
    try {
      const data = await storageService.getResume();
      
      // Ensure all fields exist and calculate total bullets
      const normalizedData = {
        personalInfo: data.personalInfo && typeof data.personalInfo === 'object'
          ? {
              firstName: typeof data.personalInfo.firstName === 'string' ? data.personalInfo.firstName : '',
              lastName: typeof data.personalInfo.lastName === 'string' ? data.personalInfo.lastName : '',
              email: typeof data.personalInfo.email === 'string' ? data.personalInfo.email : '',
              phone: typeof data.personalInfo.phone === 'string' ? data.personalInfo.phone : '',
              linkedin: typeof data.personalInfo.linkedin === 'string' ? data.personalInfo.linkedin : '',
              github: typeof data.personalInfo.github === 'string' ? data.personalInfo.github : ''
            }
          : {
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              linkedin: '',
              github: ''
            },
        skills: Array.isArray(data.skills) ? data.skills : [],
        experiences: Array.isArray(data.experiences) ? data.experiences : [],
        education: Array.isArray(data.education) ? data.education : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        customSections: Array.isArray(data.customSections) ? data.customSections : []
      };

      normalizedData.totalBullets = calculateTotalBullets(normalizedData);
      
      
      setResume(normalizedData);
    } catch (error) {
      console.error('❌ Error loading resume:', error);
      // Set default empty state on error
      setResume({
        personalInfo: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          linkedin: '',
          github: ''
        },
        skills: [],
        experiences: [],
        education: [],
        projects: [],
        customSections: [],
        totalBullets: 0
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Force initialization function (for testing)
  async function forceInitializeMockData() {
    try {
      await storageService.clearResume();
      const existingSaved = await storageService.getSavedResumes();
      for (const resume of existingSaved) {
        await storageService.deleteSavedResume(resume.id);
      }
      await initializeMockData();
      await loadResumeData();
      alert('Mock data initialized! Check the console for details.');
    } catch (error) {
      console.error('Error force initializing:', error);
      alert('Error: ' + error.message);
    }
  }

  /**
   * Save resume to Chrome storage
   */
  async function saveResumeData(updatedResume, showNotification = true) {
    try {
      const totalBullets = calculateTotalBullets(updatedResume);
      const normalized = {
        personalInfo: updatedResume.personalInfo || {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          linkedin: '',
          github: ''
        },
        skills: Array.isArray(updatedResume.skills) ? updatedResume.skills : [],
        experiences: Array.isArray(updatedResume.experiences) ? updatedResume.experiences : [],
        education: Array.isArray(updatedResume.education) ? updatedResume.education : [],
        projects: Array.isArray(updatedResume.projects) ? updatedResume.projects : [],
        customSections: Array.isArray(updatedResume.customSections) ? updatedResume.customSections : [],
        totalBullets
      };

      console.log('💾 App: Saving resume data...', {
        experiences: normalized.experiences.length,
        education: normalized.education.length,
        projects: normalized.projects.length,
        customSections: normalized.customSections.length,
        skills: normalized.skills.length
      });

      await storageService.saveResume(normalized);
      setResume(normalized);
      if (showNotification) {
        success('Resume saved');
      }
      console.log('✅ App: Resume saved successfully');
    } catch (error) {
      console.error('❌ App: Error saving resume:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      if (showNotification) {
        const errorMsg = error.message || 'Failed to save resume to database. Check console for details.';
        showError(errorMsg);
      }
    }
  }

  /**
   * Calculate total bullets across all sections
   */
  function calculateTotalBullets(resumeData) {
    if (!resumeData) return 0;
    
    const skills = Array.isArray(resumeData.skills) ? resumeData.skills : [];
    const experiences = Array.isArray(resumeData.experiences) ? resumeData.experiences : [];
    const education = Array.isArray(resumeData.education) ? resumeData.education : [];
    const projects = Array.isArray(resumeData.projects) ? resumeData.projects : [];
    const customSections = Array.isArray(resumeData.customSections) ? resumeData.customSections : [];
    
    return (
      skills.reduce((sum, group) => sum + (Array.isArray(group?.skills) ? group.skills.filter(Boolean).length : 0), 0) +
      experiences.reduce((sum, exp) => sum + (Array.isArray(exp?.bullets) ? exp.bullets.length : 0), 0) +
      education.reduce((sum, edu) => sum + (Array.isArray(edu?.bullets) ? edu.bullets.length : 0), 0) +
      projects.reduce((sum, proj) => sum + (Array.isArray(proj?.bullets) ? proj.bullets.length : 0), 0) +
      customSections.reduce((sum, section) => sum + (Array.isArray(section?.bullets) ? section.bullets.length : 0), 0)
    );
  }

  /**
   * Handle refresh of saved resumes list
   */
  function handleResumeSaved() {
    // Trigger refresh by updating refresh trigger
    setRefreshSaved(prev => prev + 1);
    // Reload master resume so totals stay current
    loadResumeData();
  }

  function handleSelectionComplete() {
    // Tab opening removed - user no longer wants new tab to open after resume generation
  }

  async function handleSignUp(userData) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('resume_master_signed_in', 'true');
      if (userData?.email) {
        localStorage.setItem('resume_master_user_email', userData.email);
      }
      // Migrate old keys
      localStorage.setItem('resumax_signed_in', 'true');
      if (userData?.email) {
        localStorage.setItem('resumax_user_email', userData.email);
      }
      setIsSignedIn(true);
      setShowSignUp(false);
    }
  }

  async function handleSignIn(userData) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('resume_master_signed_in', 'true');
      if (userData?.email) {
        localStorage.setItem('resume_master_user_email', userData.email);
      }
      // Migrate old keys
      localStorage.setItem('resumax_signed_in', 'true');
      if (userData?.email) {
        localStorage.setItem('resumax_user_email', userData.email);
      }
      
      // Check if this is the test user (123@test.com with password 123@)
      const isTest = userData?.email === '123@test.com' && userData?.password === '123@';
      if (isTest) {
        localStorage.setItem('resume_master_is_test_user', 'true');
        localStorage.setItem('resumax_is_test_user', 'true');
      } else {
        localStorage.removeItem('resume_master_is_test_user');
        localStorage.removeItem('resumax_is_test_user');
      }
    }
    
    // Clear any existing resume state before loading new user's data
    setResume({
      personalInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        linkedin: '',
        github: ''
      },
      skills: [],
      experiences: [],
      education: [],
      projects: [],
      customSections: [],
      totalBullets: 0
    });
    
    setIsSignedIn(true);
    setLoading(true);
    
    // Wait a bit for Supabase session to be established
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if user has existing data
    try {
      const existingResume = await storageService.getResume();
      const savedResumes = await storageService.getSavedResumes();
      
      const hasMasterData = 
        (existingResume.experiences && existingResume.experiences.length > 0) ||
        (existingResume.education && existingResume.education.length > 0) ||
        (existingResume.projects && existingResume.projects.length > 0) ||
        (existingResume.customSections && existingResume.customSections.length > 0);
      
      // For test user, always initialize mock data
      const isTest = userData?.email === '123@test.com' && userData?.password === '123@';
      if (isTest) {
        // Auto-load mock data for test user
        await initializeMockData();
        await loadResumeData();
        setLoading(false);
        return;
      }
      
      // Show onboarding if no data exists
      if (!hasMasterData && savedResumes.length === 0) {
        setShowOnboarding(true);
        setLoading(false);
      } else {
        // User has data, load it normally
        await loadResumeData();
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error checking data after sign-in:', error);
      setLoading(false);
    }
  }

  async function handleOnboardingUpload(parsedResume, fileData) {
    try {
      setLoading(true);
      
      // Save the parsed resume data
      const resumeToSave = {
        ...parsedResume,
        totalBullets: calculateTotalBullets(parsedResume)
      };
      
      await storageService.saveResume(resumeToSave);
      await loadResumeData();
      
      setShowOnboarding(false);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error saving uploaded resume:', error);
      alert('Failed to save uploaded resume. Please try again.');
      setLoading(false);
    }
  }

  function handleOnboardingSkip() {
    // User chose to enter manually - initialize with empty data
    setShowOnboarding(false);
    setLoading(false);
    // Data will be empty, user can start filling it in manually
  }

  async function handleSignOut() {
    // IMPORTANT: Only clear local UI state and Chrome storage cache
    // DO NOT delete data from Supabase - it should persist per user
    
    // Sign out from Supabase first (this only clears the session, not the data)
    await supabase.auth.signOut();
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('resume_master_signed_in');
      localStorage.removeItem('resume_master_user_email');
      localStorage.removeItem('resume_master_is_test_user');
      // Remove old keys
      localStorage.removeItem('resumax_signed_in');
      localStorage.removeItem('resumax_user_email');
      localStorage.removeItem('resumax_is_test_user');
    }
    
    // Set signed in to false first (this will show the sign-in screen)
    setIsSignedIn(false);
    
    // Clear Chrome storage cache AFTER UI transition (local cache only, not Supabase data)
    // This is just a cache - the real data stays in Supabase
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(['resume', 'savedResumes'], () => {
        console.log('✅ Cleared local Chrome storage cache (Supabase data preserved)');
      });
    }
    
    // Don't clear resume state immediately - let it persist visually
    // It will be cleared when a new user signs in (in handleSignIn)
    // This prevents the visual "flash" of empty data during sign-out transition
    
    console.log('✅ Signed out - session cleared, Supabase data preserved');
  }

  const tabs = [
    { id: 'master', label: 'Master Resume' },
    { id: 'generate', label: 'Generate New Resume' },
    { id: 'saved', label: 'Saved Resumes' }
  ];

  if (!isManagerView) {
    // If not signed in, show loading while redirecting
    if (!isSignedIn) {
      return (
        <div className="popup-container">
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          <header className="popup-header">
            <div className="popup-logo">
              <div className="popup-logo-icon">
                <Icon name="sparkles" size={20} />
              </div>
              <h1>Resume Master</h1>
            </div>
            <p className="popup-subtitle">Redirecting to sign in...</p>
          </header>
          <main className="popup-main">
            <div className="popup-loading">
              <div className="popup-loading-spinner"></div>
              <div className="popup-loading-text">Please sign in to continue</div>
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="popup-container">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <header className="popup-header">
          <div className="popup-logo">
            <div className="popup-logo-icon">
              <Icon name="sparkles" size={20} />
            </div>
            <h1>Resume Master</h1>
          </div>
          <p className="popup-subtitle">Extract or paste a job description and pick the best bullets fast.</p>
          <div className="popup-header-actions">
            <button className="btn popup-btn" onClick={openManagerPage}>
              Open Manager
            </button>
          </div>
        </header>
        <main className="popup-main">
          {loading ? (
            <div className="popup-skeleton">
              <div className="popup-skeleton-header">
                <Skeleton height="24px" width="60%" />
                <Skeleton height="16px" width="80%" />
              </div>
              <SkeletonCard />
            </div>
          ) : (
            <div className="popup-card">
              <GenerateResume
                masterResume={resume}
                onSave={handleResumeSaved}
                onSelectionComplete={handleSelectionComplete}
              />
            </div>
          )}
        </main>
      </div>
    );
  }

  // Show sign-in or sign-up page if not signed in and in manager view
  if (isManagerView && !isSignedIn) {
    if (showSignUp) {
      return (
        <div className="app app-manager">
          <SignUp 
            onSignUp={handleSignUp} 
            onSwitchToSignIn={() => setShowSignUp(false)}
          />
        </div>
      );
    }
    return (
      <div className="app app-manager">
        <SignIn 
          onSignIn={handleSignIn} 
          onSwitchToSignUp={() => setShowSignUp(true)}
        />
      </div>
    );
  }

  // Show onboarding if user just signed in and has no data
  if (isManagerView && isSignedIn && showOnboarding) {
    return (
      <div className="app app-manager">
        <Onboarding
          onUploadComplete={handleOnboardingUpload}
          onSkip={handleOnboardingSkip}
        />
      </div>
    );
  }

  return (
    <div className={`app ${isManagerView ? 'app-manager' : ''}`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {isManagerView && isSignedIn && (
        <SideNav
          activeView={activeView}
          onViewChange={setActiveView}
          userEmail={localStorage.getItem('resume_master_user_email') || localStorage.getItem('resumax_user_email') || ''}
          onSignOut={handleSignOut}
        />
      )}
      
      <div className={`app-content ${isManagerView && isSignedIn ? 'with-sidebar' : ''} page-transition`}>
        {isManagerView && isSignedIn && isTestUser() && (
          <div style={{ padding: '16px', background: '#fef3c7', borderBottom: '1px solid #fde68a' }}>
            <button
              onClick={forceInitializeMockData}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              <Icon name="refresh" size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
              Force Load Mock Data
            </button>
          </div>
        )}

        <main className="app-main">
          {activeView === 'about' && (
            <About />
          )}

          {activeView === 'tips' && (
            <ResumeTips />
          )}

          {activeView === 'profile' && (
            <Profile
              resume={resume}
              onResumeUpdate={saveResumeData}
              calculateTotalBullets={calculateTotalBullets}
            />
          )}

          {activeView === 'generate' && (
            <div className="view-container">
              <div className="view-content">
                <GenerateResume
                  masterResume={resume}
                  onSave={handleResumeSaved}
                  onSelectionComplete={handleSelectionComplete}
                  hideExtract={true}
                />
              </div>
            </div>
          )}

          {activeView === 'saved' && (
            <div className="view-container">
              <div className="view-content">
                <SavedResumes
                  onLoadResume={handleResumeSaved}
                  refreshTrigger={refreshSaved}
                  masterResume={resume}
                />
              </div>
            </div>
          )}

          {activeView === 'community' && (
            <Community />
          )}

          {activeView === 'coaching' && (
            <ResumeCoaching />
          )}

          {activeView === 'coaching-ai' && (
            <div className="view-container">
              <div className="view-header">
                <h1>AI Coach</h1>
                <p className="view-subtitle">Get AI-powered feedback and suggestions for your resume</p>
              </div>
              <div className="view-content">
                <div className="coaching-placeholder">
                  <div className="placeholder-icon">
                    <Icon name="bot" size={48} />
                  </div>
                  <h2>AI Coach Coming Soon</h2>
                  <p>AI-powered resume coaching features will be available here soon.</p>
                  <p className="placeholder-subtext">
                    Get instant feedback, improvement suggestions, and personalized recommendations
                    powered by advanced AI.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeView === 'coaching-human' && (
            <div className="view-container">
              {humanCritiqueView === 'selection' && (
                <HumanCritiqueSelection 
                  onSelectOption={(option) => {
                    if (option === 'review') {
                      setHumanCritiqueView('review');
                    } else if (option === 'get-reviewed') {
                      setHumanCritiqueView('get-reviewed');
                    }
                  }}
                />
              )}
              {humanCritiqueView === 'review' && (
                <ReviewResume 
                  onBack={() => setHumanCritiqueView('selection')}
                />
              )}
              {humanCritiqueView === 'get-reviewed' && (
                <HaveResumeReviewed 
                  onBack={() => setHumanCritiqueView('selection')}
                />
              )}
            </div>
          )}

          {/* Legacy tab-based view for non-manager */}
          {!isManagerView && (
            <>
              <Tabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

              {/* Tab 1: Master Resume */}
              {activeTab === 'master' && (
          <section className="section">
            <h2>Master Resume</h2>
            <p className="section-subtitle">
              Total Bullets: {resume.totalBullets} • Add unlimited bullet points per experience
            </p>

            {/* Personal Information */}
            <div className="resume-section-group">
              <h3 className="section-group-title">Personal Information</h3>
              <PersonalInfoEditor
                value={resume.personalInfo}
                onChange={(updatedInfo) => {
                  saveResumeData({
                    ...resume,
                    personalInfo: updatedInfo
                  });
                }}
              />
            </div>

            {/* Skills Section */}
            <div className="resume-section-group">
              <h3 className="section-group-title">Skills</h3>
              <SkillsEditor
                skills={resume.skills}
                onChange={(updatedSkills) => {
                  saveResumeData({
                    ...resume,
                    skills: updatedSkills
                  });
                }}
              />
            </div>

          {/* Work Experience Section */}
          <div className="resume-section-group">
            <h3 className="section-group-title">Work Experience</h3>
            
            {(!resume.experiences || resume.experiences.length === 0) ? (
              <div className="empty-state">
                <p>No experiences yet. Add your first work experience!</p>
              </div>
            ) : (
              resume.experiences.map(experience => (
                <ExperienceEditor
                  key={experience.id}
                  experience={experience}
                  onUpdate={(updatedExp) => {
                    const updated = resume.experiences.map(exp =>
                      exp.id === updatedExp.id ? updatedExp : exp
                    );
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      experiences: updated
                    });
                    saveResumeData({
                      ...resume,
                      experiences: updated,
                      totalBullets
                    });
                  }}
                  onDelete={(expId) => {
                    const updated = resume.experiences.filter(exp => exp.id !== expId);
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      experiences: updated
                    });
                    saveResumeData({
                      ...resume,
                      experiences: updated,
                      totalBullets
                    });
                  }}
                />
              ))
            )}
            
            <button
              className="btn btn-primary btn-add"
              onClick={() => {
                const newExp = {
                  id: `exp-${Date.now()}`,
                  company: '',
                  role: '',
                  startDate: '',
                  endDate: '',
                  bullets: []
                };
                saveResumeData({
                  ...resume,
                  experiences: [...resume.experiences, newExp]
                });
              }}
            >
              + Add Experience
            </button>
          </div>

          {/* Education Section */}
          <div className="resume-section-group">
            <h3 className="section-group-title">Education</h3>
            
            {(!resume.education || resume.education.length === 0) ? (
              <div className="empty-state">
                <p>No education entries yet. Add your first education!</p>
              </div>
            ) : (
              resume.education.map(edu => (
                <EducationEditor
                  key={edu.id}
                  education={edu}
                  onUpdate={(updatedEdu) => {
                    const updated = resume.education.map(e =>
                      e.id === updatedEdu.id ? updatedEdu : e
                    );
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      education: updated
                    });
                    saveResumeData({
                      ...resume,
                      education: updated,
                      totalBullets
                    });
                  }}
                  onDelete={(eduId) => {
                    const updated = resume.education.filter(e => e.id !== eduId);
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      education: updated
                    });
                    saveResumeData({
                      ...resume,
                      education: updated,
                      totalBullets
                    });
                  }}
                />
              ))
            )}
            
            <button
              className="btn btn-primary btn-add"
              onClick={() => {
                const newEdu = {
                  id: `edu-${Date.now()}`,
                  school: '',
                  degree: '',
                  field: '',
                  startDate: '',
                  endDate: '',
                  bullets: []
                };
                saveResumeData({
                  ...resume,
                  education: [...resume.education, newEdu]
                });
              }}
            >
              + Add Education
            </button>
          </div>

          {/* Projects Section */}
          <div className="resume-section-group">
            <h3 className="section-group-title">Projects</h3>
            
            {(!resume.projects || resume.projects.length === 0) ? (
              <div className="empty-state">
                <p>No projects yet. Add your first project!</p>
              </div>
            ) : (
              resume.projects.map(project => (
                <ProjectEditor
                  key={project.id}
                  project={project}
                  onUpdate={(updatedProj) => {
                    const updated = resume.projects.map(p =>
                      p.id === updatedProj.id ? updatedProj : p
                    );
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      projects: updated
                    });
                    saveResumeData({
                      ...resume,
                      projects: updated,
                      totalBullets
                    });
                  }}
                  onDelete={(projId) => {
                    const updated = resume.projects.filter(p => p.id !== projId);
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      projects: updated
                    });
                    saveResumeData({
                      ...resume,
                      projects: updated,
                      totalBullets
                    });
                  }}
                />
              ))
            )}
            
            <button
              className="btn btn-primary btn-add"
              onClick={() => {
                const newProj = {
                  id: `proj-${Date.now()}`,
                  name: '',
                  description: '',
                  technologies: '',
                  startDate: '',
                  endDate: '',
                  bullets: []
                };
                saveResumeData({
                  ...resume,
                  projects: [...resume.projects, newProj]
                });
              }}
            >
              + Add Project
            </button>
          </div>

          {/* Custom Sections */}
          <div className="resume-section-group">
            <h3 className="section-group-title">Custom Sections</h3>
            
            {(!resume.customSections || resume.customSections.length === 0) ? (
              <div className="empty-state">
                <p>No custom sections yet. Add certifications, skills, awards, etc.!</p>
              </div>
            ) : (
              resume.customSections.map(section => (
                <CustomSectionEditor
                  key={section.id}
                  section={section}
                  onUpdate={(updatedSection) => {
                    const updated = resume.customSections.map(s =>
                      s.id === updatedSection.id ? updatedSection : s
                    );
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      customSections: updated
                    });
                    saveResumeData({
                      ...resume,
                      customSections: updated,
                      totalBullets
                    });
                  }}
                  onDelete={(sectionId) => {
                    const updated = resume.customSections.filter(s => s.id !== sectionId);
                    const totalBullets = calculateTotalBullets({
                      ...resume,
                      customSections: updated
                    });
                    saveResumeData({
                      ...resume,
                      customSections: updated,
                      totalBullets
                    });
                  }}
                />
              ))
            )}
            
            <button
              className="btn btn-primary btn-add"
              onClick={() => {
                const newSection = {
                  id: `custom-${Date.now()}`,
                  title: '',
                  subtitle: '',
                  bullets: []
                };
                saveResumeData({
                  ...resume,
                  customSections: [...resume.customSections, newSection]
                });
              }}
            >
              + Add Custom Section
            </button>
          </div>
        </section>
        )}

              {/* Tab 2: Generate New Resume */}
              {activeTab === 'generate' && (
                <GenerateResume
                  masterResume={resume}
                  onSave={handleResumeSaved}
                />
              )}

              {/* Tab 3: Saved Resumes */}
              {activeTab === 'saved' && (
                <SavedResumes 
                  onLoadResume={handleResumeSaved} 
                  refreshTrigger={refreshSaved}
                  masterResume={resume}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;


