"""
Comprehensive dictionary of technical skills and areas for keyword matching.

This dictionary is used to identify technical keywords in job descriptions
and resumes, focusing on exact matches rather than regex patterns.
"""

import re
from typing import List

# Programming Languages
TECH_TOOLS = {
    # Programming Languages
    'python', 'java', 'javascript', 'typescript', 'go', 'golang', 'rust', 'c++', 'cpp', 'c#', 'csharp', 'c', 'scala', 
    'kotlin', 'swift', 'ruby', 'php', 'perl', 'r', 'matlab', 'julia', 'erlang', 'elixir', 'clojure', 'haskell', 
    'f#', 'fsharp', 'dart', 'lua', 'lisp', 'scheme', 'ocaml', 'fsharp', 'vb.net', 'vbnet', 'objective-c', 'objc',
    
    # Frontend Frameworks & Libraries
    'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'nuxt', 'gatsby', 'remix', 'astro', 'ember', 
    'backbone', 'jquery', 'bootstrap', 'tailwind', 'tailwindcss', 'material-ui', 'mui', 'ant design', 'antd',
    'chakra ui', 'chakra', 'styled components', 'emotion', 'css-in-js',
    
    # Backend Frameworks
    'express', 'fastapi', 'flask', 'django', 'spring', 'spring boot', 'springboot', 'asp.net', 'aspnet', 'rails', 
    'laravel', 'symfony', 'phoenix', 'gin', 'echo', 'fiber', 'koa', 'nest.js', 'nestjs', 'hapi', 'fastify', 'sails',
    
    # Runtime & Platforms
    'node.js', 'nodejs', 'node', 'deno', 'bun', 'jvm', '.net', 'dotnet', 'webassembly', 'wasm',
    
    # Databases - SQL
    'postgresql', 'postgres', 'mysql', 'mariadb', 'sql server', 'oracle', 'sqlite', 'cockroachdb', 'tidb', 
    'planetscale', 'supabase',
    
    # Databases - NoSQL
    'mongodb', 'mongo', 'redis', 'cassandra', 'dynamodb', 'couchdb', 'couchbase', 'neo4j', 'arangodb', 'fauna', 
    'firestore', 'firebase', 'cosmos db', 'cosmosdb', 'influxdb', 'timescaledb',
    
    # Databases - Search & Analytics
    'elasticsearch', 'elastic', 'solr', 'opensearch', 'algolia', 'meilisearch', 'pinecone', 'weaviate', 'qdrant', 
    'milvus',
    
    # Cloud Platforms
    'aws', 'amazon web services', 'gcp', 'google cloud', 'azure', 'microsoft azure', 'heroku', 'vercel', 'netlify', 
    'railway', 'render', 'fly.io', 'flyio', 'digitalocean', 'linode', 'vultr', 'cloudflare',
    
    # AWS Services
    'ec2', 's3', 'lambda', 'rds', 'dynamodb', 'sqs', 'sns', 'cloudfront', 'route53', 'vpc', 'iam', 
    'cloudformation', 'cdk', 'ecs', 'eks', 'fargate', 'api gateway', 'apigateway', 'step functions', 'stepfunctions',
    'eventbridge', 'sagemaker', 'bedrock', 's3', 'cloudwatch', 'cloudwatch logs', 'x-ray', 'xray',
    
    # Google Cloud Services
    'gce', 'gke', 'cloud run', 'cloudrun', 'cloud functions', 'cloudfunctions', 'cloud sql', 'cloudsql', 'bigquery', 
    'pub/sub', 'pubsub', 'cloud storage', 'cloudstorage', 'cloud build', 'cloudbuild', 'cloud cdn', 'cloudcdn', 
    'cloud iam', 'cloudiam',
    
    # Azure Services
    'azure functions', 'azurefunctions', 'azure app service', 'azureappservice', 'aks', 'azure sql', 'azuresql', 
    'cosmos db', 'cosmosdb', 'service bus', 'servicebus', 'event grid', 'eventgrid', 'azure devops', 'azuredevops', 
    'azure pipeline', 'azurepipeline',
    
    # Container & Orchestration
    'docker', 'kubernetes', 'k8s', 'podman', 'containerd', 'rkt', 'helm', 'kustomize', 'docker compose', 'dockercompose', 
    'swarm', 'nomad', 'mesos',
    
    # Infrastructure as Code
    'terraform', 'pulumi', 'cloudformation', 'ansible', 'chef', 'puppet', 'saltstack', 'vagrant', 'packer',
    
    # CI/CD Tools
    'jenkins', 'github actions', 'githubactions', 'gitlab ci', 'gitlabci', 'circleci', 'travis ci', 'travisci', 
    'bamboo', 'teamcity', 'argocd', 'flux', 'spinnaker', 'tekton', 'drone', 'concourse',
    
    # Version Control & Collaboration
    'git', 'github', 'gitlab', 'bitbucket', 'svn', 'mercurial', 'perforce', 'jira', 'confluence', 'linear', 'notion', 
    'slack', 'discord',
    
    # API & Communication Protocols
    'rest', 'graphql', 'grpc', 'websocket', 'webrtc', 'http', 'https', 'tcp', 'udp', 'mqtt', 'amqp', 'rabbitmq', 
    'apache kafka', 'kafka', 'nats', 'redis pub/sub', 'redispubsub',
    
    # API Tools & Gateways
    'postman', 'insomnia', 'swagger', 'openapi', 'kong', 'krakend', 'tyk', 'apigee', 'aws api gateway', 'fastapi', 
    'trpc',
    
    # ML/AI Frameworks & Libraries
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'scikit', 'sklearn', 'xgboost', 'lightgbm', 'catboost', 
    'pandas', 'numpy', 'scipy', 'jax', 'onnx', 'hugging face', 'huggingface', 'transformers', 'langchain', 
    'llamaindex', 'openai', 'anthropic', 'claude',
    
    # ML/AI Tools & Platforms
    'mlflow', 'weights & biases', 'wandb', 'tensorboard', 'kubeflow', 'sagemaker', 'vertex ai', 'vertexai', 
    'azure ml', 'azureml', 'databricks', 'snowflake', 'bigquery ml', 'bigqueryml',
    
    # Data Processing & Analytics
    'apache spark', 'spark', 'apache flink', 'flink', 'apache beam', 'beam', 'hadoop', 'hive', 'pig', 'storm', 
    'kafka streams', 'kafkastreams', 'apache airflow', 'airflow', 'prefect', 'dagster', 'dbt', 'fivetran', 'airbyte',
    
    # Monitoring & Observability
    'prometheus', 'grafana', 'datadog', 'new relic', 'newrelic', 'sentry', 'elastic', 'elk stack', 'elk', 
    'loki', 'jaeger', 'zipkin', 'opentelemetry', 'honeycomb', 'lightstep', 'splunk',
    
    # Logging & Tracing
    'logstash', 'fluentd', 'fluent bit', 'fluentbit', 'filebeat', 'winston', 'pino', 'bunyan', 'structlog',
    
    # Testing Frameworks
    'jest', 'mocha', 'chai', 'cypress', 'playwright', 'selenium', 'pytest', 'unittest', 'junit', 'testng', 'rspec', 
    'cucumber', 'gherkin', 'vitest', 'testing library',
    
    # Security Tools
    'oauth', 'oauth2', 'jwt', 'jwt tokens', 'openid connect', 'openidconnect', 'ldap', 'saml', 'auth0', 'okta', 
    'keycloak', 'vault', 'secrets manager', 'secretsmanager', 'snyk', 'sonarqube', 'owasp', 'burp suite', 'burpsuite',
    
    # Web Servers & Proxies
    'nginx', 'apache', 'caddy', 'traefik', 'haproxy', 'envoy', 'istio', 'linkerd', 'consul',
    
    # Message Queues & Stream Processing
    'rabbitmq', 'apache kafka', 'kafka', 'kinesis', 'pub/sub', 'pubsub', 'activemq', 'amazon sqs', 'amazonsqs', 
    'azure service bus', 'azureservicebus', 'nats', 'redis streams', 'redisstreams', 'zeromq',
    
    # Caching & CDN
    'redis', 'memcached', 'varnish', 'cloudflare', 'fastly', 'aws cloudfront', 'cloudfront', 'cloud cdn', 'cloudcdn', 
    'cdn',
    
    # Static Site Generators
    'jekyll', 'hugo', 'gatsby', 'next.js', 'nextjs', 'nuxt', 'astro', '11ty', 'eleventy', 'docusaurus', 'vitepress',
    
    # Mobile Development
    'react native', 'reactnative', 'flutter', 'ionic', 'xamarin', 'swiftui', 'jetpack compose', 'jetpackcompose', 
    'kotlin multiplatform', 'kotlinmultiplatform', 'expo',
    
    # Blockchain & Web3
    'ethereum', 'solidity', 'web3', 'blockchain', 'bitcoin', 'nft', 'defi', 'smart contracts', 'smartcontracts', 
    'ipfs', 'evm',
    
    # Game Development
    'unity', 'unreal engine', 'unrealengine', 'godot', 'phaser', 'pixijs', 'three.js', 'threejs', 'webgl',
    
    # Low-level & Systems
    'linux', 'unix', 'bash', 'shell', 'zsh', 'powershell', 'assembly', 'x86', 'arm', 'risc-v', 'riscv', 
    'embedded systems', 'embeddedsystems', 'iot', 'firmware',
    
    # Package Managers & Build Tools
    'npm', 'yarn', 'pnpm', 'pip', 'poetry', 'conda', 'maven', 'gradle', 'sbt', 'cargo', 'nuget', 'composer', 
    'bundler', 'go modules', 'gomodules',
    
    # Build Tools & Bundlers
    'webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'swc', 'turbopack', 'babel', 'typescript compiler', 'tsc',
    
    # Documentation & API Tools
    'openapi', 'swagger', 'raml', 'api blueprint', 'apiblueprint', 'postman', 'insomnia', 'stoplight', 'redoc', 
    'swagger ui', 'swaggerui',
    
    # Design & Prototyping
    'figma', 'sketch', 'adobe xd', 'adobexd', 'invision', 'framer', 'principle', 'zeplin',
    
    # Productivity & Project Management
    'github', 'gitlab', 'jira', 'linear', 'asana', 'trello', 'monday', 'clickup', 'notion', 'confluence',
}

