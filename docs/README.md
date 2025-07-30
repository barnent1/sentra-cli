# Sentra CLI Documentation

> Complete documentation for the intelligent Claude Code command center

Welcome to the comprehensive documentation for Sentra CLI! Here you'll find everything you need to understand, install, configure, and master Sentra for autonomous project execution.

## 📚 Documentation Structure

### Getting Started
- **[Getting Started Guide](getting-started.md)** - Installation, setup, and your first project
- **[Understanding Personas](understanding-personas.md)** - Simple guide to Sentra's 8 AI helpers
- **[Quick Reference](quick-reference.md)** - Commands, shortcuts, and common tasks

### Technical Documentation  
- **[API Reference](api-reference.md)** - Complete REST and WebSocket API documentation
- **[Architecture Guide](architecture.md)** - Deep dive into system design and components
- **[Integration Guide](integrations.md)** - Setting up Linear, GitHub, Figma, and other services

### Advanced Usage
- **[Configuration Guide](configuration.md)** - Customizing personas, permissions, and workflows
- **[Dashboard Guide](dashboard.md)** - Using the real-time monitoring interface
- **[Permission System](permissions.md)** - Understanding approval workflows and security

### Development & Contribution
- **[Contributing Guide](contributing.md)** - How to contribute to Sentra development
- **[Testing Guide](testing.md)** - Running and writing tests
- **[Deployment Guide](deployment.md)** - Production deployment strategies

### Troubleshooting & Support
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
- **[FAQ](faq.md)** - Frequently asked questions
- **[Changelog](../CHANGELOG.md)** - Version history and updates

## 🚀 Quick Navigation

### New to Sentra?
Start with the **[Getting Started Guide](getting-started.md)** and **[Understanding Personas](understanding-personas.md)** to learn the basics.

### Ready to Build?
Check out the **[Configuration Guide](configuration.md)** and **[Integration Guide](integrations.md)** to set up your development environment.

### Need Technical Details?
Dive into the **[API Reference](api-reference.md)** and **[Architecture Guide](architecture.md)** for complete technical specifications.

### Having Issues?
Visit the **[Troubleshooting Guide](troubleshooting.md)** and **[FAQ](faq.md)** for solutions to common problems.

## 🎯 Key Concepts

### The 8 AI Personas
Sentra includes 8 specialized AI personas, each expert in different aspects of software development:

1. **Requirements Analyst Master** - Project planning and stakeholder analysis
2. **UI/UX Designer Master** - Design and user experience
3. **Frontend Developer Master** - User interfaces and client-side development
4. **Backend Architect Master** - Server-side systems and APIs
5. **QA Engineer Master** - Testing and quality assurance
6. **Security Analyst Master** - Security and compliance
7. **Technical Writer Master** - Documentation and communication
8. **DevOps Engineer Master** - Deployment and infrastructure

### Context Management
Sentra prevents AI hallucinations by enforcing a <40% context usage rule across all personas, with automatic cleanup and intelligent task decomposition.

### Permission System
Interactive approval workflows with SMS/Push notifications ensure safe execution of potentially risky operations, with comprehensive audit trails.

### Real-time Dashboard
WebSocket-powered monitoring interface provides live updates on agent status, task progress, system metrics, and permission requests.

## 🛠 Core Features

- **Autonomous Task Execution** - AI personas work independently with minimal human intervention
- **Intelligent Task Routing** - Automatic assignment to the best-suited persona
- **Context-Aware Processing** - Prevents hallucinations through smart context management
- **Interactive Permissions** - Multi-channel approval system for risky operations
- **Real-time Monitoring** - Live dashboard with metrics and controls
- **Comprehensive Integrations** - Linear, GitHub, Figma, Twilio, Pushover, Playwright
- **95% Test Coverage** - Enterprise-grade quality and reliability
- **TypeScript Strict Mode** - Zero tolerance for type errors

## 📖 Documentation Conventions

### Code Examples
All code examples are tested and verified. Language-specific examples are provided where applicable:

```bash
# CLI commands
sentra init --interactive

# Environment variables  
export LINEAR_API_KEY="your_key_here"
```

```typescript
// TypeScript/JavaScript examples
import { SentraClient } from '@sentra/cli';
const client = new SentraClient();
```

### Status Indicators
- ✅ **Completed features** - Ready for production use
- 🚧 **In development** - Coming in future releases  
- ⚠️ **Important notes** - Critical information to remember
- 💡 **Tips and tricks** - Helpful recommendations

### Navigation Links
All documentation is cross-linked for easy navigation. Use the links in each document to jump between related topics.

## 🤝 Contributing to Documentation

We welcome contributions to improve our documentation! Here's how to help:

1. **Report Issues** - Found something unclear or incorrect? Create an issue on GitHub
2. **Suggest Improvements** - Have ideas for better explanations or examples? We'd love to hear them
3. **Submit Updates** - Fix typos, add examples, or write new sections via pull requests
4. **Translation** - Help us translate documentation for international users

### Documentation Standards
- **Clarity First** - Write for users at all skill levels
- **Examples Required** - Every concept needs a practical example
- **Test Everything** - All code examples must be tested and working
- **Link Liberally** - Cross-reference related topics extensively

## 📞 Getting Help

- **GitHub Issues** - Report bugs and request features
- **GitHub Discussions** - Ask questions and share ideas  
- **Email Support** - Technical support for enterprise users
- **Community** - Join our community for peer support

## 📄 License

This documentation is part of Sentra CLI and is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

---

*Documentation written by the Technical Writer Master persona, because even AI documentation deserves the expert touch! 🤖✍️*