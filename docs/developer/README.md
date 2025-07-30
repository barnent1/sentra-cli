# Sentra CLI Developer Documentation

> Technical documentation for developers integrating with, extending, or contributing to Sentra CLI

This documentation is for software developers, DevOps engineers, and technical teams who need to understand Sentra's internals, integrate with its APIs, or contribute to the codebase.

## 🛠 Developer Documentation

### Core Architecture
- **[System Architecture](architecture.md)** - High-level system design and component interactions
- **[Agent Orchestration](agent-orchestration.md)** - How AI personas are managed and coordinated
- **[Context Management](context-management.md)** - Prevention of AI hallucinations through context control
- **[Permission System](permission-system.md)** - Security model and approval workflows

### API Documentation
- **[REST API Reference](api/rest-api.md)** - Complete HTTP API specification
- **[WebSocket API Reference](api/websocket-api.md)** - Real-time communication protocol
- **[CLI API Reference](api/cli-api.md)** - Command-line interface documentation
- **[Node.js SDK](api/nodejs-sdk.md)** - JavaScript/TypeScript client library

### Integration Development
- **[MCP Integration Guide](integrations/mcp-guide.md)** - Model Context Protocol implementation
- **[Custom Integrations](integrations/custom-integrations.md)** - Building new service integrations
- **[Linear Integration](integrations/linear.md)** - Task management integration details
- **[GitHub Integration](integrations/github.md)** - Repository management integration
- **[Notification Integrations](integrations/notifications.md)** - SMS, Push, and custom notifications

### Extension Development
- **[Plugin Architecture](extensions/plugin-architecture.md)** - Building Sentra plugins
- **[Custom Personas](extensions/custom-personas.md)** - Creating specialized AI personas
- **[Hook System](extensions/hooks.md)** - Event-driven customization
- **[Dashboard Extensions](extensions/dashboard-extensions.md)** - Custom UI components

### Testing & Quality
- **[Testing Guide](testing/testing-guide.md)** - Running and writing tests
- **[Test Architecture](testing/test-architecture.md)** - Testing strategy and patterns
- **[Mocking Guide](testing/mocking-guide.md)** - Mock implementations for development
- **[Performance Testing](testing/performance-testing.md)** - Load testing and benchmarks

### Deployment & Operations
- **[Deployment Guide](deployment/deployment-guide.md)** - Production deployment strategies
- **[Docker Deployment](deployment/docker.md)** - Containerized deployment
- **[Kubernetes Deployment](deployment/kubernetes.md)** - Orchestrated container deployment
- **[Monitoring & Observability](deployment/monitoring.md)** - Production monitoring setup
- **[Security Hardening](deployment/security.md)** - Production security configuration

### Development Workflow
- **[Contributing Guide](contributing/contributing-guide.md)** - How to contribute to Sentra
- **[Development Setup](contributing/development-setup.md)** - Local development environment
- **[Code Standards](contributing/code-standards.md)** - Coding conventions and best practices
- **[Release Process](contributing/release-process.md)** - How releases are managed

### Advanced Topics
- **[Event System](advanced/event-system.md)** - Internal event architecture
- **[Context Window Management](advanced/context-windows.md)** - Advanced context optimization
- **[Performance Optimization](advanced/performance.md)** - Optimization strategies and techniques
- **[Security Model](advanced/security-model.md)** - Comprehensive security architecture

## 🎯 Developer Audience

### Integration Developers
Building applications that work with Sentra:
- **Start with:** [REST API Reference](api/rest-api.md) and [Node.js SDK](api/nodejs-sdk.md)
- **Key concepts:** Authentication, rate limiting, error handling
- **Common patterns:** Event subscriptions, batch operations, webhook handling

### Platform Engineers
Deploying and operating Sentra in production:
- **Start with:** [Deployment Guide](deployment/deployment-guide.md) and [Monitoring](deployment/monitoring.md)
- **Key concepts:** Scalability, security, observability
- **Common patterns:** Blue-green deployments, auto-scaling, disaster recovery

### Extension Developers
Building plugins and custom personas:
- **Start with:** [Plugin Architecture](extensions/plugin-architecture.md) and [Custom Personas](extensions/custom-personas.md)
- **Key concepts:** Plugin lifecycle, persona interfaces, event hooks
- **Common patterns:** Configuration management, state persistence, error handling

