# Sentra Architecture Documentation

> Deep dive into the technical architecture of the intelligent Claude Code command center

## System Overview

Sentra CLI is a sophisticated AI orchestration system designed for autonomous project execution within Claude Code environments. The architecture follows event-driven patterns with strict separation of concerns, enabling scalable and maintainable AI-powered development workflows.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Claude Code IDE                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    MCP Protocol Layer                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Sentra CLI Core                          │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Agent           │  │ Context         │  │ Permission      │ │
│  │ Orchestrator    │  │ Manager         │  │ Manager         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Task            │  │ Dashboard       │  │ Integration     │ │
│  │ Executor        │  │ Server          │  │ Layer           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Integrations                        │
│                                                                 │
│  Linear    GitHub    Figma    Twilio    Pushover    Playwright  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Agent Orchestrator

The central coordination system that manages all 8 AI personas and their task assignments.

**Responsibilities:**
- Intelligent task routing based on content analysis
- Agent lifecycle management (start, stop, monitor)
- Context usage monitoring and enforcement
- Real-time event emission for system state changes

**Key Classes:**
- `AgentOrchestrator` - Main orchestration engine
- `Agent` interface - Standard agent contract
- Persona implementations (RequirementsAnalyst, UIUXDesigner, etc.)

**Task Assignment Algorithm:**
```typescript
async selectOptimalAgent(task: Task): Promise<PersonaType> {
  // 1. Analyze task content for keyword matching
  const analysis = await this.analyzeTaskRequirements(task);
  
  // 2. Score each agent based on:
  //    - Specialization match (10 points per keyword)
  //    - Context availability (5 points if <80% usage)
  //    - Agent availability (8 points if idle)
  
  // 3. Return highest scoring agent
  return bestMatch.persona;
}
```

### 2. Context Manager

Critical system component that prevents AI hallucinations by enforcing the <40% context usage rule.

**Context Window Management:**
- Each persona has a dedicated context window
- Real-time usage calculation and monitoring
- Automatic cleanup when approaching limits
- Persistent state across CLI sessions

**Context Items:**
```typescript
interface ContextItem {
  type: 'file' | 'interface' | 'dependency' | 'config';
  path: string;
  content?: string;
  size: number; // Estimated token count
}
```

**Cleanup Strategy:**
1. **Priority-based removal** - Configuration items removed first
2. **Age-based removal** - Older items removed before newer ones
3. **Size optimization** - Large items removed when minimal impact
4. **Dependency preservation** - Critical dependencies retained

### 3. Permission Manager

Interactive approval system with multi-channel notifications and risk assessment.

**Risk Assessment Engine:**
```typescript
assessRisk(command: string, context: string): RiskAssessment {
  let score = 0;
  const factors: string[] = [];
  
  // Pattern matching against known risky operations
  for (const rule of this.permissionRules) {
    if (rule.pattern.test(command)) {
      score += this.getRiskScore(rule.riskLevel);
      factors.push(rule.reason);
    }
  }
  
  // Contextual factors (production, database, sudo, etc.)
  // Final risk level determined by total score
  
  return { level, factors, score, recommendation };
}
```

**Approval Flow:**
1. **Command Interception** - Risky operations detected
2. **Risk Classification** - Automatic scoring and categorization
3. **Multi-channel Notification** - SMS, Push, Dashboard alerts
4. **User Response** - Y/N approval with optional reasoning
5. **Execution Decision** - Proceed or abort based on approval
6. **Audit Trail** - Complete logging for compliance

### 4. Task Executor

Handles atomic task execution with dependency resolution and persona-specific strategies.

**Execution Pipeline:**
```typescript
async execute(task: Task, agent: Agent): Promise<ExecutionResult> {
  // 1. Dependency Resolution
  await this.resolveDependencies(task);
  
  // 2. Persona-Specific Execution
  const result = await this.executeByPersona(task, agent);
  
  // 3. Artifact Collection
  const artifacts = await this.collectArtifacts(task);
  
  // 4. Linear Integration Update
  await this.updateLinearTask(task, result);
  
  return { success: true, output: result, artifacts };
}
```

