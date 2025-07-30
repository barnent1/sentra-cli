# Getting Started with Sentra CLI

> The intelligent Claude Code command center for autonomous project execution

Welcome to Sentra CLI! This guide will walk you through installing, configuring, and using Sentra to transform your development workflow with AI-powered automation.

## What is Sentra?

Sentra is an advanced AI orchestration system that leverages 8 specialized AI personas to autonomously plan, develop, and deploy software projects. Built specifically for Claude Code environments, Sentra provides:

- **Intelligent Task Routing** - Automatically assigns work to the best AI persona
- **Context-Aware Execution** - Prevents hallucinations with <40% context usage
- **Interactive Permissions** - SMS/Push approvals for risky operations
- **Real-time Monitoring** - Live dashboard with metrics and controls

## Prerequisites

Before installing Sentra, ensure you have:

- **Node.js 18+** - Required for modern JavaScript features
- **Claude Code IDE** - With MCP (Model Context Protocol) support
- **Git** - For version control integration
- **Active Integrations** - At minimum, Linear and GitHub tokens

## Installation

### 1. Install Sentra CLI Globally

```bash
npm install -g @sentra/cli
```

### 2. Verify Installation

```bash
sentra --version
# Should display: 0.1.0
```

### 3. Initialize Your First Project

Navigate to your project directory and run:

```bash
cd your-project
sentra init
```

This launches an interactive setup wizard that will:
- Create the `.sentra/` configuration directory
- Set up all 8 AI personas with default preferences
- Generate environment templates
- Configure git hooks for quality gates

## Quick Start Tutorial

### Step 1: Configure Your Integrations

Create a `.env` file in your project root:

```bash
# Copy the template
cp .env.example .env

# Edit with your credentials
nano .env
```

**Required Environment Variables:**

```bash
# Linear Integration (Required)
LINEAR_API_KEY=your_linear_api_key_here
LINEAR_TEAM_ID=your_team_id_here

# GitHub Integration (Required)
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here

# SMS Notifications (Optional but Recommended)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
TWILIO_NOTIFICATION_NUMBER=your_notification_number

# Push Notifications (Optional)
PUSHOVER_TOKEN=your_pushover_app_token
PUSHOVER_USER=your_pushover_user_key
```

### Step 2: Start Requirements Discovery

Launch Sentra's multi-round requirements gathering:

```bash
sentra requirements --interactive
```

The **Requirements Analyst Master** will guide you through:
1. **Project Overview** - Name, description, and objectives
2. **Stakeholder Analysis** - Who will use and benefit from this project
3. **Acceptance Criteria** - Detailed success conditions
4. **Risk Assessment** - Potential challenges and mitigation strategies

This process typically takes 10-15 minutes and results in:
- Comprehensive project requirements document
- Linear tasks automatically created and prioritized
- Initial project timeline and estimates

### Step 3: Launch the Dashboard

Start real-time monitoring of your AI agents:

```bash
sentra dashboard
```

This opens a web interface at `http://localhost:3001` showing:
- **Live Agent Status** - Which personas are active and their context usage
- **Task Progress** - Real-time updates on task execution
- **System Metrics** - Performance, success rates, and efficiency
- **Permission Requests** - Pending approvals requiring your attention

### Step 4: Execute Your First Task

From the dashboard or CLI, execute a Linear task:

```bash
sentra task execute LIN-123
```

Sentra will:
1. **Analyze the task** and select the optimal AI persona
2. **Check context limits** to prevent hallucinations
3. **Request permissions** for any risky operations via SMS/Push
4. **Execute the work** with real-time progress updates
5. **Update Linear** with results and documentation

## Understanding the 8 AI Personas

Each persona is specialized for different aspects of development:

### 🧑‍💼 Requirements Analyst Master
- **Specializes in:** Stakeholder analysis, user story creation, acceptance criteria
- **Context limit:** 30%
- **Best for:** Project planning, feature specification, requirements validation