# Technical Areas & Domains
TECH_AREAS = {
    # Machine Learning & AI
    'machine learning', 'machinelearning', 'ml', 'artificial intelligence', 'artificialintelligence', 'ai', 
    'deep learning', 'deeplearning', 'neural networks', 'neuralnetworks', 'cnn', 'rnn', 'lstm', 'transformer', 
    'nlp', 'natural language processing', 'naturallanguageprocessing', 'computer vision', 'computervision', 'cv',
    'reinforcement learning', 'reinforcementlearning', 'rl', 'supervised learning', 'supervisedlearning', 
    'unsupervised learning', 'unsupervisedlearning', 'transfer learning', 'transferlearning',
    
    # Data Science & Analytics
    'data science', 'datascience', 'data analytics', 'dataanalytics', 'data engineering', 'dataengineering', 
    'big data', 'bigdata', 'data mining', 'datamining', 'data warehousing', 'datawarehousing', 'etl', 'elt',
    'business intelligence', 'businessintelligence', 'bi', 'data visualization', 'datavisualization', 
    'statistical analysis', 'statisticalanalysis', 'predictive modeling', 'predictivemodeling',
    
    # Distributed Systems
    'distributed systems', 'distributedsystems', 'microservices', 'microservices architecture', 'microservicesarchitecture',
    'distributed computing', 'distributedcomputing', 'scalable systems', 'scalablesystems', 'high availability', 
    'highavailability', 'ha', 'fault tolerance', 'faulttolerance', 'load balancing', 'loadbalancing',
    'service mesh', 'servicemesh', 'api gateway', 'apigateway', 'service discovery', 'servicediscovery',
    
    # Cloud Computing
    'cloud computing', 'cloudcomputing', 'serverless', 'serverless computing', 'serverlesscomputing', 
    'cloud architecture', 'cloudarchitecture', 'multi-cloud', 'multicloud', 'hybrid cloud', 'hybridcloud',
    'infrastructure as code', 'infrastructureascode', 'iac', 'cloud native', 'cloudnative',
    
    # DevOps & SRE
    'devops', 'sre', 'site reliability engineering', 'sitereliabilityengineering', 'ci/cd', 'cicd', 
    'continuous integration', 'continuousintegration', 'continuous deployment', 'continuousdeployment',
    'continuous delivery', 'continuousdelivery', 'infrastructure automation', 'infrastructureautomation',
    'monitoring', 'observability', 'alerting', 'incident management', 'incidentmanagement',
    
    # Software Architecture
    'software architecture', 'softwarearchitecture', 'system design', 'systemdesign', 'system architecture', 
    'systemarchitecture', 'application architecture', 'applicationarchitecture', 'enterprise architecture', 
    'enterprisearchitecture', 'event-driven architecture', 'eventdrivenarchitecture', 'eda',
    'domain-driven design', 'domaindrivendesign', 'ddd', 'clean architecture', 'cleanarchitecture',
    'hexagonal architecture', 'hexagonalarchitecture', 'onion architecture', 'onionarchitecture',
    
    # Security
    'cybersecurity', 'cyber security', 'cybersecurity', 'information security', 'informationsecurity', 'infosec',
    'application security', 'applicationsecurity', 'appsec', 'network security', 'networksecurity',
    'cloud security', 'cloudsecurity', 'security architecture', 'securityarchitecture', 'penetration testing', 
    'penetrationtesting', 'vulnerability assessment', 'vulnerabilityassessment', 'threat modeling', 'threatmodeling',
    
    # Web Development
    'web development', 'webdevelopment', 'full-stack', 'fullstack', 'frontend', 'front-end', 'frontend development',
    'frontenddevelopment', 'backend', 'back-end', 'backend development', 'backenddevelopment',
    'responsive design', 'responsivedesign', 'progressive web apps', 'progressivewebapps', 'pwa',
    'single page applications', 'singlepageapplications', 'spa',
    
    # Mobile Development
    'mobile development', 'mobiledevelopment', 'ios development', 'iosdevelopment', 'android development', 
    'androiddevelopment', 'cross-platform', 'crossplatform', 'native development', 'nativedevelopment',
    
    # Database & Data Management
    'database design', 'databasedesign', 'database administration', 'databaseadministration', 'dba',
    'data modeling', 'datamodeling', 'query optimization', 'queryoptimization', 'database optimization', 
    'databaseoptimization', 'data governance', 'datagovernance', 'data quality', 'dataquality',
    
    # Performance & Optimization
    'performance optimization', 'performanceoptimization', 'performance tuning', 'performancetuning',
    'scalability', 'scalable', 'high performance', 'highperformance', 'low latency', 'lowlatency',
    'caching strategies', 'cachingstrategies', 'query optimization', 'queryoptimization',
    
    # Testing & Quality Assurance
    'test automation', 'testautomation', 'quality assurance', 'qualityassurance', 'qa', 'test-driven development',
    'testdrivendevelopment', 'tdd', 'behavior-driven development', 'behaviordrivendevelopment', 'bdd',
    'integration testing', 'integrationtesting', 'end-to-end testing', 'endtoendtesting', 'e2e',
    'unit testing', 'unittesting', 'regression testing', 'regressiontesting',
    
    # Agile & Methodologies
    'agile', 'scrum', 'kanban', 'safe', 'lean', 'waterfall', 'iterative development', 'iterativedevelopment',
    'pair programming', 'pairprogramming', 'code review', 'codereview', 'peer review', 'peerreview',
    
    # API Development
    'api development', 'apidevelopment', 'restful api', 'restfulapi', 'graphql api', 'graphqlapi',
    'api design', 'apidesign', 'api integration', 'apiintegration', 'third-party integration', 'thirdpartyintegration',
    
    # Real-time Systems
    'real-time', 'realtime', 'real-time systems', 'realtimesystems', 'streaming', 'stream processing', 
    'streamprocessing', 'event streaming', 'eventstreaming',
    
    # Blockchain & Cryptocurrency
    'blockchain', 'cryptocurrency', 'crypto', 'smart contracts', 'smartcontracts', 'defi', 'decentralized finance',
    'decentralizedfinance', 'web3', 'dapps', 'decentralized applications', 'decentralizedapplications',
    
    # Game Development
    'game development', 'gamedevelopment', 'game engine', 'gameengine', 'game design', 'gamedesign',
    '3d graphics', '3dgraphics', 'game physics', 'gamephysics',
    
    # Embedded & IoT
    'embedded systems', 'embeddedsystems', 'embedded programming', 'embeddedprogramming', 'iot', 'internet of things',
    'internetofthings', 'firmware', 'device drivers', 'devicedrivers', 'real-time embedded', 'realtimeembedded',
    
    # Networking
    'networking', 'network programming', 'networkprogramming', 'tcp/ip', 'tcpip', 'network protocols', 
    'networkprotocols', 'network security', 'networksecurity', 'vpn', 'virtual private network',
    'virtualprivatenetwork',
}

