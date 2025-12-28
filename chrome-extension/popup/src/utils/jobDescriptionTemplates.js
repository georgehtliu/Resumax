/**
 * Predefined job descriptions for different software engineering focus areas
 * These are comprehensive job descriptions that cover typical requirements for each role
 */

export const JOB_DESCRIPTION_TEMPLATES = {
  'backend': {
    name: 'Backend Engineer',
    description: `We are looking for a Backend Software Engineer to join our team. The ideal candidate will have:

**Core Requirements:**
- Strong experience in backend development with languages such as Python, Java, Go, Node.js, or similar
- Deep understanding of RESTful API design and implementation
- Experience with database design, optimization, and query tuning (SQL and NoSQL databases)
- Knowledge of microservices architecture and distributed systems
- Experience with caching strategies (Redis, Memcached) and performance optimization
- Understanding of authentication, authorization, and security best practices
- Experience with message queues and event-driven architectures (RabbitMQ, Kafka, SQS)

**Technical Skills:**
- Backend frameworks (FastAPI, Django, Flask, Spring Boot, Express, etc.)
- Database systems (PostgreSQL, MySQL, MongoDB, Redis, etc.)
- Cloud platforms (AWS, GCP, Azure) and their services
- Containerization and orchestration (Docker, Kubernetes)
- CI/CD pipelines and DevOps practices
- API design patterns and versioning strategies
- System design and scalability principles

**Preferred Qualifications:**
- Experience with GraphQL APIs
- Knowledge of gRPC and protocol buffers
- Experience with monitoring and observability tools
- Understanding of database sharding and replication
- Experience with serverless architectures
- Strong problem-solving skills and ability to work in fast-paced environments
- Experience mentoring junior developers and leading technical initiatives`
  },

  'frontend': {
    name: 'Frontend Engineer',
    description: `We are looking for a Frontend Software Engineer to join our team. The ideal candidate will have:

**Core Requirements:**
- Strong experience in frontend development with modern JavaScript/TypeScript
- Proficiency in React, Vue, Angular, or similar modern frameworks
- Deep understanding of HTML5, CSS3, and responsive design principles
- Experience with state management solutions (Redux, Zustand, MobX, Vuex, etc.)
- Knowledge of modern build tools and bundlers (Webpack, Vite, Rollup, etc.)
- Understanding of browser APIs, performance optimization, and web vitals
- Experience with testing frameworks (Jest, React Testing Library, Cypress, Playwright)

**Technical Skills:**
- Frontend frameworks and libraries (React, Vue, Angular, Next.js, Nuxt, etc.)
- CSS frameworks and preprocessors (Tailwind CSS, Sass, Less, Styled Components)
- TypeScript and modern JavaScript (ES6+)
- Web performance optimization (code splitting, lazy loading, caching)
- Accessibility standards (WCAG, ARIA)
- Progressive Web Apps (PWA) and mobile-first development
- GraphQL and REST API integration

**Preferred Qualifications:**
- Experience with server-side rendering (SSR) and static site generation (SSG)
- Knowledge of design systems and component libraries
- Experience with animation libraries (Framer Motion, GSAP, etc.)
- Understanding of WebAssembly and advanced browser features
- Experience with mobile development (React Native, Flutter)
- Strong UI/UX design sensibilities
- Experience with micro-frontends and module federation`
  },

  'fullstack': {
    name: 'Full-Stack Engineer',
    description: `We are looking for a Full-Stack Software Engineer to join our team. The ideal candidate will have:

**Core Requirements:**
- Strong experience in both frontend and backend development
- Proficiency in full-stack JavaScript/TypeScript (Node.js, React, Vue, or Angular)
- Experience with RESTful and GraphQL API design and implementation
- Knowledge of database design and optimization (SQL and NoSQL)
- Understanding of modern web architecture and system design
- Experience with cloud platforms and deployment strategies
- Ability to work across the entire stack from UI to database

**Technical Skills:**
- Frontend: React, Vue, Angular, Next.js, or similar frameworks
- Backend: Node.js, Python, Java, Go, or similar languages
- Databases: PostgreSQL, MySQL, MongoDB, Redis, etc.
- Cloud platforms: AWS, GCP, Azure
- DevOps: Docker, Kubernetes, CI/CD pipelines
- API design: REST, GraphQL, gRPC
- Testing: Unit, integration, and end-to-end testing

**Preferred Qualifications:**
- Experience with serverless architectures
- Knowledge of microservices and monolith-to-microservices migration
- Experience with real-time systems (WebSockets, Server-Sent Events)
- Understanding of security best practices across the stack
- Experience with mobile development (React Native, Flutter)
- Strong problem-solving skills and ability to work independently
- Experience leading technical projects and mentoring team members`
  },

  'devops': {
    name: 'DevOps Engineer',
    description: `We are looking for a DevOps Engineer to join our team. The ideal candidate will have:

**Core Requirements:**
- Strong experience with cloud platforms (AWS, GCP, Azure)
- Deep knowledge of containerization and orchestration (Docker, Kubernetes)
- Experience with Infrastructure as Code (Terraform, CloudFormation, Pulumi)
- Proficiency in CI/CD pipeline design and implementation (Jenkins, GitHub Actions, GitLab CI, CircleCI)
- Understanding of monitoring, logging, and observability tools
- Experience with configuration management (Ansible, Puppet, Chef)
- Knowledge of networking, security, and compliance best practices

**Technical Skills:**
- Cloud platforms: AWS, GCP, Azure (EC2, S3, Lambda, Cloud Functions, etc.)
- Container orchestration: Kubernetes, Docker Swarm, ECS, EKS, GKE
- CI/CD tools: Jenkins, GitHub Actions, GitLab CI, CircleCI, Azure DevOps
- Infrastructure as Code: Terraform, CloudFormation, Pulumi, CDK
- Monitoring: Prometheus, Grafana, Datadog, New Relic, CloudWatch
- Scripting: Bash, Python, PowerShell
- Version control: Git, GitLab, GitHub, Bitbucket

**Preferred Qualifications:**
- Experience with service mesh (Istio, Linkerd)
- Knowledge of security scanning and vulnerability management
- Experience with multi-cloud and hybrid cloud architectures
- Understanding of disaster recovery and backup strategies
- Experience with cost optimization and resource management
- Knowledge of compliance frameworks (SOC 2, HIPAA, GDPR)
- Strong troubleshooting skills and ability to work under pressure`
  },

  'mobile': {
    name: 'Mobile Engineer',
    description: `We are looking for a Mobile Software Engineer to join our team. The ideal candidate will have:

**Core Requirements:**
- Strong experience in mobile app development (iOS, Android, or cross-platform)
- Proficiency in native development (Swift, Kotlin, Objective-C, Java) or cross-platform frameworks
- Understanding of mobile UI/UX best practices and platform guidelines
- Experience with mobile app architecture patterns (MVC, MVVM, Clean Architecture)
- Knowledge of mobile app performance optimization and memory management
- Experience with app store deployment and release management
- Understanding of mobile security and data protection

**Technical Skills:**
- Native: Swift, Kotlin, Objective-C, Java
- Cross-platform: React Native, Flutter, Xamarin
- Mobile frameworks: UIKit, SwiftUI, Jetpack Compose
- State management: Redux, MobX, Provider, Riverpod
- Testing: XCTest, Espresso, Detox, Appium
- Backend integration: REST APIs, GraphQL, WebSockets
- Mobile CI/CD: Fastlane, Bitrise, Codemagic

**Preferred Qualifications:**
- Experience with both iOS and Android development
- Knowledge of mobile analytics and crash reporting
- Experience with push notifications and in-app messaging
- Understanding of mobile payment integration
- Experience with offline-first architectures and data synchronization
- Knowledge of mobile performance monitoring and optimization
- Strong UI/UX design skills and attention to detail`
  },

  'data': {
    name: 'Data Engineer',
    description: `We are looking for a Data Engineer to join our team. The ideal candidate will have:

**Core Requirements:**
- Strong experience in building and maintaining data pipelines
- Proficiency in Python, Java, or Scala for data processing
- Deep understanding of SQL and database systems (PostgreSQL, MySQL, BigQuery, Redshift)
- Experience with big data technologies (Spark, Hadoop, Kafka)
- Knowledge of data warehousing and ETL/ELT processes
- Understanding of data modeling and schema design
- Experience with cloud data platforms (AWS, GCP, Azure data services)

**Technical Skills:**
- Data processing: Apache Spark, Hadoop, Flink, Beam
- Data storage: PostgreSQL, MySQL, MongoDB, Cassandra, BigQuery, Redshift, Snowflake
- Data pipelines: Airflow, Prefect, Dagster, Luigi
- Streaming: Kafka, Kinesis, Pub/Sub
- Cloud platforms: AWS (S3, Glue, EMR), GCP (BigQuery, Dataflow), Azure (Data Factory, Synapse)
- Languages: Python, SQL, Java, Scala
- Tools: dbt, Fivetran, Stitch, Talend

**Preferred Qualifications:**
- Experience with real-time data processing and streaming
- Knowledge of data quality and governance frameworks
- Experience with machine learning pipelines and MLOps
- Understanding of data privacy and compliance (GDPR, CCPA)
- Experience with data visualization tools (Tableau, Looker, Power BI)
- Strong analytical skills and attention to data accuracy
- Experience optimizing data pipelines for performance and cost`
  },

  'ml': {
    name: 'ML Engineer',
    description: `We are looking for a Machine Learning Engineer to join our team. The ideal candidate will have:

**Core Requirements:**
- Strong background in machine learning and data science
- Proficiency in Python and ML frameworks (TensorFlow, PyTorch, scikit-learn)
- Experience with model training, evaluation, and deployment
- Understanding of deep learning architectures and neural networks
- Knowledge of MLOps practices and model lifecycle management
- Experience with data preprocessing, feature engineering, and model optimization
- Understanding of statistical methods and experimental design

**Technical Skills:**
- ML frameworks: TensorFlow, PyTorch, scikit-learn, XGBoost, LightGBM
- Languages: Python, R, SQL
- MLOps: MLflow, Kubeflow, Weights & Biases, SageMaker
- Data processing: Pandas, NumPy, Spark, Dask
- Cloud ML: AWS SageMaker, GCP Vertex AI, Azure ML
- Model deployment: Docker, Kubernetes, TensorFlow Serving, TorchServe
- Experimentation: A/B testing, feature flags, model versioning

**Preferred Qualifications:**
- Experience with natural language processing (NLP) or computer vision
- Knowledge of distributed training and model parallelism
- Experience with model compression and optimization techniques
- Understanding of fairness, bias, and model interpretability
- Experience with reinforcement learning
- Strong mathematical background (linear algebra, calculus, statistics)
- Experience deploying models to production at scale`
  },

  'security': {
    name: 'Security Engineer',
    description: `We are looking for a Security Engineer to join our team. The ideal candidate will have:

**Core Requirements:**
- Strong background in cybersecurity and information security
- Experience with security assessment, vulnerability scanning, and penetration testing
- Knowledge of security frameworks and compliance (OWASP, NIST, ISO 27001)
- Understanding of network security, encryption, and authentication protocols
- Experience with security tools and SIEM systems
- Knowledge of secure coding practices and security architecture
- Experience with incident response and security operations

**Technical Skills:**
- Security tools: Burp Suite, Metasploit, Wireshark, Nessus, Qualys
- SIEM: Splunk, ELK Stack, QRadar, Sentinel
- Cloud security: AWS Security Hub, GCP Security Command Center, Azure Security Center
- Identity management: OAuth, SAML, LDAP, Active Directory
- Encryption: TLS/SSL, PKI, certificate management
- Languages: Python, Bash, PowerShell for security automation
- Compliance: SOC 2, HIPAA, GDPR, PCI DSS

**Preferred Qualifications:**
- Experience with DevSecOps and security in CI/CD pipelines
- Knowledge of container security and Kubernetes security
- Experience with threat modeling and risk assessment
- Understanding of zero-trust architecture
- Experience with security automation and orchestration
- Certifications: CISSP, CEH, OSCP, GSEC
- Strong analytical skills and attention to detail`
  }
};

/**
 * Get job description for a specific focus area
 */
export function getJobDescriptionForArea(area) {
  return JOB_DESCRIPTION_TEMPLATES[area]?.description || '';
}

/**
 * Get display name for a focus area
 */
export function getAreaDisplayName(area) {
  return JOB_DESCRIPTION_TEMPLATES[area]?.name || area;
}

/**
 * Get all available focus areas
 */
export function getAvailableAreas() {
  return Object.keys(JOB_DESCRIPTION_TEMPLATES);
}

