/**
 * Core type definitions for Sentra CLI
 * The intelligent Claude Code command center for autonomous project execution
 */

// Agent System Types
export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly persona: PersonaType;
  readonly specializations: string[];
  readonly contextLimit: number;
  status: AgentStatus;
  currentTask?: Task;
  contextUsage: number;
}

export type PersonaType = 
  | 'requirements-analyst'
  | 'ui-ux-designer'
  | 'frontend-developer'
  | 'backend-architect'
  | 'qa-engineer'
  | 'security-analyst'
  | 'technical-writer'
  | 'devops-engineer';

export type AgentStatus = 'idle' | 'working' | 'blocked' | 'error';

// Task Management Types
export interface Task {
  readonly id: string;
  readonly linearId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignedAgent?: PersonaType;
  dependencies: string[];
  contextRequirement: number;
  acceptanceCriteria: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type TaskStatus = 'pending' | 'in-progress' | 'testing' | 'review' | 'completed' | 'failed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

// Project & Context Types
export interface Project {
  readonly id: string;
  name: string;
  description: string;
  repository: string;
  branch: string;
  context: ProjectContext;
  configuration: ProjectConfiguration;
}

export interface ProjectContext {
  totalUsage: number;
  agentUsage: Record<PersonaType, number>;
  activeContext: ContextItem[];
  limits: ContextLimits;
}

export interface ContextItem {
  type: 'file' | 'interface' | 'dependency' | 'config';
  path: string;
  content?: string;
  size: number;
}

export interface ContextLimits {
  maxPercentage: number;
  warningThreshold: number;
  maxItems: number;
}

// Permission System Types
export interface PermissionRequest {
  readonly id: string;
  agent: PersonaType;
  command: string;
  context: string;
  riskLevel: RiskLevel;
  timeout: number;
  createdAt: Date;
  status: PermissionStatus;
  response?: PermissionResponse;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PermissionStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface PermissionResponse {
  approved: boolean;
  respondedAt: Date;
  reason?: string;
  respondedBy: string;
}

// Configuration Types
export interface ProjectConfiguration {
  contextLimit: number;
  testCoverageRequirement: number;
  maxRetries: number;
  permissionTimeout: number;
  notifications: NotificationConfig;
  integrations: IntegrationConfig;
}

export interface NotificationConfig {
  channels: NotificationChannel[];
  quietHours: QuietHours;
  priority: Record<Priority, NotificationChannel[]>;
}

export type NotificationChannel = 'sms' | 'push' | 'dashboard' | 'email';

export interface QuietHours {
  start: string;
  end: string;
  timezone: string;
}

// Integration Types
export interface IntegrationConfig {
  linear: LinearConfig;
  github: GitHubConfig;
  figma: FigmaConfig;
  twilio: TwilioConfig;
  pushover?: PushoverConfig;
}

export interface LinearConfig {
  apiKey: string;
  teamId: string;
  workspaceId?: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  defaultBranch: string;
}

export interface FigmaConfig {
  accessToken: string;
  teamId: string;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  notificationNumber: string;
}

export interface PushoverConfig {
  token: string;
  user: string;
}

// CLI Command Types
export interface CLICommand {
  name: string;
  description: string;
  options: CLIOption[];
  action: (args: CLIArgs) => Promise<void>;
}

export interface CLIOption {
  flags: string;
  description: string;
  defaultValue?: unknown;
}

export interface CLIArgs {
  [key: string]: unknown;
}

// Dashboard Types
export interface DashboardData {
  agents: Agent[];
  tasks: Task[];
  project: Project;
  permissions: PermissionRequest[];
  metrics: SystemMetrics;
}

export interface SystemMetrics {
  tasksCompleted: number;
  averageCompletionTime: number;
  successRate: number;
  contextEfficiency: number;
  agentUtilization: Record<PersonaType, number>;
}

// Event Types
export interface SentraEvent {
  type: string;
  timestamp: Date;
  data: unknown;
}

export interface TaskEvent extends SentraEvent {
  type: 'task.created' | 'task.started' | 'task.completed' | 'task.failed';
  data: {
    taskId: string;
    agent?: PersonaType;
    details?: unknown;
  };
}

export interface AgentEvent extends SentraEvent {
  type: 'agent.status.changed' | 'agent.context.updated' | 'agent.error';
  data: {
    agentId: string;
    agent: PersonaType;
    previous?: unknown;
    current: unknown;
  };
}

export interface PermissionEvent extends SentraEvent {
  type: 'permission.requested' | 'permission.approved' | 'permission.denied';
  data: {
    permissionId: string;
    agent: PersonaType;
    riskLevel: RiskLevel;
  };
}

// Error Types
export class SentraError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: unknown
  ) {
    super(message);
    this.name = 'SentraError';
  }
}

export class ContextOverflowError extends SentraError {
  constructor(usage: number, limit: number) {
    super(
      `Context usage ${usage}% exceeds limit of ${limit}%`,
      'CONTEXT_OVERFLOW',
      { usage, limit }
    );
  }
}

export class PermissionDeniedError extends SentraError {
  constructor(command: string, reason?: string) {
    super(
      `Permission denied for command: ${command}`,
      'PERMISSION_DENIED',
      { command, reason }
    );
  }
}

export class TaskExecutionError extends SentraError {
  constructor(taskId: string, details: string) {
    super(
      `Task execution failed: ${taskId}`,
      'TASK_EXECUTION_FAILED',
      { taskId, details }
    );
  }
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;