def normalize_keyword(keyword: str) -> str:
    """
    Normalize a keyword for dictionary lookup.
    
    Converts to lowercase and handles common variations.
    """
    normalized = keyword.lower().strip()
    # Remove common punctuation
    normalized = normalized.replace('.', '').replace('-', '').replace('_', '').replace(' ', '')
    return normalized

def is_tech_tool(keyword: str) -> bool:
    """
    Check if a keyword matches a tech tool in the dictionary.
    
    Args:
        keyword: The keyword to check
        
    Returns:
        True if the keyword matches a tech tool
    """
    normalized = normalize_keyword(keyword)
    keyword_lower = keyword.lower().strip()
    
    # Check exact match (with spaces)
    if keyword_lower in TECH_TOOLS:
        return True
    
    # Check normalized match (no spaces, punctuation)
    if normalized in TECH_TOOLS:
        return True
    
    # Check if keyword contains any tech tool (for multi-word tools)
    for tool in TECH_TOOLS:
        tool_normalized = normalize_keyword(tool)
        if normalized == tool_normalized or normalized in tool_normalized or tool_normalized in normalized:
            return True
    
    return False

def is_tech_area(keyword: str) -> bool:
    """
    Check if a keyword matches a tech area in the dictionary.
    
    Args:
        keyword: The keyword to check
        
    Returns:
        True if the keyword matches a tech area
    """
    normalized = normalize_keyword(keyword)
    keyword_lower = keyword.lower().strip()
    
    # Check exact match (with spaces)
    if keyword_lower in TECH_AREAS:
        return True
    
    # Check normalized match (no spaces, punctuation)
    if normalized in TECH_AREAS:
        return True
    
    # Check if keyword contains any tech area (for multi-word areas)
    for area in TECH_AREAS:
        area_normalized = normalize_keyword(area)
        if normalized == area_normalized or normalized in area_normalized or area_normalized in normalized:
            return True
    
    return False

