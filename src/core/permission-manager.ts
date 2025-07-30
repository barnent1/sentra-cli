/**
 * Permission Manager - Interactive approval system with risk assessment
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { 
  PermissionRequest, 
  PermissionResponse, 
  PermissionStatus, 
  RiskLevel, 
  PersonaType,
  PermissionDeniedError,
  SentraError,
  PermissionEvent 
} from '../types/index.js';
import { permissionLogger } from '../utils/logger.js';
import { TwilioIntegration } from '../integrations/twilio.js';
import { PushoverIntegration } from '../integrations/pushover.js';

interface RiskAssessment {
  level: RiskLevel;
  factors: string[];
  score: number;
  recommendation: string;
}

interface PermissionRule {
  pattern: RegExp;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  timeout: number;
  reason: string;
}

export class PermissionManager extends EventEmitter {
  private pendingRequests: Map<string, PermissionRequest> = new Map();
  private permissionHistory: Map<string, PermissionResponse> = new Map();
  private permissionRules: PermissionRule[] = [];
  private twilio: TwilioIntegration;
  private pushover: PushoverIntegration;
  private defaultTimeout: number = 300000; // 5 minutes
  private permissionsDir: string;

  constructor(projectRoot: string = process.cwd()) {
    super();
    this.permissionsDir = path.join(projectRoot, '.sentra', 'permissions');
    this.twilio = new TwilioIntegration();
    this.pushover = new PushoverIntegration();
    
    this.initializePermissionRules();
    this.ensurePermissionsDirectory();
  }

  /**
   * Initialize permission rules for different types of operations
   */
  private initializePermissionRules(): void {
    this.permissionRules = [
      // File system operations
      {
        pattern: /rm\s+-rf|rmdir|delete.*\.git|format.*disk/i,
        riskLevel: 'critical',
        requiresApproval: true,
        timeout: 600000, // 10 minutes for critical operations
        reason: 'Destructive file system operation'
      },
      {
        pattern: /chmod\s+777|chown.*root|sudo.*rm/i,
        riskLevel: 'high',
        requiresApproval: true,
        timeout: 300000,
        reason: 'Elevated permissions required'
      },
      {
        pattern: /npm\s+install.*-g|yarn.*global|pip.*install.*--user/i,
        riskLevel: 'medium',
        requiresApproval: true,
        timeout: 180000,
        reason: 'Global package installation'
      },

      // Database operations
      {
        pattern: /drop\s+(database|table|schema)|truncate.*table|delete.*from.*where.*1=1/i,
        riskLevel: 'critical',
        requiresApproval: true,
        timeout: 600000,
        reason: 'Destructive database operation'
      },
      {
        pattern: /alter\s+(table|database)|create.*index|grant.*all/i,
        riskLevel: 'high',
        requiresApproval: true,
        timeout: 300000,
        reason: 'Database schema modification'
      },

      // Network operations
      {
        pattern: /curl.*\|\s*sh|wget.*\|\s*bash|ssh.*root@/i,
        riskLevel: 'critical',
        requiresApproval: true,
        timeout: 600000,
        reason: 'Remote code execution risk'
      },
      {
        pattern: /git.*push.*--force|git.*reset.*--hard.*HEAD/i,
        riskLevel: 'high',
        requiresApproval: true,
        timeout: 300000,
        reason: 'Potentially destructive Git operation'
      },

      // Docker operations
      {
        pattern: /docker.*run.*--privileged|docker.*rm.*-f/i,
        riskLevel: 'high',
        requiresApproval: true,
        timeout: 300000,
        reason: 'Privileged container operation'
      },

      // Environment modifications
      {
        pattern: /export.*PATH=|unset.*PATH|rm.*\.env/i,
        riskLevel: 'medium',
        requiresApproval: true,
        timeout: 180000,
        reason: 'Environment variable modification'
      },

      // Production deployments
      {
        pattern: /deploy.*production|push.*main|merge.*master/i,
        riskLevel: 'high',
        requiresApproval: true,
        timeout: 300000,
        reason: 'Production deployment'
      }
    ];

    permissionLogger.info(`Initialized ${this.permissionRules.length} permission rules`);
  }

  /**
   * Request permission for a potentially risky operation
   */
  async requestPermission(
    agent: PersonaType,
    command: string,
    context: string
  ): Promise<PermissionResponse> {
    // Assess risk level
    const riskAssessment = this.assessRisk(command, context);
    
    // Check if approval is required
    if (!this.requiresApproval(command, riskAssessment.level)) {
      // Auto-approve low-risk operations
      const autoApproval: PermissionResponse = {
        approved: true,
        respondedAt: new Date(),
        respondedBy: 'system',
        reason: 'Auto-approved: low risk operation'
      };

      permissionLogger.info('Operation auto-approved', {
        agent,
        command: command.substring(0, 100),
        riskLevel: riskAssessment.level
      });

      return autoApproval;
    }

    // Create permission request
    const request: PermissionRequest = {
      id: this.generateRequestId(),
      agent,
      command,
      context,
      riskLevel: riskAssessment.level,
      timeout: this.getTimeoutForRisk(riskAssessment.level),
      createdAt: new Date(),
      status: 'pending'
    };

    // Store pending request
    this.pendingRequests.set(request.id, request);

    // Persist request
    await this.persistRequest(request);

    permissionLogger.info('Permission request created', {
      requestId: request.id,
      agent,
      riskLevel: riskAssessment.level,
      timeout: request.timeout
    });

    // Send notifications
    await this.sendApprovalNotifications(request, riskAssessment);

    // Set up timeout
    this.setupRequestTimeout(request);

    // Emit permission request event
    const permissionEvent: PermissionEvent = {
      type: 'permission.requested',
      timestamp: new Date(),
      data: {
        permissionId: request.id,
        agent,
        riskLevel: riskAssessment.level
      }
    };

    this.emit('permission.requested', permissionEvent);

    // Wait for response
    return await this.waitForResponse(request.id);
  }

  /**
   * Respond to a permission request
   */
  async respondToRequest(
    requestId: string,
    approved: boolean,
    reason?: string,
    respondedBy: string = 'user'
  ): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new SentraError(`Permission request not found: ${requestId}`, 'REQUEST_NOT_FOUND');
    }

    if (request.status !== 'pending') {
      throw new SentraError(`Permission request already resolved: ${requestId}`, 'REQUEST_ALREADY_RESOLVED');
    }

    // Create response
    const response: PermissionResponse = {
      approved,
      respondedAt: new Date(),
      respondedBy,
      reason
    };

    // Update request
    request.response = response;
    request.status = approved ? 'approved' : 'denied';

    // Store in history
    this.permissionHistory.set(requestId, response);

    // Remove from pending
    this.pendingRequests.delete(requestId);

    // Persist response
    await this.persistResponse(requestId, response);

    permissionLogger.info('Permission request resolved', {
      requestId,
      approved,
      respondedBy,
      reason
    });

    // Emit response event
    const eventType = approved ? 'permission.approved' : 'permission.denied';
    const permissionEvent: PermissionEvent = {
      type: eventType,
      timestamp: new Date(),
      data: {
        permissionId: requestId,
        agent: request.agent,
        riskLevel: request.riskLevel
      }
    };

    this.emit(eventType, permissionEvent);

    // Send confirmation notification
    await this.sendConfirmationNotification(request, response);
  }

  /**
   * Get all pending permission requests
   */
  getPendingRequests(): PermissionRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Get permission history
   */
  getPermissionHistory(limit: number = 100): Array<{
    request: PermissionRequest;
    response: PermissionResponse;
  }> {
    const history: Array<{ request: PermissionRequest; response: PermissionResponse }> = [];
    
    for (const [requestId, response] of this.permissionHistory) {
      const request = this.findRequestInHistory(requestId);
      if (request) {
        history.push({ request, response });
      }
    }

    return history
      .sort((a, b) => b.request.createdAt.getTime() - a.request.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Cancel a pending permission request
   */
  async cancelRequest(requestId: string, reason: string = 'Cancelled by user'): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new SentraError(`Permission request not found: ${requestId}`, 'REQUEST_NOT_FOUND');
    }

    request.status = 'expired';
    request.response = {
      approved: false,
      respondedAt: new Date(),
      respondedBy: 'system',
      reason: reason
    };

    this.pendingRequests.delete(requestId);
    this.permissionHistory.set(requestId, request.response);

    await this.persistResponse(requestId, request.response);

    permissionLogger.info('Permission request cancelled', { requestId, reason });

    this.emit('permission.cancelled', {
      requestId,
      reason,
      timestamp: new Date()
    });
  }

  /**
   * Assess risk level of an operation
   */
  private assessRisk(command: string, context: string): RiskAssessment {
    let score = 0;
    const factors: string[] = [];
    let level: RiskLevel = 'low';

    // Check against permission rules
    for (const rule of this.permissionRules) {
      if (rule.pattern.test(command)) {
        score += this.getRiskScore(rule.riskLevel);
        factors.push(rule.reason);
        
        // Use highest risk level found
        if (this.getRiskScore(rule.riskLevel) > this.getRiskScore(level)) {
          level = rule.riskLevel;
        }
      }
    }

    // Additional contextual factors
    if (context.includes('production') || context.includes('prod')) {
      score += 30;
      factors.push('Production environment');
      level = level === 'low' ? 'medium' : level;
    }

    if (context.includes('database') || context.includes('db')) {
      score += 20;
      factors.push('Database operation');
    }

    if (command.includes('sudo') || command.includes('root')) {
      score += 25;
      factors.push('Elevated privileges');
    }

    // Determine final risk level based on score
    if (score >= 80) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 20) level = 'medium';

    const recommendation = this.generateRiskRecommendation(level, factors);

    return { level, factors, score, recommendation };
  }

  /**
   * Check if operation requires approval
   */
  private requiresApproval(command: string, riskLevel: RiskLevel): boolean {
    // Always require approval for high and critical risk operations
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return true;
    }

    // Check specific rules
    for (const rule of this.permissionRules) {
      if (rule.pattern.test(command)) {
        return rule.requiresApproval;
      }
    }

    // Default: require approval for medium risk, auto-approve low risk
    return riskLevel === 'medium';
  }

  /**
   * Send approval notifications via multiple channels
   */
  private async sendApprovalNotifications(
    request: PermissionRequest,
    riskAssessment: RiskAssessment
  ): Promise<void> {
    const truncatedCommand = request.command.length > 100 
      ? request.command.substring(0, 100) + '...'
      : request.command;

    // SMS notification via Twilio
    if (await this.twilio.isConfigured()) {
      const smsMessage = this.formatSMSNotification(request, truncatedCommand, riskAssessment);
      await this.twilio.sendSMS(smsMessage);
    }

    // Push notification via Pushover
    if (await this.pushover.isConfigured()) {
      const pushMessage = this.formatPushNotification(request, truncatedCommand, riskAssessment);
      await this.pushover.sendNotification(pushMessage);
    }

    // Dashboard notification (always available)
    this.emit('dashboard.notification', {
      type: 'permission-request',
      request,
      riskAssessment,
      timestamp: new Date()
    });

    permissionLogger.info('Approval notifications sent', {
      requestId: request.id,
      channels: ['sms', 'push', 'dashboard'],
      riskLevel: request.riskLevel
    });
  }

  /**
   * Send confirmation notification after response
   */
  private async sendConfirmationNotification(
    request: PermissionRequest,
    response: PermissionResponse
  ): Promise<void> {
    const status = response.approved ? 'APPROVED' : 'DENIED';
    const emoji = response.approved ? '✅' : '❌';

    // SMS confirmation
    if (await this.twilio.isConfigured()) {
      const smsMessage = `${emoji} Sentra Permission ${status}\n\nRequest: ${request.id}\nAgent: ${request.agent}\nReason: ${response.reason || 'No reason provided'}`;
      await this.twilio.sendSMS(smsMessage);
    }

    // Push confirmation
    if (await this.pushover.isConfigured()) {
      await this.pushover.sendNotification({
        title: `Permission ${status}`,
        message: `Request ${request.id} has been ${status.toLowerCase()}`,
        priority: response.approved ? 'normal' : 'high'
      });
    }

    // Dashboard update
    this.emit('dashboard.notification', {
      type: 'permission-response',
      request,
      response,
      timestamp: new Date()
    });
  }

  /**
   * Format SMS notification
   */
  private formatSMSNotification(
    request: PermissionRequest,
    command: string,
    riskAssessment: RiskAssessment
  ): string {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    return [
      `${riskEmoji[request.riskLevel]} SENTRA PERMISSION REQUEST`,
      '',
      `Agent: ${request.agent}`,
      `Risk: ${request.riskLevel.toUpperCase()}`,
      `Command: ${command}`,
      '',
      'Reply with:',
      `APPROVE ${request.id} - to approve`,
      `DENY ${request.id} - to deny`,
      '',
      `Expires in ${Math.round(request.timeout / 60000)} minutes`
    ].join('\n');
  }

  /**
   * Format push notification
   */
  private formatPushNotification(
    request: PermissionRequest,
    command: string,
    riskAssessment: RiskAssessment
  ): {
    title: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'emergency';
  } {
    const priorityMap: Record<RiskLevel, 'low' | 'normal' | 'high' | 'emergency'> = {
      low: 'normal',
      medium: 'normal',
      high: 'high',
      critical: 'emergency'
    };

    return {
      title: `Sentra Permission Request (${request.riskLevel.toUpperCase()})`,
      message: `${request.agent} wants to execute: ${command}`,
      priority: priorityMap[request.riskLevel]
    };
  }

  /**
   * Wait for permission response
   */
  private async waitForResponse(requestId: string): Promise<PermissionResponse> {
    return new Promise((resolve, reject) => {
      const checkResponse = () => {
        const request = this.pendingRequests.get(requestId);
        const response = this.permissionHistory.get(requestId);

        if (response) {
          if (response.approved) {
            resolve(response);
          } else {
            reject(new PermissionDeniedError(
              `Permission denied for request ${requestId}`,
              response.reason
            ));
          }
          return;
        }

        if (request && request.status === 'expired') {
          reject(new PermissionDeniedError(
            `Permission request expired: ${requestId}`,
            'Request timeout'
          ));
          return;
        }

        // Check again in 1 second
        setTimeout(checkResponse, 1000);
      };

      checkResponse();
    });
  }

  /**
   * Set up timeout for permission request
   */
  private setupRequestTimeout(request: PermissionRequest): void {
    setTimeout(async () => {
      if (this.pendingRequests.has(request.id)) {
        await this.cancelRequest(request.id, 'Request timeout');
      }
    }, request.timeout);
  }

  /**
   * Helper methods
   */
  private generateRequestId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private getRiskScore(riskLevel: RiskLevel): number {
    const scores: Record<RiskLevel, number> = {
      low: 10,
      medium: 30,
      high: 60,
      critical: 100
    };
    return scores[riskLevel];
  }

  private getTimeoutForRisk(riskLevel: RiskLevel): number {
    const timeouts: Record<RiskLevel, number> = {
      low: 60000,      // 1 minute
      medium: 180000,  // 3 minutes
      high: 300000,    // 5 minutes
      critical: 600000 // 10 minutes
    };
    return timeouts[riskLevel];
  }

  private generateRiskRecommendation(level: RiskLevel, factors: string[]): string {
    switch (level) {
      case 'critical':
        return 'CRITICAL: This operation could cause significant damage. Carefully review before approval.';
      case 'high':
        return 'HIGH RISK: This operation requires careful consideration and may affect system stability.';
      case 'medium':
        return 'MEDIUM RISK: Standard approval required. Review the operation details.';
      case 'low':
        return 'LOW RISK: Safe operation that can typically be auto-approved.';
      default:
        return 'Review required for this operation.';
    }
  }

  private async ensurePermissionsDirectory(): Promise<void> {
    await fs.ensureDir(this.permissionsDir);
  }

  private async persistRequest(request: PermissionRequest): Promise<void> {
    const requestPath = path.join(this.permissionsDir, `${request.id}.json`);
    await fs.writeJson(requestPath, request, { spaces: 2 });
  }

  private async persistResponse(requestId: string, response: PermissionResponse): Promise<void> {
    const responsePath = path.join(this.permissionsDir, `${requestId}-response.json`);
    await fs.writeJson(responsePath, response, { spaces: 2 });
  }

  private findRequestInHistory(requestId: string): PermissionRequest | undefined {
    // In a real implementation, this would load from persistent storage
    // For now, return undefined as we don't have a full history store
    return undefined;
  }
}