### 🎨 UI/UX Designer Master  
- **Specializes in:** User experience design, interface design, design systems, accessibility
- **Context limit:** 25%
- **Best for:** Wireframes, prototypes, design systems, user research

### ⚛️ Frontend Developer Master
- **Specializes in:** React development, TypeScript, responsive design, state management
- **Context limit:** 35%
- **Best for:** Component implementation, UI logic, client-side optimization

### 🏗️ Backend Architect Master
- **Specializes in:** API design, database architecture, microservices, scalability
- **Context limit:** 35%
- **Best for:** System design, database schemas, API endpoints, performance optimization

### 🧪 QA Engineer Master
- **Specializes in:** Test automation, quality assurance, performance testing
- **Context limit:** 30%
- **Best for:** Test strategy, automated testing, quality gates, performance validation

### 🛡️ Security Analyst Master
- **Specializes in:** Security auditing, vulnerability assessment, compliance
- **Context limit:** 25%
- **Best for:** Security reviews, penetration testing, compliance validation

### 📝 Technical Writer Master
- **Specializes in:** Documentation, API documentation, user guides
- **Context limit:** 20%
- **Best for:** README files, API docs, user manuals, technical specifications

### ⚙️ DevOps Engineer Master
- **Specializes in:** CI/CD pipelines, infrastructure, containerization, monitoring
- **Context limit:** 30%
- **Best for:** Deployment automation, infrastructure setup, monitoring configuration

## Permission System

Sentra includes a sophisticated permission system that requires approval for potentially risky operations:

### Risk Levels

- **🟢 Low Risk** - Auto-approved (file reads, safe commands)
- **🟡 Medium Risk** - Quick approval needed (package installs, config changes)
- **🟠 High Risk** - Careful review required (database changes, deployments)
- **🔴 Critical Risk** - Maximum scrutiny (destructive operations, production changes)

### Approval Methods

1. **SMS Notifications** - Receive approval requests via Twilio
2. **Push Notifications** - Get alerts via Pushover
3. **Dashboard Interface** - Approve directly in the web UI

### Example Approval Flow

When Sentra encounters a risky operation:

1. **Risk Assessment** - Automatically classifies the operation
2. **Notification Dispatch** - Sends SMS/Push with operation details
3. **User Response** - Reply with `APPROVE <ID>` or `DENY <ID>`
4. **Execution or Abort** - Proceeds based on your decision
5. **Audit Trail** - All approvals logged in Linear and dashboard

## Context Management

Sentra's most critical feature is preventing AI hallucinations through intelligent context management:

### The 40% Rule

- **Total context usage must stay below 40%**
- **Individual personas have specific limits (20-35%)**
- **Automatic cleanup when approaching limits**
- **Real-time monitoring and alerts**

### How It Works

1. **Context Tracking** - Every file, interface, and dependency is measured
2. **Automatic Cleanup** - Removes old or less important context items
3. **Task Decomposition** - Breaks large tasks into smaller, focused chunks
4. **Persona Optimization** - Routes work to agents with available context

### Monitoring Context Usage

Check current context usage anytime:

```bash
sentra context
```

Or monitor continuously in the dashboard with real-time charts and recommendations.

## Next Steps

Now that you have Sentra running:

1. **Explore the Dashboard** - Familiarize yourself with the monitoring interface
2. **Review Generated Tasks** - Check the Linear tasks created from requirements
3. **Execute Sample Tasks** - Try running a few simple tasks to see the workflow
4. **Configure Notifications** - Set up SMS/Push for permission approvals
5. **Customize Personas** - Adjust persona preferences for your workflow

## Getting Help

- **Documentation** - Comprehensive guides in `/docs`
- **API Reference** - Complete REST and WebSocket API documentation
- **Examples** - Sample projects and workflows
- **Community** - GitHub Discussions for questions and feedback

Ready to transform your development workflow? Let's build the future of autonomous software development! 🚀