### Core Contributors
Contributing to Sentra's codebase:
- **Start with:** [Contributing Guide](contributing/contributing-guide.md) and [Development Setup](contributing/development-setup.md)
- **Key concepts:** TypeScript patterns, testing requirements, code review process
- **Common patterns:** Event-driven architecture, dependency injection, error boundaries

## 🏗 Technical Stack

### Core Technologies
- **Runtime:** Node.js 18+ with ES modules
- **Language:** TypeScript with strict mode
- **CLI Framework:** Commander.js for command parsing
- **Web Framework:** Express.js with Socket.io for real-time communication
- **Frontend:** React 18+ with TypeScript and Tailwind CSS
- **Database:** PostgreSQL with optional Redis caching

### Development Tools
- **Build System:** Rollup with TypeScript plugin
- **Testing:** Vitest with 95% coverage requirement
- **Code Quality:** ESLint + Prettier with strict configuration
- **Type Checking:** TypeScript compiler with strict rules
- **Documentation:** Automated API docs with TypeDoc

### External Integrations
- **Task Management:** Linear GraphQL API
- **Version Control:** GitHub REST API v3
- **Design Tools:** Figma REST API
- **Communications:** Twilio SMS, Pushover Push Notifications
- **Testing:** Playwright for end-to-end testing
- **Monitoring:** Winston logging with structured output

## 📋 Quick Reference

### Development Commands
```bash
# Setup
npm install
npm run dev

# Testing
npm run test
npm run test:coverage
npm run test:e2e

# Quality
npm run lint
npm run typecheck
npm run format

# Build
npm run build
npm run build:prod
```

### API Endpoints
```bash
# Health check
GET /api/health

# Dashboard data
GET /api/dashboard

# Agent management
GET /api/agents
GET /api/agents/:persona

# Task execution
GET /api/tasks
POST /api/tasks/:id/execute

# Permission system
GET /api/permissions
POST /api/permissions/:id/respond
```

### Environment Variables
```bash
# Core configuration
NODE_ENV=development
LOG_LEVEL=info

# Required integrations
LINEAR_API_KEY=your_key
GITHUB_PERSONAL_ACCESS_TOKEN=your_token

# Optional integrations
TWILIO_ACCOUNT_SID=your_sid
PUSHOVER_TOKEN=your_token
```

## 🔧 Common Development Tasks

### Adding a New Integration
1. Create integration class in `src/integrations/`
2. Implement standard integration interface
3. Add configuration to environment variables
4. Write comprehensive tests
5. Update documentation and examples

### Creating a Custom Persona
1. Extend base persona class
2. Define specializations and context limits
3. Implement persona-specific execution logic
4. Add to orchestrator configuration
5. Write tests and documentation

### Extending the Dashboard
1. Create React component in `src/dashboard/frontend/`
2. Add WebSocket event handlers
3. Implement responsive design
4. Add to main dashboard layout
5. Write component tests

## 📊 Performance Requirements

### Code Quality Standards
- **Test Coverage:** Minimum 95% line coverage
- **Type Safety:** Zero `any` types allowed
- **Performance:** API responses under 200ms
- **Memory Usage:** Context cleanup at 40% threshold
- **Error Handling:** All errors properly typed and handled

### Production Requirements
- **Availability:** 99.9% uptime target
- **Scalability:** Support for 100+ concurrent users
- **Security:** All communications encrypted
- **Monitoring:** Comprehensive metrics and alerting
- **Backup:** Automated data backup and recovery

## 🤝 Contributing

We welcome contributions from the developer community! Here's how to get involved:

1. **Read the [Contributing Guide](contributing/contributing-guide.md)**
2. **Set up your [Development Environment](contributing/development-setup.md)**
3. **Check our [Open Issues](https://github.com/barnent1/sentra-cli/issues)**
4. **Join our [Developer Discord](https://discord.gg/sentra-dev)**

### Areas We Need Help With
- Additional integration implementations
- Performance optimizations
- Documentation improvements
- Testing and quality assurance
- Security auditing and improvements

## 📞 Developer Support

- **[GitHub Issues](https://github.com/barnent1/sentra-cli/issues)** - Bug reports and feature requests
- **[GitHub Discussions](https://github.com/barnent1/sentra-cli/discussions)** - Technical questions and ideas
- **[Developer Discord](https://discord.gg/sentra-dev)** - Real-time community support
- **[Email](mailto:developers@sentra.ai)** - Direct developer support

---

*Built by developers, for developers. Let's create the future of AI-assisted development together!* 🚀