"""
Keyword extraction patterns and word lists for hybrid search.

This module contains all regex patterns, word lists, and filters used
for extracting technical keywords from job descriptions and resume text.

All patterns are designed to catch technical terms that might be missed
by pure semantic search, improving hybrid retrieval accuracy.
"""

# Comprehensive technical skills and terms patterns
TECH_PATTERNS = [
    # Programming Languages
    r'\b(?:Python|Java|JavaScript|TypeScript|Go|Golang|Rust|C\+\+|C#|C|Scala|Kotlin|Swift|Ruby|PHP|Perl|R|MATLAB|Julia|Erlang|Elixir|Clojure|Haskell|F#|Dart)\b',
    
    # Frontend Frameworks & Libraries
    r'\b(?:React|Vue|Angular|Svelte|Next\.js|Nuxt|Gatsby|Remix|Astro|Ember|Backbone|jQuery|Bootstrap|Tailwind|Material-UI|MUI|Ant Design|Chakra UI|Styled Components)\b',
    
    # Backend Frameworks
    r'\b(?:Express|FastAPI|Flask|Django|Spring|Spring Boot|ASP\.NET|Rails|Laravel|Symfony|Phoenix|Gin|Echo|Fiber|Koa|Nest\.js|Hapi|Fastify|Sails)\b',
    
    # Runtime & Platforms
    r'\b(?:Node\.js|Deno|Bun|JVM|\.NET|WebAssembly|WASM)\b',
    
    # Databases - SQL
    r'\b(?:PostgreSQL|MySQL|MariaDB|SQL Server|Oracle|SQLite|CockroachDB|TiDB|PlanetScale|Supabase)\b',
    
    # Databases - NoSQL
    r'\b(?:MongoDB|Redis|Cassandra|DynamoDB|CouchDB|Couchbase|Neo4j|ArangoDB|Fauna|Firestore|Firebase|Cosmos DB|InfluxDB|TimescaleDB)\b',
    
    # Databases - Search & Analytics
    r'\b(?:Elasticsearch|Solr|OpenSearch|Algolia|Meilisearch|Pinecone|Weaviate|Qdrant|Milvus)\b',
    
    # Cloud Platforms
    r'\b(?:AWS|Amazon Web Services|GCP|Google Cloud|Azure|Microsoft Azure|Heroku|Vercel|Netlify|Railway|Render|Fly\.io|DigitalOcean|Linode|Vultr)\b',
    
    # AWS Services
    r'\b(?:EC2|S3|Lambda|RDS|DynamoDB|SQS|SNS|CloudFront|Route53|VPC|IAM|CloudFormation|CDK|ECS|EKS|Fargate|API Gateway|Step Functions|EventBridge|SageMaker|Bedrock)\b',
    
    # Google Cloud Services
    r'\b(?:GCE|GKE|Cloud Run|Cloud Functions|Cloud SQL|BigQuery|Pub/Sub|Cloud Storage|Cloud Build|Cloud CDN|Cloud IAM)\b',
    
    # Azure Services
    r'\b(?:Azure Functions|Azure App Service|AKS|Azure SQL|Cosmos DB|Service Bus|Event Grid|Azure DevOps|Azure Pipeline)\b',
    
    # Container & Orchestration
    r'\b(?:Docker|Kubernetes|K8s|Podman|containerd|rkt|Helm|Kustomize|Docker Compose|Swarm|Nomad|Mesos)\b',
    
    # Infrastructure as Code
    r'\b(?:Terraform|Pulumi|CloudFormation|Ansible|Chef|Puppet|SaltStack|Vagrant|Packer)\b',
    
    # CI/CD Tools
    r'\b(?:Jenkins|GitHub Actions|GitLab CI|CircleCI|Travis CI|Bamboo|TeamCity|ArgoCD|Flux|Spinnaker|Tekton|Drone|Concourse)\b',
    
    # Version Control & Collaboration
    r'\b(?:Git|GitHub|GitLab|Bitbucket|SVN|Mercurial|Perforce|Jira|Confluence|Linear|Notion|Slack|Discord)\b',
    
    # API & Communication Protocols
    r'\b(?:REST|GraphQL|gRPC|WebSocket|WebRTC|HTTP|HTTPS|TCP|UDP|MQTT|AMQP|RabbitMQ|Apache Kafka|NATS|Redis Pub/Sub)\b',
    
    # API Tools & Gateways
    r'\b(?:Postman|Insomnia|Swagger|OpenAPI|Kong|KrakenD|Tyk|Apigee|AWS API Gateway|FastAPI|tRPC)\b',
    
    # ML/AI Frameworks & Libraries
    r'\b(?:TensorFlow|PyTorch|Keras|scikit-learn|scikit|XGBoost|LightGBM|CatBoost|Pandas|NumPy|SciPy|JAX|ONNX|Hugging Face|Transformers|LangChain|LlamaIndex|OpenAI|Anthropic|Claude)\b',
    
    # ML/AI Tools & Platforms
    r'\b(?:MLflow|Weights & Biases|W&B|TensorBoard|Kubeflow|SageMaker|Vertex AI|Azure ML|Databricks|Snowflake|BigQuery ML)\b',
    
    # Data Processing & Analytics
    r'\b(?:Apache Spark|Apache Flink|Apache Beam|Hadoop|Hive|Pig|Storm|Kafka Streams|Apache Airflow|Prefect|Dagster|dbt|Fivetran|Airbyte)\b',
    
    # Monitoring & Observability
    r'\b(?:Prometheus|Grafana|Datadog|New Relic|Sentry|Elastic|ELK Stack|Loki|Jaeger|Zipkin|OpenTelemetry|Honeycomb|Lightstep|Splunk)\b',
    
    # Logging & Tracing
    r'\b(?:Logstash|Fluentd|Fluent Bit|Filebeat|Winston|Pino|Bunyan|Structlog)\b',
    
    # Testing Frameworks
    r'\b(?:Jest|Mocha|Chai|Cypress|Playwright|Selenium|Pytest|unittest|JUnit|TestNG|RSpec|Cucumber|Gherkin|Vitest|Testing Library)\b',
    
    # Security Tools
    r'\b(?:OAuth|OAuth2|JWT|JWT Tokens|OpenID Connect|LDAP|SAML|Auth0|Okta|Keycloak|Vault|Secrets Manager|Snyk|SonarQube|OWASP|Burp Suite)\b',
    
    # Architecture Patterns
    r'\b(?:microservices|serverless|monolith|monolithic|event-driven|EDA|CQRS|Event Sourcing|DDD|Domain Driven Design|MVC|MVVM|Clean Architecture|Hexagonal|SOLID)\b',
    
    # Development Methodologies
    r'\b(?:Agile|Scrum|Kanban|SAFe|Lean|DevOps|DevSecOps|SRE|Site Reliability Engineering|TDD|BDD|DDD|CI/CD|Continuous Integration|Continuous Deployment)\b',
    
    # Web Servers & Proxies
    r'\b(?:Nginx|Apache|Caddy|Traefik|HAProxy|Envoy|Istio|Linkerd|Consul)\b',
    
    # Message Queues & Stream Processing
    r'\b(?:RabbitMQ|Apache Kafka|Kinesis|Pub/Sub|ActiveMQ|Amazon SQS|Azure Service Bus|NATS|Redis Streams|ZeroMQ)\b',
    
    # Caching & CDN
    r'\b(?:Redis|Memcached|Varnish|CloudFlare|Fastly|AWS CloudFront|Cloud CDN|CDN)\b',
    
    # Static Site Generators
    r'\b(?:Jekyll|Hugo|Gatsby|Next\.js|Nuxt|Astro|11ty|Eleventy|Docusaurus|VitePress|Vitepress)\b',
    
    # Mobile Development
    r'\b(?:React Native|Flutter|Ionic|Xamarin|SwiftUI|Jetpack Compose|Kotlin Multiplatform|Expo)\b',
    
    # Blockchain & Web3
    r'\b(?:Ethereum|Solidity|Web3|Blockchain|Bitcoin|NFT|DeFi|Smart Contracts|IPFS|EVM)\b',
    
    # Game Development
    r'\b(?:Unity|Unreal Engine|Godot|Phaser|PixiJS|Three\.js|WebGL)\b',
    
    # Low-level & Systems
    r'\b(?:Linux|Unix|Bash|Shell|Zsh|PowerShell|Assembly|x86|ARM|RISC-V|Embedded Systems|IoT|Firmware)\b',
    
    # Package Managers & Build Tools
    r'\b(?:npm|yarn|pnpm|pip|Poetry|conda|Maven|Gradle|sbt|Cargo|NuGet|Composer|Bundler|Go Modules)\b',
    
    # Build Tools & Bundlers
    r'\b(?:Webpack|Vite|Rollup|Parcel|esbuild|SWC|Turbopack|Babel|TypeScript Compiler|tsc)\b',
    
    # Documentation & API Tools
    r'\b(?:OpenAPI|Swagger|RAML|API Blueprint|Postman|Insomnia|Stoplight|Redoc|Swagger UI)\b',
    
    # Design & Prototyping
    r'\b(?:Figma|Sketch|Adobe XD|InVision|Framer|Principle|Zeplin)\b',
    
    # Productivity & Project Management
    r'\b(?:GitHub|GitLab|Jira|Linear|Asana|Trello|Monday|ClickUp|Notion|Confluence)\b',
]

