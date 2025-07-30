# Changelog

All notable changes to Sentra CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-01

### Added
- **Initial Release** - The intelligent Claude Code command center for autonomous project execution

#### Core Features
- **8 Specialized AI Personas** - Requirements Analyst, UI/UX Designer, Frontend Developer, Backend Architect, QA Engineer, Security Analyst, Technical Writer, DevOps Engineer
- **Context Management** - Automatic monitoring and cleanup to prevent AI hallucinations (<40% usage enforcement)
- **Interactive Permission System** - SMS/Push approval workflow for risky operations with multi-channel notifications
- **Real-time Dashboard** - WebSocket-powered monitoring interface with live metrics and controls
- **Task Orchestration** - Intelligent routing and dependency resolution across personas

#### CLI Commands
- `sentra init` - Initialize Sentra in a project with interactive setup
- `sentra requirements` - Multi-round requirements discovery with stakeholder analysis
- `sentra dashboard` - Launch real-time monitoring dashboard
- `sentra task execute <id>` - Execute specific Linear tasks
- `sentra config` - Interactive configuration management
- `sentra status` - System status and agent activity monitoring
- `sentra permissions` - Manage approval requests
- `sentra context` - Monitor context usage across agents

#### Integrations
- **Linear** - Task management and issue tracking with automatic task creation
- **GitHub** - Repository management, PR creation, and CI/CD integration
- **Figma** - Design generation and asset management
- **Twilio** - SMS notifications for approval workflows
- **Pushover** - Push notifications for real-time updates
- **Playwright** - End-to-end testing and browser automation

#### Quality & Testing
- **95% Test Coverage** - Comprehensive unit, integration, and E2E testing
- **TypeScript Strict Mode** - Zero tolerance for `any` types
- **Enterprise-grade Architecture** - Event-driven system with comprehensive logging
- **Production-ready Infrastructure** - Express + Socket.io backend with React frontend

#### Documentation
- **Comprehensive README** - Installation, setup, and usage instructions
- **API Documentation** - Complete REST and WebSocket API reference
- **MCP Integration Guide** - Official Claude Code MCP server configuration
- **Developer Documentation** - Architecture, testing, and contribution guidelines

### Technical Details
- **Node.js 18+** requirement for modern JavaScript features
- **ESM Support** - Pure ES modules for better tree-shaking and compatibility
- **Claude Code Integration** - Official MCP (Model Context Protocol) compliance
- **Security First** - Permission-based execution with risk assessment
- **Real-time Communication** - WebSocket-based live updates and monitoring

### Dependencies
- Commander.js for CLI interface
- Express + Socket.io for dashboard backend
- React + TypeScript for dashboard frontend
- Axios for HTTP client integrations
- Winston for comprehensive logging
- Vitest for testing framework
- Rollup for optimized builds

---

*This is the initial release of Sentra CLI, establishing the foundation for AI-powered autonomous project execution within Claude Code environments.*