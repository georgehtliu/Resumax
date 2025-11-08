import React, { useState, useEffect } from 'react';
import ExperienceEditor from './components/ExperienceEditor';
import EducationEditor from './components/EducationEditor';
import ProjectEditor from './components/ProjectEditor';
import CustomSectionEditor from './components/CustomSectionEditor';
import PersonalInfoEditor from './components/PersonalInfoEditor';
import SkillsEditor from './components/SkillsEditor';
import Tabs from './components/Tabs';
import GenerateResume from './components/GenerateResume';
import SavedResumes from './components/SavedResumes';
import { storageService } from './services/storage';
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

  const [activeTab, setActiveTab] = useState(() => (isManagerView ? 'master' : 'generate'));
  const [refreshSaved, setRefreshSaved] = useState(0);
  const [loading, setLoading] = useState(true);
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

  // Load resume data on mount and initialize mock data if needed
  useEffect(() => {
    async function init() {
      console.log('🔄 Starting initialization...');
      await initializeMockData();
      // Always load after initialization check
      await loadResumeData();
      console.log('✅ Initialization complete');
    }
    init();
  }, []);

  /**
   * Initialize mock data if no data exists
   */
  async function initializeMockData() {
    try {
      console.log('📋 Checking for existing data...');
      const existingResume = await storageService.getResume();
      const savedResumes = await storageService.getSavedResumes();
      
      console.log('Existing resume:', {
        experiences: existingResume.experiences?.length || 0,
        education: existingResume.education?.length || 0,
        projects: existingResume.projects?.length || 0,
        customSections: existingResume.customSections?.length || 0,
        totalBullets: existingResume.totalBullets
      });
      console.log('Saved resumes count:', savedResumes.length);
      
      // Check if there's actual data (not just totalBullets, but actual bullets)
      const hasMasterData = 
        (existingResume.experiences && existingResume.experiences.length > 0) ||
        (existingResume.education && existingResume.education.length > 0) ||
        (existingResume.projects && existingResume.projects.length > 0) ||
        (existingResume.customSections && existingResume.customSections.length > 0);
      
      console.log('Has master data?', hasMasterData);
      
      // FOR TESTING: Force initialization if localStorage has a flag
      const forceInit = localStorage.getItem('forceInitMockData') === 'true';
      if (forceInit) {
        console.log('🔧 FORCE INITIALIZATION MODE - Clearing existing data...');
        localStorage.removeItem('forceInitMockData');
      }
      
      // Only initialize if no data exists OR force init is enabled
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
        console.log('🚀 Initializing mock data...');
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
                { id: 'bullet-1', text: 'Developed and maintained microservices handling 10M+ daily requests using Python, Go, and Kubernetes, ensuring 99.9% uptime' },
                { id: 'bullet-2', text: 'Optimized database queries and caching strategies, reducing API response time by 40% and saving $50K annually in infrastructure costs' },
                { id: 'bullet-3', text: 'Led a team of 3 engineers to ship a new recommendation feature that increased user engagement by 25% and generated $2M in additional revenue' },
                { id: 'bullet-4', text: 'Implemented comprehensive CI/CD pipelines using Jenkins, Docker, and Kubernetes, reducing deployment time by 60% and enabling daily releases' },
                { id: 'bullet-5', text: 'Designed and built RESTful and gRPC APIs serving 5M+ requests per day with sub-100ms latency, improving mobile app performance by 30%' },
                { id: 'bullet-6', text: 'Collaborated with product managers and designers to define technical requirements, architecture, and success metrics for new features' },
                { id: 'bullet-7', text: 'Mentored 2 junior engineers through code reviews, pair programming, and technical design discussions, improving team velocity by 20%' },
                { id: 'bullet-8', text: 'Built real-time analytics dashboard using React and WebSockets, enabling product team to monitor user behavior and make data-driven decisions' },
                { id: 'bullet-52', text: 'Rolled out chaos engineering experiments with automated rollback policies, reducing production incident MTTR from 45 minutes to 12 minutes' },
                { id: 'bullet-53', text: 'Implemented adaptive rate limiting and circuit breakers across 30+ services, eliminating cascading failures during seasonal traffic spikes' },
                { id: 'bullet-54', text: 'Led migration from self-managed Kafka to Google Pub/Sub, cutting infrastructure costs by 18% and improving message durability SLAs' },
                { id: 'bullet-55', text: 'Authored service level objectives (SLOs) and burn-rate alerts that drove a 35% reduction in customer-facing errors quarter over quarter' },
                { id: 'bullet-56', text: 'Designed feature flag governance workflow integrating LaunchDarkly with automated integration tests, enabling safe canary releases to 5% of traffic' },
                { id: 'bullet-57', text: 'Partnered with security to introduce mutual TLS and fine-grained IAM policies across internal APIs, passing SOC 2 audits with zero findings' },
                { id: 'bullet-58', text: 'Optimized data pipeline by batching protobuf payloads and compressing over gRPC, lowering network throughput usage by 28%' },
                { id: 'bullet-59', text: 'Created internal developer portal with service templates and golden paths, cutting new microservice bootstrap time from 2 weeks to 4 days' },
                { id: 'bullet-60', text: 'Piloted on-call automation using incident triage bots, auto-resolving 40% of low-severity alerts without human intervention' },
                { id: 'bullet-61', text: 'Coordinated cross-team load testing program simulating 5x peak traffic, validating capacity plans ahead of Black Friday launch' }
              ]
            },
            {
              id: 'exp-2',
              company: 'Meta',
              role: 'Software Engineering Intern',
              startDate: 'Jun 2021',
              endDate: 'Aug 2021',
              bullets: [
                { id: 'bullet-9', text: 'Built React components for Facebook Marketplace improving user interface accessibility and mobile responsiveness, increasing conversion rate by 15%' },
                { id: 'bullet-10', text: 'Implemented real-time notification system using WebSocket connections and Redis, reducing latency by 30% and improving user engagement' },
                { id: 'bullet-11', text: 'Optimized GraphQL API endpoints and data fetching strategies, reducing server load by 25% and improving page load times' },
                { id: 'bullet-12', text: 'Participated in code reviews and contributed to team best practices documentation, improving code quality and onboarding efficiency' },
                { id: 'bullet-13', text: 'Developed A/B testing framework for feature rollouts, enabling data-driven product decisions and reducing risk of regressions' },
                { id: 'bullet-62', text: 'Redesigned image upload pipeline with client-side resizing and caching headers, shrinking payload sizes by 60% and lowering CDN egress fees' },
                { id: 'bullet-63', text: 'Introduced storybook-driven development for shared UI modules, cutting regression bugs in consumer surfaces by 45%' },
                { id: 'bullet-64', text: 'Collaborated with design to implement accessibility-first components meeting WCAG AA contrast and keyboard navigation standards' },
                { id: 'bullet-65', text: 'Instrumented Marketplace funnels with analytics events and dashboards, uncovering a pricing entry friction that improved conversion 9%' },
                { id: 'bullet-66', text: 'Automated screenshot diff testing for top flows, preventing visual regressions during weekly launches' },
                { id: 'bullet-67', text: 'Built experiments service wrapper that reduced boilerplate by 70% and enforced consistent logging across teams' },
                { id: 'bullet-68', text: 'Implemented optimistic UI updates with reconciliation to reduce perceived latency from 400ms to 120ms on key interactions' },
                { id: 'bullet-69', text: 'Partnered with spam detection team to add client-side heuristics, preventing 15K fake listings per week before reaching backend filters' },
                { id: 'bullet-70', text: 'Documented end-to-end developer setup and introduced npm workspaces, lowering onboarding time for interns from 3 days to 1 day' },
                { id: 'bullet-71', text: 'Delivered weekly release readiness reviews ensuring experiment guardrails and logging were in place before ship' }
              ]
            },
            {
              id: 'exp-3',
              company: 'Amazon Web Services',
              role: 'Software Development Engineer Intern',
              startDate: 'Jun 2020',
              endDate: 'Aug 2020',
              bullets: [
                { id: 'bullet-14', text: 'Developed internal tools using Java and Spring Boot to automate deployment processes, reducing manual work by 40 hours per week' },
                { id: 'bullet-15', text: 'Built monitoring and alerting system for AWS services using CloudWatch and Lambda, improving incident detection time by 50%' },
                { id: 'bullet-16', text: 'Optimized database queries and implemented caching layer using DynamoDB and ElastiCache, reducing query latency by 35%' },
                { id: 'bullet-17', text: 'Collaborated with senior engineers on distributed systems design, learning best practices for scalability and reliability' },
                { id: 'bullet-72', text: 'Containerized legacy batch jobs and deployed them on AWS Fargate, lowering infrastructure maintenance overhead for the ops team' },
                { id: 'bullet-73', text: 'Implemented blue/green deployment strategy for internal APIs, eliminating downtime during release cycles' },
                { id: 'bullet-74', text: 'Created CloudFormation templates and reusable modules, standardizing VPC and IAM provisioning across service teams' },
                { id: 'bullet-75', text: 'Instrumented Lambda functions with structured logging and X-Ray traces, reducing root cause analysis time by 30%' },
                { id: 'bullet-76', text: 'Automated compliance checks using AWS Config rules, ensuring 100% adherence to encryption and tagging policies' },
                { id: 'bullet-77', text: 'Optimized S3 object lifecycle policies, cutting monthly storage spend by 12% without impacting retrieval SLAs' },
                { id: 'bullet-78', text: 'Developed a resilience playbook with runbooks and dashboards, enabling L1 support to resolve 25% of incidents independently' },
                { id: 'bullet-79', text: 'Added fine-grained CloudWatch alarms integrated with PagerDuty, improving signal-to-noise ratio of alerts by 50%' },
                { id: 'bullet-80', text: 'Ran load tests simulating seasonal peaks and delivered capacity recommendations adopted by three partner services' },
                { id: 'bullet-81', text: 'Collaborated with customer solutions architects to onboard two enterprise clients, ensuring deployments met security benchmarks' }
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
                { id: 'bullet-18', text: 'GPA: 3.9/4.0, Magna Cum Laude, Dean\'s List all semesters' },
                { id: 'bullet-19', text: 'Relevant Coursework: Algorithms & Data Structures, Machine Learning, Distributed Systems, Database Systems, Computer Networks' },
                { id: 'bullet-20', text: 'Teaching Assistant for CS161 (Design and Analysis of Algorithms) - graded assignments and held office hours for 50+ students' },
                { id: 'bullet-21', text: 'Research Assistant in Machine Learning Lab - worked on deep learning models for computer vision applications' }
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
                { id: 'bullet-22', text: 'Built scalable task scheduler handling 100K+ concurrent tasks using Go and Kubernetes, achieving 99.95% reliability' },
                { id: 'bullet-23', text: 'Implemented distributed consensus algorithm using Raft protocol for leader election and task coordination across nodes' },
                { id: 'bullet-24', text: 'Designed fault-tolerant architecture with automatic failover and task replication, ensuring zero data loss during node failures' },
                { id: 'bullet-25', text: 'Created monitoring dashboard using Prometheus and Grafana, enabling real-time visibility into system performance and health' }
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
                { id: 'bullet-26', text: 'Built scalable web application supporting 1000+ concurrent users with real-time inventory updates and order processing' },
                { id: 'bullet-27', text: 'Integrated Stripe payment processing handling $50K+ in transactions with PCI compliance and fraud detection' },
                { id: 'bullet-28', text: 'Implemented JWT-based authentication and authorization with role-based access control for admin and customer roles' },
                { id: 'bullet-29', text: 'Deployed on AWS using EC2, RDS, S3, and CloudFront with automated backup, monitoring, and auto-scaling capabilities' },
                { id: 'bullet-30', text: 'Optimized database schema and queries, reducing page load time by 45% and improving user experience metrics' }
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
                { id: 'bullet-31', text: 'Trained neural network model achieving 85% accuracy in content recommendations using collaborative and content-based filtering' },
                { id: 'bullet-32', text: 'Processed and cleaned dataset of 1M+ user interactions using pandas and numpy, implementing feature engineering pipeline' },
                { id: 'bullet-33', text: 'Created REST API serving recommendations with average response time of 50ms, handling 10K+ requests per minute' },
                { id: 'bullet-34', text: 'Implemented caching layer using Redis to reduce model inference time by 70% and improve user experience' }
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
                { id: 'bullet-35', text: 'Developed real-time messaging application supporting 500+ concurrent users with WebSocket connections and message persistence' },
                { id: 'bullet-36', text: 'Implemented end-to-end encryption using Web Crypto API, ensuring user privacy and data security' },
                { id: 'bullet-37', text: 'Built scalable backend using Node.js and MongoDB with Redis caching, achieving sub-100ms message delivery latency' }
              ]
            }
          ],
          customSections: [
            {
              id: 'custom-2',
              title: 'Awards & Recognition',
              subtitle: '',
              bullets: [
                { id: 'bullet-45', text: 'Google Hackathon Winner - Best Technical Implementation (2022) - Built AI-powered code review tool' },
                { id: 'bullet-46', text: 'Stanford Engineering Excellence Award (2021) - Top 5% of Computer Science graduating class' },
                { id: 'bullet-47', text: 'Published research paper on distributed consensus algorithms in ACM Conference on Distributed Computing (2021)' },
                { id: 'bullet-48', text: 'Meta Intern Hackathon - First Place (2021) - Developed accessibility tool for visually impaired users' }
              ]
            },
            {
              id: 'custom-3',
              title: 'Certifications',
              subtitle: '',
              bullets: [
                { id: 'bullet-49', text: 'AWS Certified Solutions Architect - Associate (2022)' },
                { id: 'bullet-50', text: 'Kubernetes Certified Application Developer (CKAD) (2023)' },
                { id: 'bullet-51', text: 'Google Cloud Professional Cloud Architect (2023)' }
              ]
            }
          ],
          totalBullets: 0
        };
        
        mockMasterResume.totalBullets = calculateTotalBullets(mockMasterResume);
        console.log('Saving master resume with', mockMasterResume.totalBullets, 'total bullets');
        await storageService.saveResume(mockMasterResume);
        console.log('Master resume saved successfully');
        
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
                    { id: 'bullet-saved-1', text: 'Developed and maintained microservices handling 10M+ daily requests using Python, Go, and Kubernetes, ensuring 99.9% uptime' },
                    { id: 'bullet-saved-2', text: 'Optimized database queries and caching strategies, reducing API response time by 40% and saving $50K annually in infrastructure costs' },
                    { id: 'bullet-saved-3', text: 'Implemented comprehensive CI/CD pipelines using Jenkins, Docker, and Kubernetes, reducing deployment time by 60% and enabling daily releases' },
                    { id: 'bullet-saved-4', text: 'Designed and built RESTful and gRPC APIs serving 5M+ requests per day with sub-100ms latency, improving mobile app performance by 30%' }
                  ]
                },
                {
                  id: 'exp-saved-2',
                  company: 'Amazon Web Services',
                  role: 'Software Development Engineer Intern',
                  startDate: 'Jun 2020',
                  endDate: 'Aug 2020',
                  bullets: [
                    { id: 'bullet-saved-5', text: 'Developed internal tools using Java and Spring Boot to automate deployment processes, reducing manual work by 40 hours per week' },
                    { id: 'bullet-saved-6', text: 'Built monitoring and alerting system for AWS services using CloudWatch and Lambda, improving incident detection time by 50%' }
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
                    { id: 'bullet-saved-7', text: 'GPA: 3.9/4.0, Magna Cum Laude, Dean\'s List all semesters' },
                    { id: 'bullet-saved-8', text: 'Relevant Coursework: Algorithms & Data Structures, Distributed Systems, Database Systems, Computer Networks' }
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
                    { id: 'bullet-saved-9', text: 'Built scalable task scheduler handling 100K+ concurrent tasks using Go and Kubernetes, achieving 99.95% reliability' },
                    { id: 'bullet-saved-10', text: 'Implemented distributed consensus algorithm using Raft protocol for leader election and task coordination across nodes' }
                  ]
                }
              ],
              customSections: [
                {
                  id: 'custom-saved-1',
                  title: 'Technical Skills',
                  subtitle: '',
                  bullets: [
                    { id: 'bullet-saved-11', text: 'Languages: Python, Go, Java, C++, SQL' },
                    { id: 'bullet-saved-12', text: 'Backend: Node.js, Django, Spring Boot, GraphQL, gRPC, REST APIs' },
                    { id: 'bullet-saved-13', text: 'DevOps: Docker, Kubernetes, Jenkins, AWS (EC2, S3, RDS, Lambda), CI/CD' },
                    { id: 'bullet-saved-14', text: 'Concepts: Microservices, Distributed Systems, System Design' }
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
                    { id: 'bullet-saved-15', text: 'Built React components for Facebook Marketplace improving user interface accessibility and mobile responsiveness, increasing conversion rate by 15%' },
                    { id: 'bullet-saved-16', text: 'Implemented real-time notification system using WebSocket connections and Redis, reducing latency by 30% and improving user engagement' },
                    { id: 'bullet-saved-17', text: 'Optimized GraphQL API endpoints and data fetching strategies, reducing server load by 25% and improving page load times' }
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
                    { id: 'bullet-saved-18', text: 'GPA: 3.9/4.0, Magna Cum Laude' }
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
                    { id: 'bullet-saved-19', text: 'Built scalable web application supporting 1000+ concurrent users with real-time inventory updates and order processing' },
                    { id: 'bullet-saved-20', text: 'Integrated Stripe payment processing handling $50K+ in transactions with PCI compliance and fraud detection' },
                    { id: 'bullet-saved-21', text: 'Optimized database schema and queries, reducing page load time by 45% and improving user experience metrics' }
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
                    { id: 'bullet-saved-22', text: 'Developed real-time messaging application supporting 500+ concurrent users with WebSocket connections and message persistence' },
                    { id: 'bullet-saved-23', text: 'Implemented end-to-end encryption using Web Crypto API, ensuring user privacy and data security' }
                  ]
                }
              ],
              customSections: [
                {
                  id: 'custom-saved-2',
                  title: 'Technical Skills',
                  subtitle: '',
                  bullets: [
                    { id: 'bullet-saved-24', text: 'Languages: JavaScript, TypeScript, Python, SQL' },
                    { id: 'bullet-saved-25', text: 'Frontend: React, Redux, Next.js, HTML5, CSS3, WebSocket' },
                    { id: 'bullet-saved-26', text: 'Backend: Node.js, Express, GraphQL, REST APIs' },
                    { id: 'bullet-saved-27', text: 'Tools: Git, Docker, AWS, Jest, React Testing Library' }
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
                    { id: 'bullet-saved-28', text: 'Developed and maintained microservices handling 10M+ daily requests using Python, Go, and Kubernetes, ensuring 99.9% uptime' },
                    { id: 'bullet-saved-29', text: 'Optimized database queries and caching strategies, reducing API response time by 40% and saving $50K annually in infrastructure costs' },
                    { id: 'bullet-saved-30', text: 'Built real-time analytics dashboard using React and WebSockets, enabling product team to monitor user behavior and make data-driven decisions' }
                  ]
                },
                {
                  id: 'exp-saved-5',
                  company: 'Amazon Web Services',
                  role: 'Software Development Engineer Intern',
                  startDate: 'Jun 2020',
                  endDate: 'Aug 2020',
                  bullets: [
                    { id: 'bullet-saved-31', text: 'Developed internal tools using Java and Spring Boot to automate deployment processes, reducing manual work by 40 hours per week' },
                    { id: 'bullet-saved-32', text: 'Built monitoring and alerting system for AWS services using CloudWatch and Lambda, improving incident detection time by 50%' },
                    { id: 'bullet-saved-33', text: 'Optimized database queries and implemented caching layer using DynamoDB and ElastiCache, reducing query latency by 35%' }
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
                    { id: 'bullet-saved-34', text: 'GPA: 3.9/4.0, Magna Cum Laude' },
                    { id: 'bullet-saved-35', text: 'Relevant Coursework: Algorithms & Data Structures, Distributed Systems, Database Systems' }
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
                    { id: 'bullet-saved-36', text: 'Built scalable web application supporting 1000+ concurrent users with real-time inventory updates and order processing' },
                    { id: 'bullet-saved-37', text: 'Implemented JWT-based authentication and authorization with role-based access control for admin and customer roles' },
                    { id: 'bullet-saved-38', text: 'Deployed on AWS using EC2, RDS, S3, and CloudFront with automated backup, monitoring, and auto-scaling capabilities' }
                  ]
                }
              ],
              customSections: [
                {
                  id: 'custom-saved-3',
                  title: 'Technical Skills',
                  subtitle: '',
                  bullets: [
                    { id: 'bullet-saved-39', text: 'Languages: Python, JavaScript, TypeScript, Java, SQL' },
                    { id: 'bullet-saved-40', text: 'Frontend: React, Redux, Next.js' },
                    { id: 'bullet-saved-41', text: 'Backend: Node.js, Express, Django, Spring Boot, REST APIs' },
                    { id: 'bullet-saved-42', text: 'Cloud: AWS (EC2, S3, RDS, Lambda, DynamoDB), Docker, Kubernetes' }
                  ]
                },
                {
                  id: 'custom-saved-4',
                  title: 'Certifications',
                  subtitle: '',
                  bullets: [
                    { id: 'bullet-saved-43', text: 'AWS Certified Solutions Architect - Associate (2022)' }
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
          console.log('Saved resume:', resume.name);
        }
        
        console.log('✅ Mock data initialized successfully!');
        console.log('Master resume:', mockMasterResume.totalBullets, 'bullets');
        console.log('Saved resumes:', mockSavedResumes.length);
        
        // Reload the data to ensure it's displayed
        await loadResumeData();
      } else {
        console.log('Mock data already exists, skipping initialization');
        console.log('Has master data:', hasMasterData);
        console.log('Saved resumes count:', savedResumes.length);
        if (!hasMasterData) {
          console.log('⚠️ No master data found but condition prevented initialization');
          console.log('Existing resume structure:', {
            experiences: existingResume.experiences?.length || 0,
            education: existingResume.education?.length || 0,
            projects: existingResume.projects?.length || 0,
            customSections: existingResume.customSections?.length || 0,
            totalBullets: existingResume.totalBullets
          });
        }
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
      console.log('📥 Loading resume data...');
      const data = await storageService.getResume();
      console.log('Raw data from storage:', {
        experiences: data.experiences?.length || 0,
        education: data.education?.length || 0,
        projects: data.projects?.length || 0,
        customSections: data.customSections?.length || 0
      });
      
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
      
      console.log('✅ Setting resume state:', {
        experiences: normalizedData.experiences.length,
        education: normalizedData.education.length,
        projects: normalizedData.projects.length,
        customSections: normalizedData.customSections.length,
        totalBullets: normalizedData.totalBullets
      });
      
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
      console.log('🔧 FORCE INITIALIZING MOCK DATA...');
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
  async function saveResumeData(updatedResume) {
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

      await storageService.saveResume(normalized);
      setResume(normalized);
    } catch (error) {
      console.error('Error saving resume:', error);
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

  function handleSelectionComplete() {
    openManagerPage();
  }

  const tabs = [
    { id: 'master', label: 'Master Resume' },
    { id: 'generate', label: 'Generate New Resume' },
    { id: 'saved', label: 'Saved Resumes' }
  ];

  if (!isManagerView) {
    return (
      <div className="popup-container">
        <header className="popup-header">
          <h1>AI Resume Optimizer</h1>
          <p className="popup-subtitle">Extract or paste a job description and pick the best bullets fast.</p>
          <button className="btn btn-secondary popup-btn" onClick={openManagerPage}>
            Open Resume Manager
          </button>
        </header>
        <main className="popup-main">
          {loading ? (
            <div className="popup-loading">Loading master resume...</div>
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

  return (
    <div className={`app ${isManagerView ? 'app-manager' : ''}`}>
      <header className="app-header">
        <h1>AI Resume Optimizer</h1>
        <p className="subtitle">Match your resume to any job description</p>
        <button
          onClick={forceInitializeMockData}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            fontSize: '11px',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Force Load Mock Data
        </button>
      </header>

      <main className="app-main">
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
      </main>
    </div>
  );
}

export default App;