# Action verbs commonly used in resumes
ACTION_VERBS = [
    'implement', 'develop', 'design', 'build', 'create', 'deploy',
    'optimize', 'improve', 'enhance', 'refactor', 'architect',
    'manage', 'lead', 'collaborate', 'integrate', 'automate'
]

# Common words to exclude when extracting capitalized tech terms
# These are typically not technical skills
COMMON_WORDS = {
    'The', 'This', 'That', 'With', 'From', 'When', 'Where', 'These', 'Those',
    'There', 'They', 'Then', 'Than', 'Have', 'Were', 'Been', 'Being', 'Into',
    'After', 'Before', 'During', 'While', 'About', 'Above', 'Below', 'Under',
    'Over', 'Between', 'Among', 'Through', 'Throughout', 'Against', 'Around',
    'Within', 'Without', 'Which', 'What', 'Who', 'Whom', 'Whose', 'Why',
    'How', 'Many', 'Much', 'More', 'Most', 'Some', 'Such', 'Same', 'Different',
    'Other', 'Another', 'Each', 'Every', 'All', 'Both', 'Either', 'Neither',
    'Would', 'Could', 'Should', 'Might', 'Must', 'Shall', 'Will', 'Can',
    'May', 'Might', 'Cannot', 'Should', 'Would', 'Could', 'Company', 'Team',
    'Project', 'Work', 'Experience', 'Years', 'Responsibilities', 'Skills'
}

