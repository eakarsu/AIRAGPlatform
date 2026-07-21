"""Seed database with sample data - 15+ items per feature."""
import os
import sys
from datetime import datetime, timedelta, timezone
import bcrypt

from database import SessionLocal
from models.database_models import (
    User, Document, ChatSession, ChatMessage, KnowledgeChunk, AISummary,
    Tag, DocumentTag, PromptTemplate, ActivityLog, Favorite,
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def utcnow():
    return datetime.now(timezone.utc)


DOCUMENTS_DATA = [
    {
        "title": "Introduction to Machine Learning",
        "filename": "intro_ml.pdf",
        "file_type": "pdf",
        "content": """Machine Learning is a subset of artificial intelligence that provides systems the ability to automatically learn and improve from experience without being explicitly programmed. Machine learning focuses on the development of computer programs that can access data and use it to learn for themselves.

The process of learning begins with observations or data, such as examples, direct experience, or instruction, in order to look for patterns in data and make better decisions in the future based on the examples that we provide. The primary aim is to allow the computers to learn automatically without human intervention or assistance and adjust actions accordingly.

Types of Machine Learning:
1. Supervised Learning: The algorithm is trained on labeled data, where the correct output is known for each input.
2. Unsupervised Learning: The algorithm finds patterns in unlabeled data without predefined categories.
3. Reinforcement Learning: The algorithm learns by interacting with an environment and receiving rewards or penalties.

Common algorithms include linear regression, decision trees, random forests, support vector machines, neural networks, and k-means clustering. Each has its strengths and is suited for different types of problems.""",
        "file_size": 45200,
    },
    {
        "title": "Python Best Practices Guide",
        "filename": "python_best_practices.txt",
        "file_type": "txt",
        "content": """Python Best Practices for Clean, Maintainable Code

1. Follow PEP 8 Style Guide
PEP 8 is the de facto code style guide for Python. It covers naming conventions, code layout, whitespace usage, and more. Using a consistent style makes your code more readable and maintainable.

2. Use Virtual Environments
Always use virtual environments (venv, conda) to isolate project dependencies. This prevents conflicts between packages and ensures reproducibility.

3. Write Docstrings
Document your functions, classes, and modules with docstrings. Use Google or NumPy style docstrings for consistency.

4. Type Hints
Use type hints to make your code more self-documenting and enable static type checking with tools like mypy.

5. Error Handling
Use try/except blocks appropriately. Catch specific exceptions rather than broad Exception classes.

6. Testing
Write unit tests using pytest or unittest. Aim for high test coverage and test edge cases.

7. List Comprehensions
Use list comprehensions for simple transformations. For complex logic, use regular loops for clarity.

8. Context Managers
Use context managers (with statement) for resource management like file operations and database connections.""",
        "file_size": 32100,
    },
    {
        "title": "Data Science Handbook",
        "filename": "data_science_handbook.pdf",
        "file_type": "pdf",
        "content": """The Data Science Handbook covers the essential tools and techniques for modern data science.

Chapter 1: Data Collection and Cleaning
Data collection involves gathering information from various sources including APIs, databases, web scraping, and file imports. Data cleaning is often the most time-consuming step, involving handling missing values, removing duplicates, correcting inconsistencies, and transforming data types.

Chapter 2: Exploratory Data Analysis
EDA uses statistical methods and visualizations to understand data distributions, identify patterns, detect outliers, and formulate hypotheses. Key tools include pandas, matplotlib, seaborn, and plotly.

Chapter 3: Statistical Analysis
Understanding probability distributions, hypothesis testing, confidence intervals, and regression analysis forms the foundation of data science.

Chapter 4: Machine Learning Applications
From classification to clustering, machine learning algorithms are applied to solve real-world problems in healthcare, finance, marketing, and more.

Chapter 5: Data Visualization
Effective visualization communicates findings clearly. Choose the right chart type for your data and audience. Consider accessibility and simplicity in design.""",
        "file_size": 67800,
    },
    {
        "title": "Web Development with React",
        "filename": "react_development.md",
        "file_type": "md",
        "content": """# Web Development with React

## Introduction to React
React is a JavaScript library for building user interfaces. It uses a component-based architecture that makes it easy to build complex UIs from small, reusable pieces.

## Core Concepts

### Components
Components are the building blocks of React applications. They can be functional or class-based, though functional components with hooks are now preferred.

### State Management
React provides useState and useReducer hooks for local state, and Context API for global state. For complex applications, consider Redux or Zustand.

### Hooks
- useState: Manage local state
- useEffect: Side effects and lifecycle
- useContext: Access context values
- useRef: Mutable references
- useMemo/useCallback: Performance optimization

## Best Practices
1. Keep components small and focused
2. Lift state up when needed
3. Use composition over inheritance
4. Implement proper error boundaries
5. Optimize rendering with React.memo""",
        "file_size": 28500,
    },
    {
        "title": "API Design Principles",
        "filename": "api_design.txt",
        "file_type": "txt",
        "content": """RESTful API Design Principles

1. Use Nouns for Resource URLs
URLs should represent resources (nouns), not actions (verbs). Use HTTP methods to indicate actions.
- GET /users - List users
- POST /users - Create a user
- GET /users/123 - Get a specific user
- PUT /users/123 - Update a user
- DELETE /users/123 - Delete a user

2. HTTP Status Codes
Use appropriate status codes: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Internal Server Error).

3. Versioning
Version your API (e.g., /api/v1/) to maintain backward compatibility while evolving the API.

4. Pagination
For list endpoints, implement pagination with limit/offset or cursor-based pagination.

5. Error Handling
Return consistent error response formats with error codes and descriptive messages.

6. Authentication
Use standard authentication methods like JWT, OAuth 2.0, or API keys.

7. Rate Limiting
Implement rate limiting to protect your API from abuse and ensure fair usage.""",
        "file_size": 21300,
    },
    {
        "title": "Database Optimization Techniques",
        "filename": "db_optimization.pdf",
        "file_type": "pdf",
        "content": """Database Optimization Techniques for High-Performance Applications

Indexing Strategies:
Proper indexing is the most impactful optimization. Create indexes on columns used in WHERE clauses, JOIN conditions, and ORDER BY clauses. Use composite indexes for multi-column queries. Avoid over-indexing as it slows down write operations.

Query Optimization:
- Use EXPLAIN ANALYZE to understand query execution plans
- Avoid SELECT * - specify only needed columns
- Use JOINs instead of subqueries where possible
- Batch INSERT operations for better performance
- Use prepared statements to reduce parsing overhead

Connection Pooling:
Maintain a pool of database connections to avoid the overhead of creating new connections for each request. Tools like PgBouncer for PostgreSQL.

Caching:
Implement caching layers (Redis, Memcached) for frequently accessed data. Use cache invalidation strategies to maintain data consistency.

Partitioning:
For large tables, use table partitioning to improve query performance by limiting the amount of data scanned.

Normalization vs Denormalization:
Balance between normalized schemas for data integrity and denormalized schemas for read performance.""",
        "file_size": 38900,
    },
    {
        "title": "Cloud Computing Overview",
        "filename": "cloud_computing.docx",
        "file_type": "docx",
        "content": """Cloud Computing: A Comprehensive Overview

Cloud computing delivers computing services over the internet, including servers, storage, databases, networking, software, and analytics.

Service Models:
1. IaaS (Infrastructure as a Service): Virtual machines, storage, networks. Examples: AWS EC2, Azure VMs, Google Compute Engine.
2. PaaS (Platform as a Service): Development platforms with managed infrastructure. Examples: Heroku, Google App Engine, Azure App Service.
3. SaaS (Software as a Service): Ready-to-use applications. Examples: Gmail, Salesforce, Microsoft 365.

Deployment Models:
- Public Cloud: Shared infrastructure managed by cloud providers
- Private Cloud: Dedicated infrastructure for a single organization
- Hybrid Cloud: Combination of public and private clouds
- Multi-Cloud: Using services from multiple cloud providers

Key Benefits:
- Scalability and elasticity
- Cost efficiency (pay-as-you-go)
- Global availability
- Disaster recovery
- Automatic updates and maintenance""",
        "file_size": 42100,
    },
    {
        "title": "Cybersecurity Fundamentals",
        "filename": "cybersecurity.pdf",
        "file_type": "pdf",
        "content": """Cybersecurity Fundamentals: Protecting Digital Assets

The CIA Triad:
- Confidentiality: Ensuring data is accessible only to authorized parties
- Integrity: Maintaining accuracy and trustworthiness of data
- Availability: Ensuring reliable access to information when needed

Common Threats:
1. Phishing: Social engineering attacks via email or messages
2. Malware: Viruses, ransomware, trojans, spyware
3. SQL Injection: Exploiting database query vulnerabilities
4. XSS: Cross-site scripting attacks on web applications
5. DDoS: Distributed denial-of-service attacks
6. Man-in-the-Middle: Intercepting communications

Defense Strategies:
- Defense in depth: Multiple layers of security controls
- Principle of least privilege: Minimal access rights
- Regular security audits and penetration testing
- Employee security awareness training
- Incident response planning
- Encryption for data at rest and in transit
- Multi-factor authentication (MFA)""",
        "file_size": 35600,
    },
    {
        "title": "Agile Project Management",
        "filename": "agile_pm.txt",
        "file_type": "txt",
        "content": """Agile Project Management: Principles and Practices

The Agile Manifesto values:
1. Individuals and interactions over processes and tools
2. Working software over comprehensive documentation
3. Customer collaboration over contract negotiation
4. Responding to change over following a plan

Scrum Framework:
- Sprint: Time-boxed iteration (usually 2 weeks)
- Product Backlog: Prioritized list of work items
- Sprint Planning: Team selects items for the sprint
- Daily Standup: 15-minute daily sync meeting
- Sprint Review: Demo completed work
- Sprint Retrospective: Reflect and improve

Roles:
- Product Owner: Defines requirements and priorities
- Scrum Master: Facilitates the process and removes blockers
- Development Team: Self-organizing cross-functional team

Kanban:
An alternative agile method using visual boards with work-in-progress limits. Focuses on continuous flow rather than fixed iterations.

Metrics:
- Velocity: Story points completed per sprint
- Burndown charts: Track remaining work
- Cycle time: Time from start to completion
- Lead time: Time from request to delivery""",
        "file_size": 29400,
    },
    {
        "title": "Natural Language Processing",
        "filename": "nlp_guide.pdf",
        "file_type": "pdf",
        "content": """Natural Language Processing (NLP): A Modern Guide

NLP is a field of AI that enables computers to understand, interpret, and generate human language.

Core Tasks:
1. Tokenization: Breaking text into words or subwords
2. Part-of-Speech Tagging: Identifying word categories
3. Named Entity Recognition: Detecting names, places, organizations
4. Sentiment Analysis: Determining emotional tone
5. Text Classification: Categorizing documents
6. Machine Translation: Converting between languages
7. Text Summarization: Generating concise summaries
8. Question Answering: Finding answers in text

Modern Approaches:
- Transformer Architecture: Self-attention mechanism for capturing long-range dependencies
- BERT: Bidirectional encoder for understanding context
- GPT: Generative pre-trained transformer for text generation
- Word Embeddings: Word2Vec, GloVe, FastText for semantic representation

Applications:
- Chatbots and virtual assistants
- Search engines
- Content moderation
- Healthcare documentation
- Legal document analysis
- Customer feedback analysis""",
        "file_size": 51200,
    },
    {
        "title": "Docker and Containerization",
        "filename": "docker_guide.md",
        "file_type": "md",
        "content": """# Docker and Containerization Guide

## What is Docker?
Docker is a platform for developing, shipping, and running applications in containers. Containers package an application with all its dependencies, ensuring consistent behavior across environments.

## Key Concepts
- **Image**: A read-only template with instructions for creating a container
- **Container**: A runnable instance of an image
- **Dockerfile**: A script defining how to build an image
- **Docker Compose**: A tool for defining multi-container applications
- **Registry**: A repository for Docker images (Docker Hub, ECR, GCR)

## Basic Commands
```
docker build -t myapp .
docker run -d -p 8080:80 myapp
docker ps
docker logs <container_id>
docker stop <container_id>
```

## Best Practices
1. Use official base images
2. Minimize image layers
3. Use multi-stage builds
4. Don't run as root
5. Use .dockerignore
6. Pin dependency versions
7. Scan images for vulnerabilities""",
        "file_size": 25800,
    },
    {
        "title": "Microservices Architecture",
        "filename": "microservices.pdf",
        "file_type": "pdf",
        "content": """Microservices Architecture: Design and Implementation

Microservices is an architectural style where applications are built as a collection of small, independent services that communicate over well-defined APIs.

Characteristics:
1. Single Responsibility: Each service handles one business capability
2. Independently Deployable: Services can be updated without affecting others
3. Technology Agnostic: Each service can use different tech stacks
4. Decentralized Data: Each service manages its own database
5. Fault Isolation: Failure in one service doesn't cascade

Communication Patterns:
- Synchronous: REST, gRPC
- Asynchronous: Message queues (RabbitMQ, Kafka)
- Event-driven: Event sourcing and CQRS

Design Patterns:
- API Gateway: Single entry point for clients
- Circuit Breaker: Prevent cascade failures
- Service Discovery: Dynamic service location
- Saga Pattern: Distributed transaction management
- Sidecar Pattern: Separate cross-cutting concerns

Challenges:
- Distributed system complexity
- Network latency and reliability
- Data consistency across services
- Monitoring and debugging
- Service orchestration""",
        "file_size": 44300,
    },
    {
        "title": "Git Version Control Guide",
        "filename": "git_guide.txt",
        "file_type": "txt",
        "content": """Git Version Control: Essential Commands and Workflows

Basic Commands:
git init - Initialize a new repository
git clone <url> - Clone a remote repository
git add <file> - Stage changes
git commit -m "message" - Commit staged changes
git push - Push commits to remote
git pull - Fetch and merge from remote
git status - Check working tree status
git log - View commit history

Branching:
git branch <name> - Create a new branch
git checkout <branch> - Switch branches
git merge <branch> - Merge branch into current
git rebase <branch> - Rebase current branch

Git Flow Workflow:
- main: Production-ready code
- develop: Integration branch
- feature/*: New features
- release/*: Release preparation
- hotfix/*: Production fixes

Best Practices:
1. Write meaningful commit messages
2. Commit early and often
3. Use branches for features
4. Review code before merging
5. Keep commits atomic
6. Use .gitignore properly
7. Never commit secrets or credentials""",
        "file_size": 18900,
    },
    {
        "title": "TypeScript Advanced Features",
        "filename": "typescript_advanced.md",
        "file_type": "md",
        "content": """# TypeScript Advanced Features

## Generics
Generics allow creating reusable components that work with multiple types while maintaining type safety.

```typescript
function identity<T>(arg: T): T {
  return arg;
}
```

## Utility Types
- Partial<T>: Makes all properties optional
- Required<T>: Makes all properties required
- Pick<T, K>: Select specific properties
- Omit<T, K>: Remove specific properties
- Record<K, T>: Create an object type with keys K and values T

## Conditional Types
```typescript
type IsString<T> = T extends string ? 'yes' : 'no';
```

## Template Literal Types
```typescript
type EventName = `on${Capitalize<string>}`;
```

## Mapped Types
Transform existing types by iterating over their properties.

## Declaration Merging
Interfaces with the same name are automatically merged.

## Type Guards
Custom type guards narrow types in conditional blocks.

## Decorators
Experimental feature for meta-programming with classes and methods.""",
        "file_size": 22400,
    },
    {
        "title": "DevOps Best Practices",
        "filename": "devops_practices.pdf",
        "file_type": "pdf",
        "content": """DevOps Best Practices for Modern Software Delivery

CI/CD Pipeline:
Continuous Integration involves automatically building and testing code changes. Continuous Delivery extends this to automatically deploy to staging environments. Continuous Deployment goes further by automatically deploying to production.

Infrastructure as Code (IaC):
Define infrastructure using code (Terraform, CloudFormation, Pulumi). This enables version control, repeatability, and automation of infrastructure management.

Monitoring and Observability:
- Metrics: Prometheus, Grafana, DataDog
- Logging: ELK Stack, Splunk, CloudWatch
- Tracing: Jaeger, Zipkin, OpenTelemetry
- Alerting: PagerDuty, Opsgenie

Configuration Management:
Use tools like Ansible, Chef, or Puppet for consistent server configuration.

Container Orchestration:
Kubernetes is the standard for managing containerized workloads at scale. It handles deployment, scaling, and networking.

Security (DevSecOps):
Integrate security into every phase of the development lifecycle. Automate security scanning, vulnerability assessment, and compliance checks.

Key Metrics:
- Deployment frequency
- Lead time for changes
- Mean time to recovery (MTTR)
- Change failure rate""",
        "file_size": 39700,
    },
    {
        "title": "AI Ethics and Governance",
        "filename": "ai_ethics.docx",
        "file_type": "docx",
        "content": """AI Ethics and Governance: A Framework for Responsible AI

Ethical Principles:
1. Fairness: AI systems should be free from bias and discrimination
2. Transparency: Decisions should be explainable and understandable
3. Privacy: Personal data must be protected and used responsibly
4. Accountability: Clear responsibility for AI outcomes
5. Safety: AI systems should be reliable and secure
6. Beneficence: AI should benefit society as a whole

Key Challenges:
- Algorithmic bias in training data
- Black box decision-making
- Job displacement and economic impact
- Deepfakes and misinformation
- Autonomous weapons concerns
- Data privacy and surveillance

Governance Frameworks:
- EU AI Act: Risk-based regulatory approach
- NIST AI RMF: Risk management framework
- IEEE Ethically Aligned Design
- OECD AI Principles

Implementation Steps:
1. Establish an AI ethics board
2. Conduct impact assessments
3. Implement bias testing
4. Ensure human oversight
5. Document AI decisions
6. Regular audits and reviews""",
        "file_size": 33200,
    },
]

CHAT_SESSIONS_DATA = [
    {"title": "Machine Learning Basics Q&A", "messages": [
        {"role": "user", "content": "What are the main types of machine learning?"},
        {"role": "assistant", "content": "There are three main types of machine learning:\n\n1. **Supervised Learning**: The algorithm learns from labeled training data, where both inputs and desired outputs are provided. Common tasks include classification and regression.\n\n2. **Unsupervised Learning**: The algorithm discovers patterns in unlabeled data without predefined categories. Common tasks include clustering and dimensionality reduction.\n\n3. **Reinforcement Learning**: The algorithm learns by interacting with an environment, receiving rewards for good actions and penalties for bad ones.\n\nEach type is suited for different problem domains and data availability scenarios."},
    ]},
    {"title": "Python Coding Help", "messages": [
        {"role": "user", "content": "How do I use list comprehensions effectively?"},
        {"role": "assistant", "content": "List comprehensions are a concise way to create lists in Python. Here are key tips:\n\n**Basic syntax:**\n```python\n[expression for item in iterable if condition]\n```\n\n**Examples:**\n```python\n# Simple transformation\nsquares = [x**2 for x in range(10)]\n\n# Filtering\nevens = [x for x in range(20) if x % 2 == 0]\n\n# Nested loops\npairs = [(x, y) for x in range(3) for y in range(3)]\n```\n\n**Best practices:**\n- Use for simple transformations\n- Keep them readable (one line)\n- For complex logic, use regular for loops instead"},
    ]},
    {"title": "React Component Design", "messages": [
        {"role": "user", "content": "What's the best approach for state management in React?"},
        {"role": "assistant", "content": "The best state management approach depends on your application's complexity:\n\n**Local State (useState/useReducer):**\nBest for component-specific state that doesn't need to be shared.\n\n**Context API:**\nGood for global state that many components need (themes, auth, language).\n\n**External Libraries:**\n- **Redux Toolkit**: Complex state with predictable updates\n- **Zustand**: Lightweight with minimal boilerplate\n- **Jotai/Recoil**: Atomic state management\n- **TanStack Query**: Server state management\n\n**Guidelines:**\n1. Start with local state\n2. Lift state up only when needed\n3. Use Context for truly global state\n4. Consider external libraries for complex apps"},
    ]},
    {"title": "Database Query Optimization", "messages": [
        {"role": "user", "content": "How can I speed up slow PostgreSQL queries?"},
        {"role": "assistant", "content": "Here are the most effective PostgreSQL optimization strategies:\n\n**1. Use EXPLAIN ANALYZE**\n```sql\nEXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';\n```\n\n**2. Add Proper Indexes**\n```sql\nCREATE INDEX idx_users_email ON users(email);\nCREATE INDEX idx_orders_user_date ON orders(user_id, created_at);\n```\n\n**3. Optimize Queries**\n- Select only needed columns\n- Use JOINs instead of subqueries\n- Limit result sets with pagination\n- Use batch operations for inserts\n\n**4. Connection Pooling**\nUse PgBouncer or built-in pooling to manage connections efficiently.\n\n**5. Monitor Performance**\nUse `pg_stat_statements` to identify slow queries."},
    ]},
    {"title": "API Security Discussion", "messages": [
        {"role": "user", "content": "What are the best practices for securing a REST API?"},
        {"role": "assistant", "content": "Essential API security practices:\n\n**Authentication & Authorization:**\n- Use JWT or OAuth 2.0 for authentication\n- Implement role-based access control (RBAC)\n- Use HTTPS for all communications\n\n**Input Validation:**\n- Validate and sanitize all input\n- Use parameterized queries to prevent SQL injection\n- Implement request body size limits\n\n**Rate Limiting:**\n- Throttle requests per IP/user\n- Use exponential backoff for retries\n\n**Security Headers:**\n- CORS configuration\n- Content-Security-Policy\n- X-Content-Type-Options\n\n**Monitoring:**\n- Log all authentication attempts\n- Monitor for unusual patterns\n- Set up alerts for security events"},
    ]},
    {"title": "Cloud Migration Planning", "messages": [
        {"role": "user", "content": "What steps should we follow for migrating to the cloud?"},
        {"role": "assistant", "content": "A structured cloud migration follows these phases:\n\n**Phase 1: Assessment**\n- Inventory current applications and infrastructure\n- Identify dependencies between systems\n- Evaluate cloud readiness of each application\n- Estimate costs and ROI\n\n**Phase 2: Planning**\n- Choose migration strategy (Rehost, Replatform, Refactor, Rebuild)\n- Select cloud provider(s)\n- Design target architecture\n- Create migration timeline\n\n**Phase 3: Migration**\n- Set up cloud infrastructure\n- Migrate data and applications in phases\n- Test thoroughly at each stage\n- Implement monitoring and logging\n\n**Phase 4: Optimization**\n- Right-size resources\n- Implement auto-scaling\n- Optimize costs\n- Continuous improvement"},
    ]},
    {"title": "NLP Model Selection", "messages": [
        {"role": "user", "content": "Which NLP model should I use for text classification?"},
        {"role": "assistant", "content": "The choice depends on your requirements:\n\n**For simplicity and speed:**\n- **TF-IDF + Logistic Regression**: Great baseline, fast training\n- **FastText**: Good for short texts, efficient\n\n**For accuracy:**\n- **BERT/DistilBERT**: Excellent for general text classification\n- **RoBERTa**: Often better than BERT on benchmarks\n\n**For production:**\n- **DistilBERT**: 60% faster than BERT with 97% performance\n- **ALBERT**: Memory-efficient for large-scale deployment\n\n**For domain-specific:**\n- **BioBERT**: Biomedical text\n- **FinBERT**: Financial text\n- **LegalBERT**: Legal documents\n\n**Recommendation:**\nStart with DistilBERT fine-tuned on your data. It offers the best balance of accuracy, speed, and resource usage."},
    ]},
    {"title": "Docker Deployment Help", "messages": [
        {"role": "user", "content": "How do I create a multi-stage Docker build for a Python app?"},
        {"role": "assistant", "content": "Here's a multi-stage Dockerfile for a Python application:\n\n```dockerfile\n# Stage 1: Build dependencies\nFROM python:3.12-slim as builder\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir --prefix=/install -r requirements.txt\n\n# Stage 2: Production image\nFROM python:3.12-slim\nWORKDIR /app\nCOPY --from=builder /install /usr/local\nCOPY . .\nEXPOSE 8000\nCMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n```\n\n**Benefits:**\n- Smaller final image (no build tools)\n- Better security (fewer packages)\n- Faster deployments\n\n**Tips:**\n- Use `.dockerignore` to exclude unnecessary files\n- Pin base image versions\n- Run as non-root user in production"},
    ]},
    {"title": "Microservices Design Patterns", "messages": [
        {"role": "user", "content": "Explain the Circuit Breaker pattern for microservices."},
        {"role": "assistant", "content": "The **Circuit Breaker** pattern prevents cascade failures in distributed systems.\n\n**How it works:**\n\n**Closed State** (Normal operation):\n- Requests pass through normally\n- Failures are counted\n\n**Open State** (Failure threshold reached):\n- Requests are immediately rejected\n- Returns fallback response\n- Timer starts\n\n**Half-Open State** (After timeout):\n- Limited requests pass through\n- If successful, return to Closed\n- If failed, return to Open\n\n**Implementation example (Python):**\n```python\nclass CircuitBreaker:\n    def __init__(self, failure_threshold=5, timeout=30):\n        self.failures = 0\n        self.threshold = failure_threshold\n        self.timeout = timeout\n        self.state = 'CLOSED'\n```\n\n**Libraries:**\n- Python: `pybreaker`\n- Java: Resilience4j\n- .NET: Polly"},
    ]},
    {"title": "Git Workflow Questions", "messages": [
        {"role": "user", "content": "What's the difference between merge and rebase?"},
        {"role": "assistant", "content": "Both integrate changes from one branch into another, but differently:\n\n**Git Merge:**\n- Creates a new merge commit\n- Preserves complete history\n- Non-destructive operation\n- Shows when branches diverged and merged\n\n```\n* Merge commit\n|\\\n| * Feature commit 2\n| * Feature commit 1\n* Main commit\n```\n\n**Git Rebase:**\n- Moves commits to the tip of the target branch\n- Creates a linear history\n- Rewrites commit history\n- Cleaner, but changes commit hashes\n\n```\n* Feature commit 2 (rebased)\n* Feature commit 1 (rebased)\n* Main commit\n```\n\n**When to use which:**\n- **Merge**: For shared branches, preserving history\n- **Rebase**: For local branches, clean history\n- **Never rebase**: Published/shared branches"},
    ]},
    {"title": "TypeScript Type System", "messages": [
        {"role": "user", "content": "How do I use generic constraints in TypeScript?"},
        {"role": "assistant", "content": "Generic constraints limit what types can be used with generics:\n\n**Basic constraint:**\n```typescript\nfunction getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}\n```\n\n**Interface constraint:**\n```typescript\ninterface HasLength {\n  length: number;\n}\n\nfunction logLength<T extends HasLength>(item: T): void {\n  console.log(item.length);\n}\n\nlogLength('hello');     // OK\nlogLength([1, 2, 3]);   // OK\nlogLength(42);          // Error!\n```\n\n**Multiple constraints:**\n```typescript\nfunction merge<T extends object, U extends object>(a: T, b: U): T & U {\n  return { ...a, ...b };\n}\n```\n\n**Conditional constraints:**\n```typescript\ntype NonNullable<T> = T extends null | undefined ? never : T;\n```"},
    ]},
    {"title": "DevOps Pipeline Setup", "messages": [
        {"role": "user", "content": "How do I set up a basic CI/CD pipeline with GitHub Actions?"},
        {"role": "assistant", "content": "Here's a complete GitHub Actions CI/CD pipeline:\n\n```yaml\nname: CI/CD Pipeline\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with:\n          python-version: '3.12'\n      - run: pip install -r requirements.txt\n      - run: pytest tests/\n\n  deploy:\n    needs: test\n    if: github.ref == 'refs/heads/main'\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Deploy\n        run: echo 'Deploying...'\n```\n\n**Key concepts:**\n- **Triggers**: `on push`, `on pull_request`\n- **Jobs**: Independent units of work\n- **Steps**: Sequential actions within a job\n- **Needs**: Job dependencies\n- **Secrets**: Store sensitive data securely"},
    ]},
    {"title": "Data Preprocessing Steps", "messages": [
        {"role": "user", "content": "What are the essential data preprocessing steps?"},
        {"role": "assistant", "content": "Essential data preprocessing pipeline:\n\n**1. Data Inspection**\n```python\ndf.info()\ndf.describe()\ndf.isnull().sum()\n```\n\n**2. Handle Missing Values**\n- Drop rows/columns with too many nulls\n- Impute with mean/median/mode\n- Use forward/backward fill for time series\n\n**3. Remove Duplicates**\n```python\ndf.drop_duplicates(inplace=True)\n```\n\n**4. Handle Outliers**\n- IQR method\n- Z-score filtering\n- Domain-specific thresholds\n\n**5. Feature Encoding**\n- One-hot encoding for categorical variables\n- Label encoding for ordinal variables\n- Target encoding for high-cardinality features\n\n**6. Feature Scaling**\n- StandardScaler for normal distributions\n- MinMaxScaler for bounded features\n- RobustScaler for data with outliers\n\n**7. Feature Selection**\n- Correlation analysis\n- Mutual information\n- Recursive feature elimination"},
    ]},
    {"title": "Frontend Performance Optimization", "messages": [
        {"role": "user", "content": "How can I improve React application performance?"},
        {"role": "assistant", "content": "Key React performance optimization techniques:\n\n**1. Prevent Unnecessary Re-renders**\n```jsx\nconst MemoComponent = React.memo(({ data }) => {\n  return <div>{data.name}</div>;\n});\n```\n\n**2. Use useMemo and useCallback**\n```jsx\nconst sortedData = useMemo(() => \n  data.sort((a, b) => a.name.localeCompare(b.name)),\n  [data]\n);\n```\n\n**3. Code Splitting**\n```jsx\nconst LazyComponent = React.lazy(() => import('./HeavyComponent'));\n```\n\n**4. Virtualize Long Lists**\nUse `react-window` or `react-virtualized` for large lists.\n\n**5. Optimize Images**\n- Use next-gen formats (WebP, AVIF)\n- Lazy load images\n- Use responsive images\n\n**6. Bundle Optimization**\n- Tree shaking\n- Dynamic imports\n- Analyze bundle size with webpack-bundle-analyzer"},
    ]},
    {"title": "Backend Architecture Review", "messages": [
        {"role": "user", "content": "What are the key components of a scalable backend?"},
        {"role": "assistant", "content": "A scalable backend architecture includes:\n\n**1. API Layer**\n- Load balancer (Nginx, ALB)\n- API Gateway for routing and rate limiting\n- Stateless application servers\n\n**2. Data Layer**\n- Primary database (PostgreSQL, MySQL)\n- Read replicas for scaling reads\n- Caching layer (Redis)\n- Search engine (Elasticsearch)\n\n**3. Message Queue**\n- Async processing (RabbitMQ, Kafka)\n- Event-driven architecture\n- Background job processing\n\n**4. Storage**\n- Object storage (S3) for files\n- CDN for static assets\n\n**5. Monitoring**\n- Application metrics\n- Infrastructure monitoring\n- Distributed tracing\n- Centralized logging\n\n**6. Security**\n- Authentication/Authorization\n- Encryption (TLS, at-rest)\n- WAF and DDoS protection\n\n**Scaling patterns:**\n- Horizontal scaling\n- Database sharding\n- Microservices decomposition"},
    ]},
    {"title": "AI Model Evaluation", "messages": [
        {"role": "user", "content": "What metrics should I use to evaluate an ML classification model?"},
        {"role": "assistant", "content": "Key classification metrics and when to use them:\n\n**1. Accuracy**\n- Overall correct predictions / total predictions\n- Good for balanced datasets\n- Misleading for imbalanced data\n\n**2. Precision**\n- True Positives / (True Positives + False Positives)\n- Important when false positives are costly (spam detection)\n\n**3. Recall (Sensitivity)**\n- True Positives / (True Positives + False Negatives)\n- Important when false negatives are costly (disease detection)\n\n**4. F1 Score**\n- Harmonic mean of precision and recall\n- Best for imbalanced datasets\n\n**5. AUC-ROC**\n- Area under the ROC curve\n- Measures model's ability to distinguish classes\n- Threshold-independent\n\n**6. Confusion Matrix**\n- Visual breakdown of all predictions\n- Shows TP, TN, FP, FN\n\n**Best practice:**\nUse multiple metrics together. The right metric depends on your business context and the cost of different error types."},
    ]},
]

AI_SUMMARIES_DATA = [
    {"doc_index": 0, "title": "Summary: Introduction to Machine Learning", "summary": "## Main Topic\nThis document provides a comprehensive introduction to Machine Learning (ML), a subset of artificial intelligence.\n\n## Key Points\n- ML enables systems to learn and improve from experience without explicit programming\n- The learning process begins with observations, data, and examples to identify patterns\n- Three main types: Supervised Learning (labeled data), Unsupervised Learning (pattern discovery), and Reinforcement Learning (reward-based)\n\n## Details\nCommon algorithms covered include linear regression, decision trees, random forests, SVMs, neural networks, and k-means clustering. Each algorithm is suited for different problem types.\n\n## Takeaways\nMachine Learning is foundational to modern AI applications, and understanding the three main paradigms is essential for choosing the right approach for any given problem."},
    {"doc_index": 1, "title": "Summary: Python Best Practices", "summary": "## Main Topic\nA comprehensive guide to writing clean, maintainable Python code.\n\n## Key Points\n- Follow PEP 8 style guide for consistent code formatting\n- Always use virtual environments for dependency isolation\n- Write comprehensive docstrings and use type hints\n- Implement proper error handling with specific exceptions\n\n## Details\nThe guide covers 8 essential practices: PEP 8 compliance, virtual environments, docstrings, type hints, error handling, testing with pytest, list comprehensions, and context managers.\n\n## Takeaways\nAdopting these practices leads to more readable, maintainable, and robust Python code that is easier to debug and collaborate on."},
    {"doc_index": 2, "title": "Summary: Data Science Handbook", "summary": "## Main Topic\nA comprehensive handbook covering essential data science tools and techniques.\n\n## Key Points\n- Data collection and cleaning is the most time-consuming but crucial step\n- EDA uses statistics and visualizations to understand data\n- Statistical foundations include hypothesis testing and regression\n- Effective visualization communicates findings clearly\n\n## Details\nThe handbook spans 5 chapters: Data Collection/Cleaning, Exploratory Data Analysis, Statistical Analysis, Machine Learning Applications, and Data Visualization. Key tools include pandas, matplotlib, seaborn, and plotly.\n\n## Takeaways\nSuccessful data science requires a strong foundation in data handling, statistics, and the ability to communicate insights effectively through visualization."},
    {"doc_index": 3, "title": "Summary: Web Development with React", "summary": "## Main Topic\nA guide to building modern web applications with React.\n\n## Key Points\n- React uses component-based architecture for building complex UIs\n- Functional components with hooks are the modern standard\n- State management options range from useState to external libraries\n- Core hooks: useState, useEffect, useContext, useRef, useMemo\n\n## Details\nThe guide covers React fundamentals including components, state management strategies (local state, Context API, Redux/Zustand), and all major hooks with their use cases.\n\n## Takeaways\nReact's component model and hooks system provide a powerful, flexible framework for building modern web applications with maintainable, reusable code."},
    {"doc_index": 4, "title": "Summary: API Design Principles", "summary": "## Main Topic\nBest practices for designing RESTful APIs.\n\n## Key Points\n- Use nouns for resource URLs, HTTP methods for actions\n- Implement proper status codes, versioning, and pagination\n- Consistent error handling with descriptive messages\n- Standard authentication (JWT, OAuth 2.0) and rate limiting\n\n## Takeaways\nWell-designed REST APIs are intuitive, consistent, secure, and maintainable. Following these 7 principles ensures a good developer experience."},
    {"doc_index": 5, "title": "Summary: Database Optimization", "summary": "## Main Topic\nTechniques for optimizing database performance in high-traffic applications.\n\n## Key Points\n- Proper indexing is the most impactful optimization\n- Query optimization using EXPLAIN ANALYZE\n- Connection pooling reduces connection overhead\n- Caching layers (Redis) for frequently accessed data\n- Table partitioning for large datasets\n\n## Takeaways\nDatabase optimization is a multi-faceted effort combining indexing, query optimization, caching, and proper architecture decisions."},
    {"doc_index": 6, "title": "Summary: Cloud Computing Overview", "summary": "## Main Topic\nA comprehensive overview of cloud computing concepts and services.\n\n## Key Points\n- Three service models: IaaS, PaaS, and SaaS\n- Four deployment models: Public, Private, Hybrid, and Multi-Cloud\n- Key benefits include scalability, cost efficiency, and global availability\n\n## Takeaways\nCloud computing fundamentally changes how organizations deploy and manage IT resources, offering flexibility and cost advantages over traditional infrastructure."},
    {"doc_index": 7, "title": "Summary: Cybersecurity Fundamentals", "summary": "## Main Topic\nFoundational cybersecurity concepts for protecting digital assets.\n\n## Key Points\n- CIA Triad: Confidentiality, Integrity, Availability\n- Common threats: phishing, malware, SQL injection, XSS, DDoS\n- Defense strategies: defense in depth, least privilege, MFA\n\n## Takeaways\nCybersecurity requires a layered approach combining technical controls, employee training, and incident response planning."},
    {"doc_index": 8, "title": "Summary: Agile Project Management", "summary": "## Main Topic\nAgile methodology principles and the Scrum framework for project management.\n\n## Key Points\n- Agile Manifesto: 4 core values prioritizing people and working software\n- Scrum roles: Product Owner, Scrum Master, Development Team\n- Sprint-based iterations with planning, standup, review, and retrospective\n- Kanban as an alternative with continuous flow\n\n## Takeaways\nAgile methodologies enable teams to deliver value incrementally, adapt to change quickly, and continuously improve their processes."},
    {"doc_index": 9, "title": "Summary: Natural Language Processing", "summary": "## Main Topic\nModern NLP concepts, tasks, and approaches.\n\n## Key Points\n- Core NLP tasks: tokenization, NER, sentiment analysis, translation, QA\n- Transformer architecture is the foundation of modern NLP\n- Key models: BERT (understanding), GPT (generation)\n- Applications span chatbots, search, healthcare, legal, and customer feedback\n\n## Takeaways\nNLP has been revolutionized by transformer-based models, enabling computers to understand and generate human language with unprecedented accuracy."},
    {"doc_index": 10, "title": "Summary: Docker and Containerization", "summary": "## Main Topic\nDocker containerization concepts, commands, and best practices.\n\n## Key Points\n- Containers package applications with all dependencies\n- Key concepts: images, containers, Dockerfiles, Docker Compose\n- Best practices: official base images, multi-stage builds, security\n\n## Takeaways\nDocker provides consistent, portable environments for applications, solving the 'works on my machine' problem and enabling modern deployment workflows."},
    {"doc_index": 11, "title": "Summary: Microservices Architecture", "summary": "## Main Topic\nDesign and implementation of microservices architecture.\n\n## Key Points\n- Each service handles one business capability independently\n- Communication: REST, gRPC (sync) and message queues (async)\n- Design patterns: API Gateway, Circuit Breaker, Service Discovery, Saga\n- Challenges include distributed complexity and data consistency\n\n## Takeaways\nMicroservices offer scalability and flexibility but require careful design to manage the inherent complexity of distributed systems."},
    {"doc_index": 12, "title": "Summary: Git Version Control", "summary": "## Main Topic\nEssential Git commands and collaborative workflows.\n\n## Key Points\n- Core commands for daily development workflow\n- Git Flow: main, develop, feature, release, hotfix branches\n- Best practices: meaningful commits, atomic changes, branch strategy\n\n## Takeaways\nGit mastery is essential for modern software development, enabling effective collaboration, code review, and project history management."},
    {"doc_index": 13, "title": "Summary: TypeScript Advanced Features", "summary": "## Main Topic\nAdvanced TypeScript type system features for robust applications.\n\n## Key Points\n- Generics enable reusable, type-safe components\n- Utility types: Partial, Required, Pick, Omit, Record\n- Advanced concepts: conditional types, mapped types, template literals\n- Type guards and decorators for meta-programming\n\n## Takeaways\nTypeScript's advanced type system provides powerful tools for building type-safe applications with excellent developer experience and IDE support."},
    {"doc_index": 14, "title": "Summary: DevOps Best Practices", "summary": "## Main Topic\nModern DevOps practices for efficient software delivery.\n\n## Key Points\n- CI/CD pipelines automate build, test, and deployment\n- Infrastructure as Code (Terraform, CloudFormation) for repeatability\n- Monitoring stack: metrics, logging, tracing, alerting\n- Key metrics: deployment frequency, lead time, MTTR, change failure rate\n\n## Takeaways\nDevOps practices bridge development and operations, enabling organizations to deliver software faster, more reliably, and with better quality."},
    {"doc_index": 15, "title": "Summary: AI Ethics and Governance", "summary": "## Main Topic\nFramework for responsible AI development and governance.\n\n## Key Points\n- Six ethical principles: fairness, transparency, privacy, accountability, safety, beneficence\n- Key challenges: bias, black box decisions, job displacement, deepfakes\n- Regulatory frameworks: EU AI Act, NIST AI RMF, IEEE, OECD\n\n## Takeaways\nResponsible AI requires proactive governance, ethical guidelines, and continuous monitoring to ensure AI systems benefit society while minimizing harm."},
]


def seed():
    if os.environ.get("ALLOW_DESTRUCTIVE_SEED") != "1":
        raise RuntimeError("Set ALLOW_DESTRUCTIVE_SEED=1 only for an isolated demo database")
    if len(os.environ.get("SEED_USER_PASSWORD", "")) < 12:
        raise RuntimeError("SEED_USER_PASSWORD must contain at least 12 characters")
    db = SessionLocal()
    try:
        # Check if already seeded
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")

        # Create demo user
        demo_user = User(
            email="demo@airag.com",
            password_hash=hash_password(os.environ["SEED_USER_PASSWORD"]),
            name="Demo User",
            role="admin",
            is_active=True,
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        print("  Created demo user; credentials were supplied through the environment")

        # Create additional users (15+ total) with roles
        users_data = [
            ("alice@example.com", "Alice Johnson", "admin"),
            ("bob@example.com", "Bob Smith", "editor"),
            ("carol@example.com", "Carol Williams", "user"),
            ("david@example.com", "David Brown", "editor"),
            ("emma@example.com", "Emma Davis", "user"),
            ("frank@example.com", "Frank Miller", "viewer"),
            ("grace@example.com", "Grace Wilson", "user"),
            ("henry@example.com", "Henry Moore", "editor"),
            ("iris@example.com", "Iris Taylor", "user"),
            ("jack@example.com", "Jack Anderson", "viewer"),
            ("kate@example.com", "Kate Thomas", "admin"),
            ("liam@example.com", "Liam Jackson", "user"),
            ("mia@example.com", "Mia White", "editor"),
            ("noah@example.com", "Noah Harris", "user"),
            ("olivia@example.com", "Olivia Martin", "viewer"),
        ]
        for email, name, role in users_data:
            user = User(
                email=email,
                password_hash=hash_password(os.environ["SEED_USER_PASSWORD"]),
                name=name,
                role=role,
                is_active=True,
            )
            db.add(user)
        db.commit()
        print(f"  Created {len(users_data) + 1} users")

        # Create documents (16 items)
        doc_objects = []
        for i, doc_data in enumerate(DOCUMENTS_DATA):
            doc = Document(
                title=doc_data["title"],
                filename=doc_data["filename"],
                file_type=doc_data["file_type"],
                content=doc_data["content"],
                file_size=doc_data["file_size"],
                status="processed",
                user_id=demo_user.id,
            )
            db.add(doc)
            doc_objects.append(doc)
        db.commit()
        for d in doc_objects:
            db.refresh(d)
        print(f"  Created {len(doc_objects)} documents")

        # Create knowledge chunks from documents (15+ total)
        chunk_count = 0
        for doc in doc_objects:
            if doc.content:
                # Split into chunks
                paragraphs = [p.strip() for p in doc.content.split("\n\n") if p.strip()]
                for idx, para in enumerate(paragraphs[:5]):  # Up to 5 chunks per doc
                    chunk = KnowledgeChunk(
                        document_id=doc.id,
                        chunk_text=para,
                        chunk_index=idx,
                        tokens=len(para.split()),
                    )
                    db.add(chunk)
                    chunk_count += 1
        db.commit()
        print(f"  Created {chunk_count} knowledge chunks")

        # Create chat sessions with messages (16 items)
        for i, session_data in enumerate(CHAT_SESSIONS_DATA):
            base_time = utcnow() - timedelta(days=30 - i)
            session = ChatSession(
                title=session_data["title"],
                user_id=demo_user.id,
                created_at=base_time,
                updated_at=base_time + timedelta(minutes=5),
            )
            db.add(session)
            db.commit()
            db.refresh(session)

            for j, msg_data in enumerate(session_data["messages"]):
                msg = ChatMessage(
                    session_id=session.id,
                    role=msg_data["role"],
                    content=msg_data["content"],
                    model_used="anthropic/claude-haiku-4.5" if msg_data["role"] == "assistant" else None,
                    response_time=1.2 if msg_data["role"] == "assistant" else None,
                    created_at=base_time + timedelta(minutes=j),
                )
                db.add(msg)
            db.commit()
        print(f"  Created {len(CHAT_SESSIONS_DATA)} chat sessions with messages")

        # Create AI summaries (16 items)
        for s_data in AI_SUMMARIES_DATA:
            doc_index = s_data["doc_index"]
            if doc_index < len(doc_objects):
                summary = AISummary(
                    document_id=doc_objects[doc_index].id,
                    title=s_data["title"],
                    summary=s_data["summary"],
                    model_used="anthropic/claude-haiku-4.5",
                )
                db.add(summary)
        db.commit()
        print(f"  Created {len(AI_SUMMARIES_DATA)} AI summaries")

        # ============================
        # NEW FEATURES SEED DATA
        # ============================

        # Create Tags (16 items)
        tags_data = [
            ("Machine Learning", "#3b82f6", "Topics related to ML algorithms and models"),
            ("Python", "#eab308", "Python programming language topics"),
            ("Data Science", "#10b981", "Data science methodology and tools"),
            ("React", "#06b6d4", "React.js framework and frontend development"),
            ("API Design", "#8b5cf6", "REST API design and best practices"),
            ("Database", "#f59e0b", "Database management and optimization"),
            ("Cloud", "#6366f1", "Cloud computing platforms and services"),
            ("Security", "#ef4444", "Cybersecurity and application security"),
            ("Agile", "#14b8a6", "Agile methodologies and project management"),
            ("NLP", "#ec4899", "Natural language processing and text analytics"),
            ("Docker", "#0ea5e9", "Containerization and Docker technologies"),
            ("Microservices", "#a855f7", "Microservices architecture patterns"),
            ("Git", "#f97316", "Version control and Git workflows"),
            ("TypeScript", "#2563eb", "TypeScript language features"),
            ("DevOps", "#84cc16", "DevOps practices and CI/CD pipelines"),
            ("AI Ethics", "#d946ef", "Responsible AI and governance frameworks"),
        ]
        tag_objects = []
        for name, color, desc in tags_data:
            tag = Tag(name=name, color=color, description=desc, user_id=demo_user.id)
            db.add(tag)
            tag_objects.append(tag)
        db.commit()
        for t in tag_objects:
            db.refresh(t)
        print(f"  Created {len(tag_objects)} tags")

        # Assign tags to documents (16+ assignments)
        tag_assignments = [
            (0, 0), (0, 2), (1, 1), (2, 2), (2, 0), (3, 3), (4, 4),
            (5, 5), (6, 6), (7, 7), (8, 8), (9, 9), (9, 0),
            (10, 10), (11, 11), (12, 12), (13, 13), (14, 14), (15, 15),
        ]
        for doc_idx, tag_idx in tag_assignments:
            if doc_idx < len(doc_objects) and tag_idx < len(tag_objects):
                dt = DocumentTag(document_id=doc_objects[doc_idx].id, tag_id=tag_objects[tag_idx].id)
                db.add(dt)
        db.commit()
        print(f"  Created {len(tag_assignments)} document-tag assignments")

        # Create Prompt Templates (16 items)
        prompts_data = [
            ("Summarize Document", "Analysis", "Generate a comprehensive summary of the following document content.", "Automatically creates a structured summary with key points and takeaways"),
            ("Extract Key Points", "Analysis", "List the top 10 most important points from this document. Format as a numbered list with brief explanations.", "Extracts the most critical information as bullet points"),
            ("Generate FAQ", "Content", "Based on this document, generate a list of 10 frequently asked questions and their answers.", "Creates Q&A pairs from document content"),
            ("Explain Like I'm 5", "Simplification", "Explain the main concepts from this document in simple language that a 5-year-old could understand.", "Simplifies complex content into easy-to-understand language"),
            ("Technical Analysis", "Analysis", "Provide a detailed technical analysis of this document. Include strengths, weaknesses, and technical accuracy.", "Deep technical review with expert-level analysis"),
            ("Create Study Guide", "Education", "Create a study guide from this document with key terms, concepts, review questions, and important formulas or definitions.", "Transforms content into educational study material"),
            ("Find Action Items", "Productivity", "Extract all action items, to-dos, and next steps mentioned in this document. Format as a checklist.", "Identifies actionable tasks from document content"),
            ("Sentiment Analysis", "Analysis", "Analyze the sentiment and tone of this document. Is it positive, negative, or neutral? Provide evidence.", "Evaluates the emotional tone and bias in the text"),
            ("Code Review", "Development", "Review any code snippets in this document. Check for best practices, potential bugs, and suggest improvements.", "Provides code quality feedback and suggestions"),
            ("Generate Quiz", "Education", "Create a 10-question quiz based on the content of this document. Include multiple choice and short answer questions.", "Creates assessment questions from document content"),
            ("Translate to Plain English", "Simplification", "Rewrite the key points of this document in plain, everyday English. Avoid jargon and technical terms.", "Removes jargon and makes content accessible"),
            ("SWOT Analysis", "Business", "Perform a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) based on the information in this document.", "Strategic analysis framework applied to document content"),
            ("Risk Assessment", "Business", "Identify and assess potential risks mentioned or implied in this document. Rate each risk by likelihood and impact.", "Evaluates risks with likelihood and impact ratings"),
            ("Executive Summary", "Business", "Write a one-page executive summary of this document suitable for C-level stakeholders.", "Concise high-level summary for decision makers"),
            ("Compare and Contrast", "Analysis", "Compare and contrast the main ideas in this document with common industry practices. Note agreements and disagreements.", "Comparative analysis against industry standards"),
            ("Extract Definitions", "Reference", "Extract all key terms and their definitions from this document. Format as a glossary.", "Creates a glossary of terms from document content"),
        ]
        for title, category, template, desc in prompts_data:
            pt = PromptTemplate(
                title=title, description=desc, template_text=template,
                category=category, is_active=True, user_id=demo_user.id,
            )
            db.add(pt)
        db.commit()
        print(f"  Created {len(prompts_data)} prompt templates")

        # Create Activity Log entries (20 items)
        activity_data = [
            ("login", "user", 1, "Demo User", "User logged in successfully"),
            ("document_upload", "document", 1, "Introduction to Machine Learning", "Uploaded PDF document (45.2 KB)"),
            ("document_upload", "document", 2, "Python Best Practices Guide", "Uploaded TXT document (32.1 KB)"),
            ("chat_created", "session", 1, "Machine Learning Basics Q&A", "Started new chat session"),
            ("summary_generated", "summary", 1, "Summary: Introduction to Machine Learning", "AI summary generated using claude-haiku-4.5"),
            ("document_upload", "document", 3, "Data Science Handbook", "Uploaded PDF document (67.8 KB)"),
            ("search_performed", "search", None, "machine learning algorithms", "Searched with 5 results found"),
            ("chat_created", "session", 2, "Python Coding Help", "Started new chat session"),
            ("document_upload", "document", 4, "Web Development with React", "Uploaded MD document (28.5 KB)"),
            ("summary_generated", "summary", 2, "Summary: Python Best Practices", "AI summary generated using claude-haiku-4.5"),
            ("document_deleted", "document", None, "Old Draft Document", "Document and associated chunks removed"),
            ("chat_created", "session", 3, "React Component Design", "Started new chat session"),
            ("document_upload", "document", 5, "API Design Principles", "Uploaded TXT document (21.3 KB)"),
            ("tag_created", "tag", 1, "Machine Learning", "New tag created"),
            ("favorite_added", "favorite", 1, "Introduction to Machine Learning", "Document added to favorites"),
            ("summary_generated", "summary", 3, "Summary: Data Science Handbook", "AI summary generated using claude-haiku-4.5"),
            ("document_upload", "document", 6, "Database Optimization Techniques", "Uploaded PDF document (38.9 KB)"),
            ("chat_created", "session", 4, "Database Query Optimization", "Started new chat session"),
            ("prompt_used", "prompt", 1, "Summarize Document", "Prompt template used in chat"),
            ("login", "user", 1, "Demo User", "User logged in from new device"),
        ]
        for i, (action, etype, eid, ename, details) in enumerate(activity_data):
            log = ActivityLog(
                user_id=demo_user.id,
                user_name="Demo User",
                action=action,
                entity_type=etype,
                entity_id=eid,
                entity_name=ename,
                details=details,
                created_at=utcnow() - timedelta(days=20 - i, hours=i),
            )
            db.add(log)
        db.commit()
        print(f"  Created {len(activity_data)} activity log entries")

        # Create Favorites (16 items)
        favorites_data = [
            ("document", 1, "Introduction to Machine Learning", "Core ML reference doc"),
            ("document", 2, "Python Best Practices Guide", "Daily coding reference"),
            ("document", 3, "Data Science Handbook", "Great for EDA techniques"),
            ("document", 5, "API Design Principles", "Must-read for API work"),
            ("document", 7, "Cloud Computing Overview", "Cloud architecture reference"),
            ("document", 8, "Cybersecurity Fundamentals", "Security checklist source"),
            ("document", 10, "Natural Language Processing", "NLP project reference"),
            ("document", 12, "Microservices Architecture", "Architecture patterns"),
            ("session", 1, "Machine Learning Basics Q&A", "Great ML discussion"),
            ("session", 3, "React Component Design", "Useful React patterns"),
            ("session", 5, "API Security Discussion", "Security best practices chat"),
            ("session", 7, "NLP Model Selection", "Model comparison notes"),
            ("summary", 1, "Summary: Introduction to Machine Learning", "Quick ML overview"),
            ("summary", 3, "Summary: Data Science Handbook", "Data science quick ref"),
            ("summary", 10, "Summary: Natural Language Processing", "NLP summary bookmark"),
            ("summary", 15, "Summary: DevOps Best Practices", "DevOps quick reference"),
        ]
        for etype, eid, ename, note in favorites_data:
            fav = Favorite(
                user_id=demo_user.id,
                entity_type=etype,
                entity_id=eid,
                entity_name=ename,
                note=note,
            )
            db.add(fav)
        db.commit()
        print(f"  Created {len(favorites_data)} favorites")

        print("\nSeeding complete!")
        print("  Demo credentials were supplied through the environment")

        # Build ChromaDB vector index from knowledge chunks
        print("\nBuilding vector search index...")
        try:
            from services.embedding_service import embed_texts
            from services import vector_store

            all_chunks = db.query(KnowledgeChunk).all()
            # Group chunks by document
            doc_chunks = {}
            for chunk in all_chunks:
                if chunk.document_id not in doc_chunks:
                    doc_chunks[chunk.document_id] = []
                doc_chunks[chunk.document_id].append(chunk)

            total_embedded = 0
            for doc_id, chunks in doc_chunks.items():
                texts = [c.chunk_text for c in chunks]
                chunk_ids = [c.id for c in chunks]
                embeddings = embed_texts(texts)
                vector_store.add_document(doc_id, texts, embeddings, chunk_ids)
                total_embedded += len(texts)

            print(f"  Embedded {total_embedded} chunks from {len(doc_chunks)} documents into ChromaDB")
        except Exception as e:
            print(f"  Warning: Vector index build failed: {e}")
            print("  Smart search will use PostgreSQL text fallback")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
