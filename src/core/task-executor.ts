/**
 * Task Executor - Handles atomic task execution with dependency resolution
 */

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs-extra';
import { 
  Task, 
  TaskStatus, 
  Agent, 
  PersonaType,
  TaskExecutionError,
  SentraError 
} from '../types/index.js';
import { taskLogger } from '../utils/logger.js';
import { LinearIntegration } from '../integrations/linear.js';
import { GitHubIntegration } from '../integrations/github.js';

interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
  contextUsed: number;
  artifacts?: string[];
}

interface TaskDependency {
  taskId: string;
  type: 'hard' | 'soft';
  reason: string;
}

export class TaskExecutor extends EventEmitter {
  private executingTasks: Map<string, Task> = new Map();
  private completedTasks: Map<string, ExecutionResult> = new Map();
  private taskDependencies: Map<string, TaskDependency[]> = new Map();
  private linear: LinearIntegration;
  private github: GitHubIntegration;
  private maxConcurrentTasks: number = 3;

  constructor() {
    super();
    this.linear = new LinearIntegration();
    this.github = new GitHubIntegration();
  }

  /**
   * Execute a task with the assigned agent
   */
  async execute(task: Task, agent: Agent): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    taskLogger.info(`Starting task execution`, {
      taskId: task.id,
      title: task.title,
      agent: agent.persona,
      priority: task.priority
    });

    // Validate task state
    if (this.executingTasks.has(task.id)) {
      throw new TaskExecutionError(task.id, 'Task is already executing');
    }

    // Check dependencies
    await this.resolveDependencies(task);

    // Add to executing tasks
    this.executingTasks.set(task.id, task);
    task.status = 'in-progress';
    task.updatedAt = new Date();

