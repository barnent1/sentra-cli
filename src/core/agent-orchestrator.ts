/**
 * Agent Orchestrator - Manages persona routing and task distribution
 */

import { EventEmitter } from 'events';
import { 
  Agent, 
  Task, 
  PersonaType, 
  AgentStatus, 
  TaskStatus,
  SentraError,
  AgentEvent,
  TaskEvent 
} from '../types/index.js';
import { agentLogger } from '../utils/logger.js';
import { ContextManager } from './context-manager.js';
import { TaskExecutor } from './task-executor.js';

// Import all agent implementations
import { RequirementsAnalyst } from '../agents/requirements-analyst.js';
import { UIUXDesigner } from '../agents/ui-ux-designer.js';
import { FrontendDeveloper } from '../agents/frontend-developer.js';
import { BackendArchitect } from '../agents/backend-architect.js';
import { QAEngineer } from '../agents/qa-engineer.js';
import { SecurityAnalyst } from '../agents/security-analyst.js';
import { TechnicalWriter } from '../agents/technical-writer.js';
import { DevOpsEngineer } from '../agents/devops-engineer.js';

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<PersonaType, Agent> = new Map();
  private activeAgents: Set<PersonaType> = new Set();
  private contextManager: ContextManager;
  private taskExecutor: TaskExecutor;
  private taskQueue: Task[] = [];
  private isRunning: boolean = false;

  constructor(contextManager: ContextManager, taskExecutor: TaskExecutor) {
    super();
    this.contextManager = contextManager;
    this.taskExecutor = taskExecutor;
    this.initializeAgents();
  }

  /**
   * Initialize all 8 specialized AI personas
   */
  private initializeAgents(): void {
    const agentConfigs: Array<{ persona: PersonaType; instance: any }> = [
      { persona: 'requirements-analyst', instance: new RequirementsAnalyst() },
      { persona: 'ui-ux-designer', instance: new UIUXDesigner() },
      { persona: 'frontend-developer', instance: new FrontendDeveloper() },
      { persona: 'backend-architect', instance: new BackendArchitect() },
      { persona: 'qa-engineer', instance: new QAEngineer() },
      { persona: 'security-analyst', instance: new SecurityAnalyst() },
      { persona: 'technical-writer', instance: new TechnicalWriter() },
      { persona: 'devops-engineer', instance: new DevOpsEngineer() }
    ];

    for (const { persona, instance } of agentConfigs) {
      const agent: Agent = {
        id: `agent-${persona}-${Date.now()}`,
        name: this.getAgentDisplayName(persona),
        persona,
        specializations: instance.getSpecializations(),
        contextLimit: this.getPersonaContextLimit(persona),
        status: 'idle',
        contextUsage: 0
      };

      this.agents.set(persona, agent);
      agentLogger.info(`Initialized agent: ${agent.name}`, { 
        persona, 
        specializations: agent.specializations 
      });
    }
  }

  /**
   * Start the orchestration system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new SentraError('Agent orchestrator is already running', 'ORCHESTRATOR_ALREADY_RUNNING');
    }

    this.isRunning = true;
    agentLogger.info('Agent orchestrator started');

    // Start processing task queue
    this.processTaskQueue();

    // Emit system start event
    this.emit('orchestrator.started', {
      timestamp: new Date(),
      agentCount: this.agents.size
    });
  }

  /**
   * Stop the orchestration system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop all active agents
    for (const persona of this.activeAgents) {
      await this.stopAgent(persona);
    }

    agentLogger.info('Agent orchestrator stopped');
    this.emit('orchestrator.stopped', { timestamp: new Date() });
  }

  /**
   * Add task to the execution queue
   */
  async assignTask(task: Task): Promise<void> {
    // Validate task
    if (!task.id || !task.title) {
      throw new SentraError('Invalid task: missing required fields', 'INVALID_TASK');
    }

    // Auto-assign agent if not specified
    if (!task.assignedAgent) {
      task.assignedAgent = await this.selectOptimalAgent(task);
    }

    // Check context requirements
    const agent = this.agents.get(task.assignedAgent);
    if (!agent) {
      throw new SentraError(`Agent not found: ${task.assignedAgent}`, 'AGENT_NOT_FOUND');
    }

    if (task.contextRequirement > agent.contextLimit) {
      throw new SentraError(
        `Task context requirement (${task.contextRequirement}%) exceeds agent limit (${agent.contextLimit}%)`,
        'CONTEXT_LIMIT_EXCEEDED'
      );
    }

    // Add to queue
    this.taskQueue.push(task);
    
    agentLogger.info(`Task assigned to queue`, {
      taskId: task.id,
      assignedAgent: task.assignedAgent,
      priority: task.priority,
      contextRequirement: task.contextRequirement
    });

    // Emit task assignment event
    const taskEvent: TaskEvent = {
      type: 'task.created',
      timestamp: new Date(),
      data: {
        taskId: task.id,
        agent: task.assignedAgent,
        details: {
          title: task.title,
          priority: task.priority
        }
      }
    };

    this.emit('task.assigned', taskEvent);
  }

  /**
   * Process the task queue
   */
  private async processTaskQueue(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Sort tasks by priority and dependencies
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Execute tasks
    while (this.taskQueue.length > 0 && this.isRunning) {
      const task = this.taskQueue.shift();
      if (!task) continue;

      try {
        await this.executeTask(task);
      } catch (error) {
        agentLogger.error(`Task execution failed: ${task.id}`, { 
          error: error instanceof Error ? error.message : error 
        });
        
        // Emit task failure event
        const taskEvent: TaskEvent = {
          type: 'task.failed',
          timestamp: new Date(),
          data: {
            taskId: task.id,
            agent: task.assignedAgent,
            details: { error }
          }
        };
        
        this.emit('task.failed', taskEvent);
      }

      // Brief pause between tasks
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Schedule next queue processing
    if (this.isRunning) {
      setTimeout(() => this.processTaskQueue(), 5000);
    }
  }

  /**
   * Execute a specific task
   */
  private async executeTask(task: Task): Promise<void> {
    if (!task.assignedAgent) {
      throw new SentraError('Task has no assigned agent', 'NO_ASSIGNED_AGENT');
    }

    const agent = this.agents.get(task.assignedAgent);
    if (!agent) {
      throw new SentraError(`Agent not found: ${task.assignedAgent}`, 'AGENT_NOT_FOUND');
    }

    // Check if agent is available
    if (agent.status !== 'idle') {
      // Re-queue task for later
      this.taskQueue.push(task);
      return;
    }

    // Start task execution
    await this.startAgent(task.assignedAgent, task);

    try {
      // Execute task using TaskExecutor
      const result = await this.taskExecutor.execute(task, agent);
      
      // Update task status
      task.status = 'completed';
      task.completedAt = new Date();

      agentLogger.info(`Task completed successfully`, {
        taskId: task.id,
        agent: task.assignedAgent,
        duration: task.completedAt.getTime() - task.createdAt.getTime()
      });

      // Emit completion event
      const taskEvent: TaskEvent = {
        type: 'task.completed',
        timestamp: new Date(),
        data: {
          taskId: task.id,
          agent: task.assignedAgent,
          details: result
        }
      };

      this.emit('task.completed', taskEvent);

    } catch (error) {
      // Handle task failure
      task.status = 'failed';
      
      throw error;
    } finally {
      // Stop agent
      await this.stopAgent(task.assignedAgent);
    }
  }

  /**
   * Select optimal agent for a task
   */
  private async selectOptimalAgent(task: Task): Promise<PersonaType> {
    // Analyze task content to determine best agent
    const taskAnalysis = await this.analyzeTaskRequirements(task);
    
    // Score each agent based on specializations and availability
    const agentScores: Array<{ persona: PersonaType; score: number }> = [];
    
    for (const [persona, agent] of this.agents) {
      let score = 0;
      
      // Specialization match score
      for (const specialization of agent.specializations) {
        if (taskAnalysis.keywords.includes(specialization)) {
          score += 10;
        }
      }
      
      // Context availability score
      if (agent.contextUsage < agent.contextLimit * 0.8) {
        score += 5;
      }
      
      // Agent availability score
      if (agent.status === 'idle') {
        score += 8;
      } else if (agent.status === 'working') {
        score -= 5;
      }
      
      agentScores.push({ persona, score });
    }
    
    // Sort by score and return best match
    agentScores.sort((a, b) => b.score - a.score);
    
    const selectedAgent = agentScores[0];
    
    agentLogger.info(`Selected optimal agent for task`, {
      taskId: task.id,
      selectedAgent: selectedAgent.persona,
      score: selectedAgent.score,
      alternatives: agentScores.slice(1, 3)
    });
    
    return selectedAgent.persona;
  }

  /**
   * Analyze task requirements to extract keywords and context
   */
  private async analyzeTaskRequirements(task: Task): Promise<{ keywords: string[]; complexity: number }> {
    const text = `${task.title} ${task.description} ${task.acceptanceCriteria.join(' ')}`.toLowerCase();
    
    // Define keyword patterns for each specialization
    const specializationKeywords: Record<string, string[]> = {
      'stakeholder-analysis': ['stakeholder', 'user', 'business', 'requirement', 'analysis'],
      'user-story-creation': ['story', 'epic', 'feature', 'user', 'need'],
      'user-experience-design': ['ux', 'user experience', 'wireframe', 'prototype', 'design'],
      'interface-design': ['ui', 'interface', 'component', 'layout', 'design'],
      'react-development': ['react', 'component', 'jsx', 'hook', 'state'],
      'typescript': ['typescript', 'type', 'interface', 'generic'],
      'api-design': ['api', 'endpoint', 'rest', 'graphql', 'service'],
      'database-architecture': ['database', 'sql', 'schema', 'migration', 'query'],
      'test-automation': ['test', 'testing', 'automation', 'spec', 'coverage'],
      'security-auditing': ['security', 'auth', 'encrypt', 'vulnerability', 'audit'],
      'documentation': ['docs', 'documentation', 'readme', 'guide', 'manual'],
      'ci-cd-pipelines': ['ci', 'cd', 'pipeline', 'deploy', 'build']
    };
    
    const keywords: string[] = [];
    let complexity = 1;
    
    // Extract matching keywords
    for (const [specialization, patterns] of Object.entries(specializationKeywords)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          keywords.push(specialization);
          complexity += 0.5;
          break;
        }
      }
    }
    
    // Calculate complexity based on text length and keyword density
    complexity += Math.min(text.length / 1000, 3);
    
    return { keywords, complexity: Math.round(complexity) };
  }

  /**
   * Start an agent for task execution
   */
  private async startAgent(persona: PersonaType, task: Task): Promise<void> {
    const agent = this.agents.get(persona);
    if (!agent) {
      throw new SentraError(`Agent not found: ${persona}`, 'AGENT_NOT_FOUND');
    }

    // Update agent status
    agent.status = 'working';
    agent.currentTask = task;
    
    // Add to active agents
    this.activeAgents.add(persona);

    // Update context usage
    agent.contextUsage = await this.contextManager.calculateUsage(persona);

    agentLogger.info(`Agent started`, {
      persona,
      taskId: task.id,
      contextUsage: agent.contextUsage
    });

    // Emit agent status change event
    const agentEvent: AgentEvent = {
      type: 'agent.status.changed',
      timestamp: new Date(),
      data: {
        agentId: agent.id,
        agent: persona,
        previous: 'idle',
        current: 'working'
      }
    };

    this.emit('agent.status.changed', agentEvent);
  }

  /**
   * Stop an agent after task completion
   */
  private async stopAgent(persona: PersonaType): Promise<void> {
    const agent = this.agents.get(persona);
    if (!agent) {
      return;
    }

    // Update agent status
    const previousStatus = agent.status;
    agent.status = 'idle';
    agent.currentTask = undefined;
    
    // Remove from active agents
    this.activeAgents.delete(persona);

    // Clean up context
    await this.contextManager.cleanup(persona);
    agent.contextUsage = 0;

    agentLogger.info(`Agent stopped`, {
      persona,
      previousStatus,
      contextUsage: agent.contextUsage
    });

    // Emit agent status change event
    const agentEvent: AgentEvent = {
      type: 'agent.status.changed',
      timestamp: new Date(),
      data: {
        agentId: agent.id,
        agent: persona,
        previous: previousStatus,
        current: 'idle'
      }
    };

    this.emit('agent.status.changed', agentEvent);
  }

  /**
   * Get current system status
   */
  getStatus(): {
    isRunning: boolean;
    agents: Agent[];
    activeAgents: PersonaType[];
    queuedTasks: number;
    totalContextUsage: number;
  } {
    const agents = Array.from(this.agents.values());
    const totalContextUsage = agents.reduce((sum, agent) => sum + agent.contextUsage, 0) / agents.length;

    return {
      isRunning: this.isRunning,
      agents,
      activeAgents: Array.from(this.activeAgents),
      queuedTasks: this.taskQueue.length,
      totalContextUsage
    };
  }

  /**
   * Get agent by persona type
   */
  getAgent(persona: PersonaType): Agent | undefined {
    return this.agents.get(persona);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Emergency stop all agents
   */
  async emergencyStop(): Promise<void> {
    agentLogger.warn('Emergency stop initiated');
    
    this.isRunning = false;
    this.taskQueue = [];

    // Force stop all agents
    for (const persona of this.activeAgents) {
      const agent = this.agents.get(persona);
      if (agent) {
        agent.status = 'error';
        agent.currentTask = undefined;
      }
    }

    this.activeAgents.clear();
    
    // Clean up all contexts
    await this.contextManager.emergencyCleanup();

    this.emit('orchestrator.emergency.stopped', { timestamp: new Date() });
  }

  /**
   * Helper methods
   */
  private getAgentDisplayName(persona: PersonaType): string {
    const names: Record<PersonaType, string> = {
      'requirements-analyst': 'Requirements Analyst Master',
      'ui-ux-designer': 'UI/UX Designer Master',
      'frontend-developer': 'Frontend Developer Master',
      'backend-architect': 'Backend Architect Master',
      'qa-engineer': 'QA Engineer Master',
      'security-analyst': 'Security Analyst Master',
      'technical-writer': 'Technical Writer Master',
      'devops-engineer': 'DevOps Engineer Master'
    };
    
    return names[persona];
  }

  private getPersonaContextLimit(persona: PersonaType): number {
    const limits: Record<PersonaType, number> = {
      'requirements-analyst': 30,
      'ui-ux-designer': 25,
      'frontend-developer': 35,
      'backend-architect': 35,
      'qa-engineer': 30,
      'security-analyst': 25,
      'technical-writer': 20,
      'devops-engineer': 30
    };

    return limits[persona];
  }
}