**Persona-Specific Strategies:**
Each persona has tailored execution logic:
- **Requirements Analyst:** Stakeholder analysis, user story generation
- **UI/UX Designer:** Wireframe creation, Figma integration
- **Frontend Developer:** Component implementation, testing
- **Backend Architect:** API design, database schemas
- **QA Engineer:** Test strategy, automation implementation
- **Security Analyst:** Vulnerability assessment, compliance checks
- **Technical Writer:** Documentation generation, API specs
- **DevOps Engineer:** CI/CD setup, infrastructure provisioning

### 5. Dashboard Server

Real-time monitoring interface with WebSocket communication and REST API.

**Technology Stack:**
- **Backend:** Express.js + Socket.io
- **Frontend:** React + TypeScript + Tailwind CSS
- **Communication:** WebSocket for real-time, REST for state
- **Data Flow:** Event-driven updates with optimistic UI

**WebSocket Event Architecture:**
```typescript
// Server-side event emission
this.io.emit('task-completed', {
  type: 'task-completed',
  timestamp: new Date(),
  data: { taskId, agent, result }
});

// Client-side event handling
socket.on('task-completed', (event) => {
  updateTaskStatus(event.data.taskId, 'completed');
  showNotification('success', 'Task completed successfully');
});
```

### 6. Integration Layer

Unified interface for external service communication with consistent error handling.

**Supported Integrations:**

#### Linear Integration
- **GraphQL API** - Native Linear API communication
- **Task Management** - Create, update, search, comment on issues
- **State Synchronization** - Bidirectional status updates
- **Team Integration** - Multi-team support with workspace handling

#### GitHub Integration
- **REST API v3** - Repository management and automation
- **Repository Operations** - Create, clone, manage repositories
- **Pull Request Workflow** - Automated PR creation and management
- **CI/CD Integration** - Workflow triggers and status updates

#### Figma Integration
- **Design Automation** - Programmatic design creation
- **Asset Management** - Export and optimize design assets
- **Design System Sync** - Component library synchronization
- **Collaboration** - Team-based design workflows

#### Communication Integrations
- **Twilio SMS** - Permission requests and status updates
- **Pushover Push** - Real-time notifications with priority levels
- **Multi-channel Strategy** - Redundant notification delivery

#### Testing Integration
- **Playwright E2E** - Automated browser testing
- **Test Generation** - AI-powered test creation
- **Visual Regression** - Screenshot-based testing
- **Performance Testing** - Load and performance validation

## Data Architecture

### State Management

Sentra maintains multiple layers of state:

1. **In-Memory State** - Active agents, current tasks, context windows
2. **Persistent State** - Configuration, context history, permission logs
3. **External State** - Linear tasks, GitHub repositories, integration data

### File System Structure

```
.sentra/
├── config/
│   └── sentra.json          # Main configuration
├── personas/
│   ├── requirements-analyst.json
│   ├── ui-ux-designer.json
│   └── ...                  # Individual persona configs
├── context/
│   ├── requirements-analyst.json
│   ├── frontend-developer.json
│   └── ...                  # Persisted context state
├── permissions/
│   ├── request-123.json
│   ├── request-124-response.json
│   └── ...                  # Permission audit trail
├── tasks/
│   └── history/             # Task execution history
├── logs/
│   ├── sentra.log          # General application logs
│   ├── agents.log          # Agent-specific logs
│   ├── tasks.log           # Task execution logs
│   └── permissions.log     # Permission system logs
└── artifacts/
    ├── task-123/           # Task-specific output files
    └── ...
```

### Event System

Sentra uses a comprehensive event system for loose coupling and real-time updates:

```typescript
// Core event types
type SentraEvent = 
  | TaskEvent 
  | AgentEvent 
  | PermissionEvent 
  | ContextEvent
  | SystemEvent;

// Event emission
this.emit('task.completed', {
  type: 'task.completed',
  timestamp: new Date(),
  data: { taskId, agent, result }
});

// Event handling
orchestrator.on('task.completed', (event) => {
  updateMetrics(event.data);
  notifyDashboard(event);
  logCompletion(event);
});
```

