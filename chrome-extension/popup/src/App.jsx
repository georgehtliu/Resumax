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
                { id: 'bullet-1', text: 'Scaled Go/Python microservices for 10M+ daily requests while keeping uptime at 99.9%' },
                { id: 'bullet-2', text: 'Cut API latency 40% by tuning SQL and cache layers, saving $50K in annual infra costs' },
                { id: 'bullet-3', text: 'Led three engineers to launch recommendations that raised engagement 25% and revenue $2M' },
                { id: 'bullet-4', text: 'Automated Jenkins and Docker pipelines enabling daily releases and trimming deploy time 60%' },
                { id: 'bullet-5', text: 'Built REST and gRPC services for 5M+ calls with sub-100ms latency to speed the mobile app' },
                { id: 'bullet-6', text: 'Partnered with PM and design to lock in technical specs, architecture, and success metrics' },
                { id: 'bullet-7', text: 'Mentored two junior engineers through reviews and design sessions, boosting velocity 20%' },
                { id: 'bullet-8', text: 'Created React WebSocket analytics dashboards so product could monitor live user behavior' },
                { id: 'bullet-52', text: 'Ran chaos drills with auto rollback, slashing MTTR from 45 minutes down to 12 minutes' },
                { id: 'bullet-53', text: 'Added adaptive rate limits and circuit breakers to prevent cascading failures at peak load' },
                { id: 'bullet-54', text: 'Migrated messaging from self-hosted Kafka to Pub/Sub, reducing cost 18% and improving SLAs' },
                { id: 'bullet-55', text: 'Published SLO dashboards with burn alerts that lowered customer-facing errors by 35%' },
                { id: 'bullet-56', text: 'Built LaunchDarkly feature flag workflows with automated tests to protect 5% canaries' },
                { id: 'bullet-57', text: 'Enforced mutual TLS and fine-grained IAM to pass SOC 2 audits with zero security findings' },
                { id: 'bullet-58', text: 'Batched protobuf payloads over gRPC to cut pipeline network usage by 28%' },
                { id: 'bullet-59', text: 'Built service templates and golden paths that cut new microservice bootstrap time to four days' },
                { id: 'bullet-60', text: 'Deployed incident triage bots that auto-resolved 40% of low severity alerts without humans' },
                { id: 'bullet-61', text: 'Led cross-team load tests simulating 5x peak to validate capacity for Black Friday traffic' }
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
                { id: 'bullet-10', text: 'Built WebSocket plus Redis alerts trimming latency 30% and boosting engagement' },
                { id: 'bullet-11', text: 'Optimized GraphQL queries to cut server load 25% and speed page renders' },
                { id: 'bullet-12', text: 'Drove reviews and docs that raised code quality and quickened onboarding' },
                { id: 'bullet-13', text: 'Launched A/B framework enabling data-led releases and reducing regression risk' },
                { id: 'bullet-62', text: 'Shrank upload payloads 60% with client resizing and cache headers to lower CDN cost' },
                { id: 'bullet-63', text: 'Adopted Storybook for shared UI kits, cutting regression bugs in consumer surfaces 45%' },
                { id: 'bullet-64', text: 'Delivered WCAG AA compliant flows with full keyboard navigation support' },
                { id: 'bullet-65', text: 'Instrumented funnels, fixing pricing friction and growing conversion by 9%' },
                { id: 'bullet-66', text: 'Automated screenshot diff testing to protect weekly launch quality' },
                { id: 'bullet-67', text: 'Wrapped experiment APIs to cut launch boilerplate 70% and speed team delivery' },
                { id: 'bullet-68', text: 'Implemented optimistic UI patterns to drop perceived latency from 400ms to 120ms' },
                { id: 'bullet-69', text: 'Added client spam heuristics blocking 15K fake listings each week before backend' },
                { id: 'bullet-70', text: 'Documented setup and npm workspaces, reducing intern onboarding from three days to one' },
                { id: 'bullet-71', text: 'Ran weekly launch reviews ensuring guardrails and logging were ready before ship' }
              ]
            },
            {
              id: 'exp-3',
              company: 'Amazon Web Services',
              role: 'Software Development Engineer Intern',
              startDate: 'Jun 2020',
              endDate: 'Aug 2020',
              bullets: [
                { id: 'bullet-14', text: 'Automated Java Spring tooling that saved 40 weekly hours on deployment prep' },
                { id: 'bullet-15', text: 'Built CloudWatch and Lambda alerts that halved incident detection time' },
                { id: 'bullet-16', text: 'Tuned DynamoDB and ElastiCache to cut query latency by 35%' },
                { id: 'bullet-17', text: 'Partnered with senior engineers on resilient distributed system designs' },
                { id: 'bullet-72', text: 'Containerized legacy batch jobs onto Fargate to lower ops overhead' },
                { id: 'bullet-73', text: 'Implemented blue/green deployment strategy to eliminate release downtime' },
                { id: 'bullet-74', text: 'Published CloudFormation modules standardizing VPC and IAM provisioning' },
                { id: 'bullet-75', text: 'Instrumented Lambda logging and X-Ray traces to trim RCA time by 30%' },
                { id: 'bullet-76', text: 'Automated AWS Config checks to keep 100% tagging and encryption compliance' },
                { id: 'bullet-77', text: 'Optimized S3 lifecycle rules to reduce monthly storage spend by 12%' },
                { id: 'bullet-78', text: 'Authored resilience runbooks so L1 support could resolve 25% of incidents' },
                { id: 'bullet-79', text: 'Integrated PagerDuty alerts and thresholds that improved signal-to-noise 50%' },
                { id: 'bullet-80', text: 'Stress tested services and delivered capacity plans adopted by three partner teams' },
                { id: 'bullet-81', text: 'Onboarded two enterprise clients while meeting internal security benchmarks' }
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