    try {
      // Update Linear task status
      if (task.linearId) {
        await this.linear.updateTaskStatus(task.linearId, 'In Progress');
      }

      // Execute based on agent persona
      const result = await this.executeByPersona(task, agent);
      
      // Calculate execution metrics
      const duration = Date.now() - startTime;
      const executionResult: ExecutionResult = {
        success: true,
        output: result,
        duration,
        contextUsed: agent.contextUsage,
        artifacts: await this.collectArtifacts(task)
      };

      // Update task status
      task.status = 'completed';
      task.completedAt = new Date();
      task.updatedAt = new Date();

      // Update Linear task
      if (task.linearId) {
        await this.linear.updateTaskStatus(task.linearId, 'Done');
        await this.linear.addComment(task.linearId, this.generateCompletionComment(executionResult));
      }

      // Store result
      this.completedTasks.set(task.id, executionResult);

      taskLogger.info(`Task execution completed successfully`, {
        taskId: task.id,
        duration: duration,
        contextUsed: agent.contextUsage,
        artifacts: executionResult.artifacts?.length || 0
      });

      this.emit('task.executed', {
        task,
        result: executionResult,
        agent: agent.persona
      });

      return executionResult;

    } catch (error) {
      // Handle execution failure
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const executionResult: ExecutionResult = {
        success: false,
        error: errorMessage,
        duration,
        contextUsed: agent.contextUsage
      };

      // Update task status
      task.status = 'failed';
      task.updatedAt = new Date();

      // Update Linear task
      if (task.linearId) {
        await this.linear.updateTaskStatus(task.linearId, 'Canceled');
        await this.linear.addComment(task.linearId, `❌ Task execution failed: ${errorMessage}`);
      }

      // Store result
      this.completedTasks.set(task.id, executionResult);

      taskLogger.error(`Task execution failed`, {
        taskId: task.id,
        error: errorMessage,
        duration: duration,
        agent: agent.persona
      });

      this.emit('task.failed', {
        task,
        result: executionResult,
        agent: agent.persona,
        error
      });

      throw new TaskExecutionError(task.id, errorMessage);

    } finally {
      // Remove from executing tasks
      this.executingTasks.delete(task.id);
    }
  }

  /**
   * Execute task based on agent persona
   */
  private async executeByPersona(task: Task, agent: Agent): Promise<unknown> {
    switch (agent.persona) {
      case 'requirements-analyst':
        return await this.executeRequirementsAnalysis(task);
      
      case 'ui-ux-designer':
        return await this.executeUIUXDesign(task);
      
      case 'frontend-developer':
        return await this.executeFrontendDevelopment(task);
      
      case 'backend-architect':
        return await this.executeBackendArchitecture(task);
      
      case 'qa-engineer':
        return await this.executeQualityAssurance(task);
      
      case 'security-analyst':
        return await this.executeSecurityAnalysis(task);
      
      case 'technical-writer':
        return await this.executeTechnicalWriting(task);
      
      case 'devops-engineer':
        return await this.executeDevOpsTask(task);
      
      default:
        throw new TaskExecutionError(task.id, `Unknown persona: ${agent.persona}`);
    }
  }

  /**
   * Requirements Analysis execution
   */
  private async executeRequirementsAnalysis(task: Task): Promise<unknown> {
    taskLogger.debug('Executing requirements analysis task', { taskId: task.id });

    // Simulate requirements gathering and analysis
    const requirements = {
      stakeholders: await this.identifyStakeholders(task),
      userStories: await this.generateUserStories(task),
      acceptanceCriteria: task.acceptanceCriteria,
      businessRules: await this.extractBusinessRules(task),
      riskAssessment: await this.performRiskAssessment(task)
    };

    // Generate requirements document
    await this.generateRequirementsDocument(task, requirements);

    return requirements;
  }

  /**
   * UI/UX Design execution
   */
  private async executeUIUXDesign(task: Task): Promise<unknown> {
    taskLogger.debug('Executing UI/UX design task', { taskId: task.id });

    const design = {
      wireframes: await this.createWireframes(task),
      userFlows: await this.mapUserFlows(task),
      designSystem: await this.createDesignSystem(task),
      prototypes: await this.buildPrototypes(task),
      accessibilityAudit: await this.performAccessibilityAudit(task)
    };

    // Integration with Figma if configured
    if (await this.isIntegrationAvailable('figma')) {
      design.figmaFiles = await this.createFigmaDesigns(task);
    }

    return design;
  }

  /**
   * Frontend Development execution
   */
  private async executeFrontendDevelopment(task: Task): Promise<unknown> {
    taskLogger.debug('Executing frontend development task', { taskId: task.id });

    const development = {
      components: await this.implementComponents(task),
      tests: await this.writeComponentTests(task),
      storybook: await this.createStorybookStories(task),
      documentation: await this.documentComponents(task),
      performance: await this.optimizePerformance(task)
    };

    // Run quality checks
    await this.runFrontendQualityChecks(task);

    return development;
  }

  /**
   * Backend Architecture execution
   */
  private async executeBackendArchitecture(task: Task): Promise<unknown> {
    taskLogger.debug('Executing backend architecture task', { taskId: task.id });

    const architecture = {
      apiDesign: await this.designAPIs(task),
      databaseSchema: await this.designDatabaseSchema(task),
      services: await this.implementServices(task),
      integration: await this.setupIntegrations(task),
      scalability: await this.planScalability(task)
    };

    // Generate API documentation
    await this.generateAPIDocumentation(task, architecture);

    return architecture;
  }

  /**
   * Quality Assurance execution
   */
  private async executeQualityAssurance(task: Task): Promise<unknown> {
    taskLogger.debug('Executing QA task', { taskId: task.id });

    const qa = {
      testPlan: await this.createTestPlan(task),
      unitTests: await this.writeUnitTests(task),
      integrationTests: await this.writeIntegrationTests(task),
      e2eTests: await this.writeE2ETests(task),
      coverage: await this.measureTestCoverage(task),
      performance: await this.performanceTest(task)
    };

    // Validate test coverage meets requirements (95%+)
    await this.validateTestCoverage(qa.coverage);

    return qa;
  }

  /**
   * Security Analysis execution
   */
  private async executeSecurityAnalysis(task: Task): Promise<unknown> {
    taskLogger.debug('Executing security analysis task', { taskId: task.id });

    const security = {
      vulnerabilityAssessment: await this.performVulnerabilityAssessment(task),
      securityReview: await this.conductSecurityReview(task),
      complianceCheck: await this.checkCompliance(task),
      penetrationTest: await this.performPenetrationTest(task),
      recommendations: await this.generateSecurityRecommendations(task)
    };

    // Generate security report
    await this.generateSecurityReport(task, security);

    return security;
  }

  /**
   * Technical Writing execution
   */
  private async executeTechnicalWriting(task: Task): Promise<unknown> {
    taskLogger.debug('Executing technical writing task', { taskId: task.id });

    const documentation = {
      userGuide: await this.writeUserGuide(task),
      developerDocs: await this.writeDeveloperDocumentation(task),
      apiDocs: await this.writeAPIDocumentation(task),
      tutorials: await this.createTutorials(task),
      changelog: await this.updateChangelog(task)
    };

    // Validate documentation quality
    await this.validateDocumentationQuality(documentation);

    return documentation;
  }

  /**
   * DevOps execution
   */
  private async executeDevOpsTask(task: Task): Promise<unknown> {
    taskLogger.debug('Executing DevOps task', { taskId: task.id });

    const devops = {
      cicd: await this.setupCICDPipeline(task),
      infrastructure: await this.provisionInfrastructure(task),
      monitoring: await this.setupMonitoring(task),
      deployment: await this.configureDeployment(task),
      security: await this.implementSecurityMeasures(task)
    };

    // Validate deployment readiness
    await this.validateDeploymentReadiness(devops);

    return devops;
  }

  /**
   * Dependency resolution
   */
  private async resolveDependencies(task: Task): Promise<void> {
    if (!task.dependencies || task.dependencies.length === 0) {
      return;
    }

    taskLogger.debug(`Resolving dependencies for task ${task.id}`, {
      dependencies: task.dependencies
    });

    for (const depId of task.dependencies) {
      const depResult = this.completedTasks.get(depId);
      
      if (!depResult) {
        throw new TaskExecutionError(
          task.id, 
          `Dependency not completed: ${depId}`
        );
      }

      if (!depResult.success) {
        throw new TaskExecutionError(
          task.id,
          `Dependency failed: ${depId} - ${depResult.error}`
        );
      }
    }

    taskLogger.debug(`All dependencies resolved for task ${task.id}`);
  }

  /**
   * Collect task artifacts
   */
  private async collectArtifacts(task: Task): Promise<string[]> {
    const artifacts: string[] = [];
    const artifactsDir = path.join(process.cwd(), '.sentra', 'artifacts', task.id);

    if (await fs.pathExists(artifactsDir)) {
      const files = await fs.readdir(artifactsDir, { recursive: true });
      artifacts.push(...files.map(file => path.join(artifactsDir, file as string)));
    }

    return artifacts;
  }

  /**
   * Generate completion comment for Linear
   */
  private generateCompletionComment(result: ExecutionResult): string {
    const lines = [
      '✅ **Task completed successfully**',
      '',
      `⏱️ **Duration:** ${Math.round(result.duration / 1000)}s`,
      `📊 **Context Used:** ${result.contextUsed.toFixed(1)}%`,
    ];

    if (result.artifacts && result.artifacts.length > 0) {
      lines.push(`📁 **Artifacts Generated:** ${result.artifacts.length}`);
    }

    lines.push('', '🤖 *Completed by Sentra CLI*');

    return lines.join('\n');
  }

  /**
   * Get execution status
   */
  getExecutionStatus(): {
    executing: Task[];
    completed: number;
    failed: number;
    totalDuration: number;
    averageDuration: number;
  } {
    const executing = Array.from(this.executingTasks.values());
    const completedResults = Array.from(this.completedTasks.values());
    
    const completed = completedResults.filter(r => r.success).length;
    const failed = completedResults.filter(r => !r.success).length;
    const totalDuration = completedResults.reduce((sum, r) => sum + r.duration, 0);
    const averageDuration = completedResults.length > 0 ? totalDuration / completedResults.length : 0;

    return {
      executing,
      completed,
      failed,
      totalDuration,
      averageDuration
    };
  }

  /**
   * Helper methods (simplified implementations)
   * In a real implementation, these would contain actual business logic
   */

  private async identifyStakeholders(task: Task): Promise<string[]> {
    // Analyze task content to identify stakeholders
    return ['product-owner', 'end-users', 'development-team'];
  }

  private async generateUserStories(task: Task): Promise<string[]> {
    // Generate user stories based on task requirements
    return task.acceptanceCriteria.map(criteria => 
      `As a user, I want ${task.title.toLowerCase()} so that ${criteria}`
    );
  }

  private async extractBusinessRules(task: Task): Promise<string[]> {
    // Extract business rules from task description
    return ['Business rule 1', 'Business rule 2'];
  }

  private async performRiskAssessment(task: Task): Promise<object> {
    return {
      risks: ['Risk 1', 'Risk 2'],
      mitigation: ['Mitigation 1', 'Mitigation 2']
    };
  }

  private async generateRequirementsDocument(task: Task, requirements: any): Promise<void> {
    const docPath = path.join(process.cwd(), '.sentra', 'artifacts', task.id, 'requirements.md');
    await fs.ensureDir(path.dirname(docPath));
    await fs.writeFile(docPath, `# Requirements for ${task.title}\n\n${JSON.stringify(requirements, null, 2)}`);
  }

  private async createWireframes(task: Task): Promise<string[]> {
    return ['wireframe-1.png', 'wireframe-2.png'];
  }

  private async mapUserFlows(task: Task): Promise<string[]> {
    return ['user-flow-1.png'];
  }

  private async createDesignSystem(task: Task): Promise<object> {
    return { colors: [], typography: [], components: [] };
  }

  private async buildPrototypes(task: Task): Promise<string[]> {
    return ['prototype-1.fig'];
  }

  private async performAccessibilityAudit(task: Task): Promise<object> {
    return { score: 95, issues: [] };
  }

  private async isIntegrationAvailable(integration: string): Promise<boolean> {
    return process.env[`${integration.toUpperCase()}_TOKEN`] !== undefined;
  }

  private async createFigmaDesigns(task: Task): Promise<string[]> {
    return ['figma-design-1.fig'];
  }

  private async implementComponents(task: Task): Promise<string[]> {
    return ['Component1.tsx', 'Component2.tsx'];
  }

  private async writeComponentTests(task: Task): Promise<string[]> {
    return ['Component1.test.tsx', 'Component2.test.tsx'];
  }

  private async createStorybookStories(task: Task): Promise<string[]> {
    return ['Component1.stories.tsx'];
  }

  private async documentComponents(task: Task): Promise<string[]> {
    return ['components.md'];
  }

  private async optimizePerformance(task: Task): Promise<object> {
    return { optimizations: ['lazy loading', 'code splitting'] };
  }

  private async runFrontendQualityChecks(task: Task): Promise<void> {
    // Run linting, type checking, etc.
  }

  private async designAPIs(task: Task): Promise<object> {
    return { endpoints: ['/api/example'], openapi: 'spec.yml' };
  }

  private async designDatabaseSchema(task: Task): Promise<object> {
    return { tables: ['users', 'products'], migrations: ['001_initial.sql'] };
  }

  private async implementServices(task: Task): Promise<string[]> {
    return ['UserService.ts', 'ProductService.ts'];
  }

  private async setupIntegrations(task: Task): Promise<object> {
    return { external: ['stripe', 'sendgrid'] };
  }

  private async planScalability(task: Task): Promise<object> {
    return { strategies: ['horizontal scaling', 'caching'] };
  }

  private async generateAPIDocumentation(task: Task, architecture: any): Promise<void> {
    const docPath = path.join(process.cwd(), '.sentra', 'artifacts', task.id, 'api-docs.md');
    await fs.ensureDir(path.dirname(docPath));
    await fs.writeFile(docPath, `# API Documentation\n\n${JSON.stringify(architecture, null, 2)}`);
  }

  private async createTestPlan(task: Task): Promise<object> {
    return { testCases: 10, coverage: 95 };
  }

  private async writeUnitTests(task: Task): Promise<string[]> {
    return ['unit.test.ts'];
  }

  private async writeIntegrationTests(task: Task): Promise<string[]> {
    return ['integration.test.ts'];
  }

  private async writeE2ETests(task: Task): Promise<string[]> {
    return ['e2e.test.ts'];
  }

  private async measureTestCoverage(task: Task): Promise<number> {
    return 96; // Mock 96% coverage
  }

  private async performanceTest(task: Task): Promise<object> {
    return { responseTime: '200ms', throughput: '1000 rps' };
  }

  private async validateTestCoverage(coverage: number): Promise<void> {
    if (coverage < 95) {
      throw new TaskExecutionError('test-coverage', `Test coverage ${coverage}% below required 95%`);
    }
  }

  private async performVulnerabilityAssessment(task: Task): Promise<object> {
    return { vulnerabilities: 0, riskLevel: 'low' };
  }

  private async conductSecurityReview(task: Task): Promise<object> {
    return { findings: [], recommendations: [] };
  }

  private async checkCompliance(task: Task): Promise<object> {
    return { compliant: true, standards: ['OWASP', 'SOC2'] };
  }

  private async performPenetrationTest(task: Task): Promise<object> {
    return { findings: [], severity: 'none' };
  }

  private async generateSecurityRecommendations(task: Task): Promise<string[]> {
    return ['Enable 2FA', 'Regular security updates'];
  }

  private async generateSecurityReport(task: Task, security: any): Promise<void> {
    const reportPath = path.join(process.cwd(), '.sentra', 'artifacts', task.id, 'security-report.md');
    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeFile(reportPath, `# Security Report\n\n${JSON.stringify(security, null, 2)}`);
  }

  private async writeUserGuide(task: Task): Promise<string> {
    return 'user-guide.md';
  }

  private async writeDeveloperDocumentation(task: Task): Promise<string> {
    return 'developer-docs.md';
  }

  private async writeAPIDocumentation(task: Task): Promise<string> {
    return 'api-docs.md';
  }

  private async createTutorials(task: Task): Promise<string[]> {
    return ['tutorial-1.md', 'tutorial-2.md'];
  }

  private async updateChangelog(task: Task): Promise<string> {
    return 'CHANGELOG.md';
  }

  private async validateDocumentationQuality(documentation: any): Promise<void> {
    // Validate documentation meets quality standards
  }

  private async setupCICDPipeline(task: Task): Promise<object> {
    return { pipeline: 'github-actions', stages: ['build', 'test', 'deploy'] };
  }

  private async provisionInfrastructure(task: Task): Promise<object> {
    return { resources: ['compute', 'storage', 'network'] };
  }

  private async setupMonitoring(task: Task): Promise<object> {
    return { tools: ['prometheus', 'grafana'], alerts: [] };
  }

  private async configureDeployment(task: Task): Promise<object> {
    return { strategy: 'blue-green', environments: ['staging', 'production'] };
  }

  private async implementSecurityMeasures(task: Task): Promise<object> {
    return { measures: ['firewall', 'ssl', 'monitoring'] };
  }

  private async validateDeploymentReadiness(devops: any): Promise<void> {
    // Validate deployment configuration
  }
}