## Security Architecture

### Permission System Security

1. **Risk-Based Classification** - Automatic threat assessment
2. **Multi-Factor Approval** - SMS + Push + Dashboard confirmation
3. **Audit Logging** - Complete trail of all permission requests
4. **Timeout Enforcement** - Automatic denial of expired requests
5. **Context Validation** - Environment-aware risk assessment

### Data Protection

1. **Credential Management** - Environment variable isolation
2. **API Key Security** - Masked display, secure storage
3. **Network Security** - TLS for all external communications
4. **Input Validation** - Comprehensive sanitization and validation
5. **Error Handling** - No sensitive data in error messages

### Access Control

1. **Local Operation** - CLI runs with user permissions
2. **Integration Scoping** - Minimal required permissions for APIs
3. **Sandbox Execution** - Isolated task execution environments
4. **Emergency Controls** - Immediate system shutdown capabilities

## Performance Architecture

### Scalability Design

1. **Concurrent Agent Execution** - Multiple personas working simultaneously
2. **Event-Driven Architecture** - Non-blocking operations
3. **Context Management** - Efficient memory usage with automatic cleanup
4. **Caching Strategy** - Intelligent caching of integration responses
5. **Resource Monitoring** - Real-time performance metrics

### Optimization Strategies

1. **Context Window Optimization** - Dynamic size adjustment based on task complexity
2. **Task Batching** - Group related operations for efficiency
3. **Integration Rate Limiting** - Respect external API limitations
4. **Memory Management** - Automatic garbage collection and cleanup
5. **Database Optimization** - Efficient querying and indexing strategies

## Error Handling Architecture

### Hierarchical Error Management

```typescript
// Base error class with context
class SentraError extends Error {
  constructor(message: string, code: string, context?: unknown) {
    super(message);
    this.name = 'SentraError';
    this.code = code;
    this.context = context;
  }
}

// Specialized error types
class ContextOverflowError extends SentraError { /* ... */ }
class PermissionDeniedError extends SentraError { /* ... */ }
class TaskExecutionError extends SentraError { /* ... */ }
```

### Recovery Strategies

1. **Graceful Degradation** - System continues with reduced functionality
2. **Automatic Retry** - Configurable retry logic with exponential backoff
3. **Circuit Breakers** - Prevent cascade failures in integrations
4. **State Recovery** - Restore system state after failures
5. **Emergency Protocols** - Safe shutdown and restart procedures

## Testing Architecture

### Multi-Layer Testing Strategy

1. **Unit Tests** - Individual component testing with mocks
2. **Integration Tests** - External service integration validation
3. **End-to-End Tests** - Complete workflow testing
4. **Performance Tests** - Load and stress testing
5. **Security Tests** - Vulnerability and penetration testing

### Test Coverage Requirements

- **95% Code Coverage** - Comprehensive unit test coverage
- **Critical Path Testing** - 100% coverage of core workflows
- **Integration Testing** - All external service interactions
- **Error Path Testing** - Complete error handling validation
- **Performance Benchmarks** - Response time and throughput testing

## Deployment Architecture

### Environment Support

1. **Development** - Local CLI with live reload and debugging
2. **Staging** - Containerized deployment with test data
3. **Production** - Kubernetes deployment with monitoring
4. **CI/CD Integration** - Automated testing and deployment

### Monitoring and Observability

1. **Application Metrics** - Performance, success rates, error rates
2. **System Metrics** - CPU, memory, disk, network utilization
3. **Business Metrics** - Task completion rates, user satisfaction
4. **Log Aggregation** - Centralized logging with search and analysis
5. **Alert Management** - Proactive issue detection and notification

---

*This architecture documentation reflects the current implementation and design decisions. For specific implementation details, refer to the source code and inline documentation.*