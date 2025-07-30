# Sentra CLI API Reference

> Complete documentation for the Sentra REST API and WebSocket interface

## Overview

The Sentra Dashboard provides both REST API endpoints and WebSocket connections for real-time interaction with the AI orchestration system. All APIs follow RESTful conventions and return JSON responses.

**Base URL:** `http://localhost:3001/api` (configurable via `--port` flag)

**WebSocket URL:** `ws://localhost:3001` (real-time updates)

## Authentication

Currently, Sentra operates as a local development tool without authentication. In production deployments, implement proper authentication mechanisms based on your security requirements.

## REST API Endpoints

### System Health

#### GET `/api/health`

Check the health and status of the Sentra system.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "version": "0.1.0"
}
```

**Status Codes:**
- `200` - System is healthy and operational
- `503` - System is experiencing issues

---

### Dashboard Data

#### GET `/api/dashboard`

Retrieve complete dashboard data including agents, tasks, metrics, and permissions.

**Response:**
```json
{
  "agents": [
    {
      "id": "agent-requirements-analyst-1234567890",
      "name": "Requirements Analyst Master",
      "persona": "requirements-analyst",
      "specializations": ["stakeholder-analysis", "user-story-creation"],
      "contextLimit": 30,
      "status": "idle",
      "contextUsage": 12.5,
      "currentTask": null
    }
  ],
  "tasks": [
    {
      "id": "task-123",
      "linearId": "LIN-456",
      "title": "Implement user authentication",
      "status": "in-progress",
      "priority": "high",
      "assignedAgent": "backend-architect",
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "project": {
    "name": "My Sentra Project",
    "context": {
      "totalUsage": 25.8,
      "agentUsage": {
        "requirements-analyst": 12.5,
        "frontend-developer": 18.2
      }
    }
  },
  "permissions": [
    {
      "id": "perm-789",
      "agent": "devops-engineer",
      "command": "docker run --privileged",
      "riskLevel": "high",
      "status": "pending",
      "createdAt": "2024-01-01T11:30:00.000Z"
    }
  ],
  "metrics": {
    "tasksCompleted": 15,
    "averageCompletionTime": 45000,
    "successRate": 94.2,
    "contextEfficiency": 74.2
  }
}
```

---

### System Metrics

#### GET `/api/metrics`

Get detailed system performance metrics.

**Response:**
```json
{
  "tasksCompleted": 15,
  "averageCompletionTime": 45000,
  "successRate": 94.2,
  "contextEfficiency": 74.2,
  "agentUtilization": {
    "requirements-analyst": 25,
    "ui-ux-designer": 0,
    "frontend-developer": 75,
    "backend-architect": 50,
    "qa-engineer": 100,
    "security-analyst": 0,
    "technical-writer": 25,
    "devops-engineer": 80
  }
}
```

**Metric Definitions:**
- `tasksCompleted` - Total number of successfully completed tasks
- `averageCompletionTime` - Average task completion time in milliseconds
- `successRate` - Percentage of tasks completed successfully
- `contextEfficiency` - Percentage of available context capacity not used (higher is better)
- `agentUtilization` - Current utilization percentage for each persona

---

### Agent Management

#### GET `/api/agents`

List all AI personas and their current status.

**Response:**
```json
[
  {
    "id": "agent-requirements-analyst-1234567890",
    "name": "Requirements Analyst Master",
    "persona": "requirements-analyst",
    "specializations": [
      "stakeholder-analysis",
      "user-story-creation",
      "acceptance-criteria",
      "requirements-validation"
    ],
    "contextLimit": 30,
    "status": "working",
    "contextUsage": 28.5,
    "currentTask": {
      "id": "task-requirements-001",
      "title": "Analyze user authentication requirements",
      "status": "in-progress"
    }
  }
]
```

**Agent Status Values:**
- `idle` - Available for new tasks
- `working` - Currently executing a task
- `blocked` - Waiting for dependencies or approvals
- `error` - Encountered an error during task execution

#### GET `/api/agents/:persona`

Get detailed information about a specific AI persona.

**Parameters:**
- `persona` - The persona identifier (e.g., `requirements-analyst`, `frontend-developer`)

**Response:**
```json
{
  "id": "agent-frontend-developer-1234567890",
  "name": "Frontend Developer Master",
  "persona": "frontend-developer",
  "specializations": [
    "react-development",
    "typescript",
    "responsive-design",
    "state-management",
    "component-architecture"
  ],
  "contextLimit": 35,
  "status": "idle",
  "contextUsage": 0,
  "currentTask": null
}
```

**Status Codes:**
- `200` - Agent found and returned
- `404` - Agent persona not found

---

### Context Management

#### GET `/api/context`

Get current context usage statistics and recommendations.

**Response:**
```json
{
  "totalUsage": 32.8,
  "agentUsage": {
    "requirements-analyst": 28.5,
    "ui-ux-designer": 0,
    "frontend-developer": 35.2,
    "backend-architect": 42.1,
    "qa-engineer": 15.8,
    "security-analyst": 0,
    "technical-writer": 8.3,
    "devops-engineer": 33.7
  },
  "limits": {
    "maxPercentage": 40,
    "warningThreshold": 35,
    "maxItems": 1000
  },
  "recommendations": [
    "High context usage detected for: backend-architect",
    "Consider decomposing tasks or cleaning up unused context"
  ]
}
```

**Context Status Indicators:**
- **Green (0-30%)** - Optimal usage range
- **Yellow (30-35%)** - Approaching warning threshold
- **Orange (35-40%)** - Warning threshold exceeded
- **Red (40%+)** - Critical usage requiring immediate attention

---

### Task Management

#### GET `/api/tasks`

Get current task execution status and history.

**Response:**
```json
{
  "executing": [
    {
      "id": "task-auth-implementation",
      "linearId": "LIN-123",
      "title": "Implement OAuth 2.0 authentication",
      "status": "in-progress",
      "priority": "high",
      "assignedAgent": "backend-architect",
      "contextRequirement": 25,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:30:00.000Z"
    }
  ],
  "completed": 12,
  "failed": 1,
  "totalDuration": 540000,
  "averageDuration": 45000
}
```

---

### Permission Management

#### GET `/api/permissions`

List pending permission requests and recent approval history.

**Response:**
```json
{
  "pending": [
    {
      "id": "perm-docker-privileged",
      "agent": "devops-engineer",
      "command": "docker run --privileged alpine",
      "context": "Setting up containerized test environment",
      "riskLevel": "high",
      "timeout": 300000,
      "createdAt": "2024-01-01T11:45:00.000Z",
      "status": "pending"
    }
  ],
  "history": [
    {
      "request": {
        "id": "perm-npm-install",
        "agent": "frontend-developer",
        "command": "npm install @types/react",
        "riskLevel": "medium"
      },
      "response": {
        "approved": true,
        "respondedAt": "2024-01-01T11:20:00.000Z",
        "respondedBy": "dashboard-user",
        "reason": "Safe type definitions"
      }
    }
  ]
}
```

#### POST `/api/permissions/:requestId/respond`

Respond to a permission request with approval or denial.

**Parameters:**
- `requestId` - The unique identifier of the permission request

**Request Body:**
```json
{
  "approved": true,
  "reason": "Operation is safe for development environment"
}
```

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200` - Permission response recorded successfully
- `400` - Invalid request body or missing required fields
- `404` - Permission request not found
- `409` - Permission request already resolved

---

### Emergency Controls

#### POST `/api/emergency-stop`

Immediately stop all active agents and cancel pending tasks. Use with caution.

**Request Body:** None required

**Response:**
```json
{
  "success": true
}
```

**What happens during emergency stop:**
1. All active agents are immediately halted
2. Pending tasks are cancelled
3. Context is cleaned up across all personas
4. All clients receive emergency stop notification
5. System requires manual restart to resume operations

**Status Codes:**
- `200` - Emergency stop executed successfully
- `500` - Error occurred during emergency stop

---

## WebSocket API

### Connection

Connect to the WebSocket endpoint for real-time updates:

```javascript
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to Sentra dashboard');
});
```

### Events from Server

#### `dashboard-data`
Complete dashboard data update (sent on connection and periodically).

```javascript
socket.on('dashboard-data', (data) => {
  // Same structure as GET /api/dashboard
  console.log('Dashboard updated:', data);
});
```

#### `task-assigned`
Fired when a new task is assigned to an agent.

```javascript
socket.on('task-assigned', (event) => {
  console.log('Task assigned:', {
    taskId: event.data.taskId,
    agent: event.data.agent,
    title: event.data.details.title
  });
});
```

#### `task-completed`
Fired when an agent successfully completes a task.

```javascript
socket.on('task-completed', (event) => {
  console.log('Task completed:', {
    taskId: event.data.taskId,
    agent: event.data.agent,
    duration: event.data.details.duration
  });
});
```

#### `task-failed`
Fired when a task execution fails.

```javascript
socket.on('task-failed', (event) => {
  console.error('Task failed:', {
    taskId: event.data.taskId,
    agent: event.data.agent,
    error: event.data.details.error
  });
});
```

#### `agent-status-changed`
Fired when an agent's status changes.

```javascript
socket.on('agent-status-changed', (event) => {
  console.log('Agent status changed:', {
    agent: event.data.agent,
    from: event.data.previous,
    to: event.data.current
  });
});
```

#### `context-warning`
Fired when an agent's context usage approaches the warning threshold.

```javascript
socket.on('context-warning', (event) => {
  console.warn('Context warning:', {
    persona: event.persona,
    usage: event.usage,
    threshold: event.threshold,
    recommendation: event.recommendation
  });
});
```

#### `context-critical`
Fired when total context usage reaches critical levels.

```javascript
socket.on('context-critical', (event) => {
  console.error('Critical context usage:', {
    totalUsage: event.totalUsage,
    message: event.message
  });
});
```

#### `permission-requested`
Fired when an agent requests permission for a risky operation.

```javascript
socket.on('permission-requested', (event) => {
  console.log('Permission requested:', {
    permissionId: event.data.permissionId,
    agent: event.data.agent,
    riskLevel: event.data.riskLevel
  });
});
```

#### `permission-approved` / `permission-denied`
Fired when permission requests are resolved.

```javascript
socket.on('permission-approved', (event) => {
  console.log('Permission approved:', event.data);
});

socket.on('permission-denied', (event) => {
  console.log('Permission denied:', event.data);
});
```

#### `emergency-stop`
Fired when emergency stop is activated.

```javascript
socket.on('emergency-stop', (event) => {
  console.error('Emergency stop activated:', {
    timestamp: event.timestamp,
    reason: event.reason
  });
});
```

### Events to Server

#### `permission-response`
Send permission approval/denial via WebSocket.

```javascript
socket.emit('permission-response', {
  requestId: 'perm-docker-privileged',
  approved: true,
  reason: 'Safe for development environment'
});
```

#### `emergency-stop`
Trigger emergency stop via WebSocket.

```javascript
socket.emit('emergency-stop');
```

---

## Error Handling

### Standard Error Response

All API endpoints return errors in a consistent format:

```json
{
  "error": "Permission request not found",
  "code": "REQUEST_NOT_FOUND",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "requestId": "req-uuid-here"
}
```

### Common HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource already exists or in conflicting state)
- `500` - Internal Server Error
- `503` - Service Unavailable (system not ready)

### WebSocket Error Events

```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

---

## Rate Limiting

Currently, Sentra does not implement rate limiting for local development use. In production deployments, consider implementing appropriate rate limiting based on your usage patterns.

## API Versioning

The current API is version 1.0 (v1). Future versions will be backwards compatible or provide migration paths. Version information is included in all responses via the `version` field in system health checks.

---

## SDK and Client Libraries

### JavaScript/TypeScript Client

```javascript
import { SentraClient } from '@sentra/client';

const client = new SentraClient({
  baseURL: 'http://localhost:3001',
  enableWebSocket: true
});

// Get dashboard data
const dashboard = await client.getDashboard();

// Listen for real-time updates
client.on('task-completed', (event) => {
  console.log('Task completed:', event);
});

// Respond to permission requests
await client.respondToPermission('perm-123', {
  approved: true,
  reason: 'Safe operation'
});
```

### Python Client

```python
import sentra

client = sentra.Client(base_url='http://localhost:3001')

# Get system metrics
metrics = client.get_metrics()
print(f"Success rate: {metrics['successRate']}%")

# Approve permission request
client.respond_to_permission('perm-123', approved=True, reason='Safe operation')
```

---

*This API reference is automatically generated from the Sentra CLI codebase. For the most up-to-date information, refer to the source code and inline documentation.*