# Sentra CLI

> The intelligent Claude Code command center for autonomous project execution

[![npm version](https://badge.fury.io/js/@sentra%2Fcli.svg)](https://badge.fury.io/js/@sentra%2Fcli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![Claude Code Ready](https://img.shields.io/badge/Claude_Code-Ready-blue.svg)](https://claude.ai/code)

## 🌟 Overview

Sentra CLI is an advanced AI-powered project orchestration system that transforms how software is planned, developed, and deployed. By leveraging 8 specialized AI personas and the Model Context Protocol (MCP), Sentra enables near-autonomous project execution with minimal human intervention within Claude Code.

### 🎯 Key Features

- **8 Specialized AI Personas** for different aspects of development
- **Ultra-Detailed Planning** through multi-round requirements discovery
- **Context Management** with <40% usage enforcement to prevent hallucinations
- **Interactive Permission System** with SMS/Push approvals for risky operations
- **Real-Time Dashboard** with WebSocket-powered monitoring
- **Linear Integration** for comprehensive task management
- **95% Test Coverage** enforcement with comprehensive quality gates

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g @sentra/cli

# Verify installation
sentra --version
```

### Setup

1. **Initialize Sentra in your project:**
```bash
cd your-project
sentra init
```

2. **Configure your environment:**
```bash
# Copy the generated .env.example to .env
cp .env.example .env

# Edit .env with your API keys
# Required: LINEAR_API_KEY, GITHUB_PERSONAL_ACCESS_TOKEN, etc.
```

3. **Start your first project:**
```bash
# Begin with ultra-detailed requirements gathering
sentra requirements

# Execute specific tasks
sentra task execute LIN-123

# Monitor progress
sentra dashboard
```

## 📖 Commands

### Project Management
- `sentra init` - Initialize Sentra in a project
- `sentra requirements` - Multi-round requirements discovery
- `sentra task execute <id>` - Execute a specific Linear task
- `sentra dashboard` - Launch real-time monitoring dashboard

### Configuration
- `sentra config` - Interactive configuration setup
- `sentra config personas` - Customize AI persona behavior
- `sentra config permissions` - Set up approval workflows
- `sentra config integrations` - Configure MCP servers

### Monitoring & Control
- `sentra status` - Show system status and agent activity
- `sentra logs` - View execution logs and debug information
- `sentra permissions` - Manage pending approval requests
- `sentra context` - Monitor context usage across agents

## 🤖 AI Personas

Sentra employs 8 specialized AI personas, each optimized for specific development tasks:

1. **Requirements Analyst Master** - Multi-round discovery, stakeholder analysis
2. **UI/UX Designer Master** - Apple-quality design generation, Figma integration
3. **Frontend Developer Master** - Clean component implementation, testing
4. **Backend Architect Master** - Scalable service architecture, API design
5. **QA Engineer Master** - Comprehensive testing strategies, automation
6. **Security Analyst Master** - Enterprise-grade security, compliance
7. **Technical Writer Master** - Automated documentation generation
8. **DevOps Engineer Master** - CI/CD, infrastructure, monitoring

## 🔧 Architecture

### Core Components
- **Agent Orchestrator** - Manages persona routing and task distribution
- **Task Executor** - Handles atomic task execution with dependency resolution
- **Context Manager** - Enforces <40% context usage to prevent hallucinations
- **Permission Manager** - Interactive approval system with risk assessment

### Dashboard System
- **Real-time Monitoring** - WebSocket-powered live updates
- **Interactive Interface** - React + TypeScript + Tailwind CSS
- **Backend Services** - Express + Socket.io + PostgreSQL + Redis

### Integration Layer
- **MCP Servers** - Linear, GitHub, Figma, Twilio, Playwright, Pushover
- **Quality Gates** - 95% test coverage, TypeScript strict mode, security scanning
- **Notification System** - Multi-channel alerts (SMS, Push, Dashboard)

## 📋 Requirements

### System Requirements
- **Node.js** 18.0.0 or higher
- **Claude Code** IDE with MCP support
- **Git** for version control
- **Docker** (optional, for dashboard services)

### Required API Keys
- **Linear API Key** - Task management integration
- **GitHub Personal Access Token** - Repository management
- **Figma Access Token** - Design integration
- **Twilio Credentials** - SMS notifications
- **Pushover Tokens** - Push notifications (optional)

## 🔐 Security

- **Permission System** - Interactive Y/N approvals for destructive operations
- **Risk Assessment** - Automatic classification of operation risk levels
- **Audit Logging** - Comprehensive logging of all actions and approvals
- **Encryption** - Secure storage of sensitive data and API keys
- **Network Security** - TLS encryption for all communications

## 📊 Quality Assurance

- **95% Test Coverage** - Enforced across unit, integration, and E2E tests
- **TypeScript Strict Mode** - No `any` types allowed
- **ESLint Zero Warnings** - Strict code quality standards
- **Performance Testing** - Load testing for scalability validation
- **Security Scanning** - Automated vulnerability detection
- **Accessibility Compliance** - WCAG 2.1 AA standards

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/barnent1/sentra-cli.git
cd sentra-cli

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- **[Sentra Project Base](https://github.com/barnent1/Sentra)** - Clean project template for Sentra integration
- **[Model Context Protocol](https://modelcontextprotocol.io)** - Protocol specification
- **[Claude Code](https://claude.ai/code)** - AI-powered development environment

## 🙏 Acknowledgments

- **Anthropic** for Claude AI and the Model Context Protocol
- **Linear** for excellent task management API
- **GitHub** for repository management and CI/CD integration
- **The Open Source Community** for inspiration and contributions

---

<p align="center">
  <strong>Ready to transform your development workflow with AI?</strong><br>
  Start building the future of autonomous software development.
</p>

<p align="center">
  <code>npm install -g @sentra/cli</code>
</p>