def extract_tech_keywords(text: str) -> List[str]:
    """
    Extract technical keywords from text using dictionary matching.
    
    Args:
        text: The text to extract keywords from
        
    Returns:
        List of unique technical keywords found
    """
    keywords = set()
    text_lower = text.lower()
    
    # Check all tech tools (longer matches first to avoid partial matches)
    sorted_tools = sorted(TECH_TOOLS, key=len, reverse=True)
    for tool in sorted_tools:
        # Build pattern: escape special chars, but allow flexible spacing
        # Split by spaces, escape each part, then join with \s+
        tool_parts = tool.split()
        if len(tool_parts) == 1:
            # Single word - simple escape
            pattern = r'\b' + re.escape(tool) + r'\b'
        else:
            # Multi-word - escape each part and join with flexible spacing
            escaped_parts = [re.escape(part) for part in tool_parts]
            pattern = r'\b' + r'\s+'.join(escaped_parts) + r'\b'
        
        if re.search(pattern, text_lower, re.IGNORECASE):
            keywords.add(tool)
    
    # Check all tech areas (longer matches first)
    sorted_areas = sorted(TECH_AREAS, key=len, reverse=True)
    for area in sorted_areas:
        # Build pattern: escape special chars, but allow flexible spacing
        area_parts = area.split()
        if len(area_parts) == 1:
            # Single word - simple escape
            pattern = r'\b' + re.escape(area) + r'\b'
        else:
            # Multi-word - escape each part and join with flexible spacing
            escaped_parts = [re.escape(part) for part in area_parts]
            pattern = r'\b' + r'\s+'.join(escaped_parts) + r'\b'
        
        if re.search(pattern, text_lower, re.IGNORECASE):
            keywords.add(area)
    
    return sorted(list(keywords))

