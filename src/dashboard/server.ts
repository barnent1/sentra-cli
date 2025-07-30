/**
 * Dashboard Backend Server - Real-time monitoring with Express + Socket.io
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs-extra';
import { 
  DashboardData, 
  SystemMetrics, 
  Agent, 
  Task, 
  PermissionRequest,
  SentraError 
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AgentOrchestrator } from '../core/agent-orchestrator.js';
import { ContextManager } from '../core/context-manager.js';
import { TaskExecutor } from '../core/task-executor.js';
import { PermissionManager } from '../core/permission-manager.js';

interface DashboardConfig {
  port: number;
  host: string;
  enableCors: boolean;
  staticPath?: string;
}

export class DashboardServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private config: DashboardConfig;
  private orchestrator: AgentOrchestrator;
  private contextManager: ContextManager;
  private taskExecutor: TaskExecutor;
  private permissionManager: PermissionManager;
  private isRunning: boolean = false;
  private connectedClients: Set<string> = new Set();

  constructor(
    config: DashboardConfig,
    orchestrator: AgentOrchestrator,
    contextManager: ContextManager,
    taskExecutor: TaskExecutor,
    permissionManager: PermissionManager
  ) {
    this.config = config;
    this.orchestrator = orchestrator;
    this.contextManager = contextManager;
    this.taskExecutor = taskExecutor;
    this.permissionManager = permissionManager;

    // Initialize Express app
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.enableCors ? "*" : false,
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupEventListeners();
  }

  /**
   * Start the dashboard server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new SentraError('Dashboard server is already running', 'SERVER_ALREADY_RUNNING');
    }

    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        this.isRunning = true;
        logger.info(`Dashboard server started`, {
          host: this.config.host,
          port: this.config.port,
          url: `http://${this.config.host}:${this.config.port}`
        });
        resolve();
      });

      this.server.on('error', (error: Error) => {
        logger.error('Dashboard server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the dashboard server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        logger.info('Dashboard server stopped');
        resolve();
      });
    });
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
    }));

    // CORS middleware
    if (this.config.enableCors) {
      this.app.use(cors());
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static file serving
    if (this.config.staticPath && fs.existsSync(this.config.staticPath)) {
      this.app.use(express.static(this.config.staticPath));
    }

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug(`Dashboard API request: ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  /**
   * Setup REST API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '0.1.0'
      });
    });

    // Get current dashboard data
    this.app.get('/api/dashboard', async (req, res) => {
      try {
        const data = await this.getDashboardData();
        res.json(data);
      } catch (error) {
        logger.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
      }
    });

    // Get system metrics
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await this.getSystemMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('Error fetching system metrics:', error);
        res.status(500).json({ error: 'Failed to fetch system metrics' });
      }
    });

    // Get agents status
    this.app.get('/api/agents', (req, res) => {
      try {
        const agents = this.orchestrator.getAllAgents();
        res.json(agents);
      } catch (error) {
        logger.error('Error fetching agents:', error);
        res.status(500).json({ error: 'Failed to fetch agents' });
      }
    });

    // Get specific agent details
    this.app.get('/api/agents/:persona', (req, res) => {
      try {
        const agent = this.orchestrator.getAgent(req.params.persona as any);
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        res.json(agent);
      } catch (error) {
        logger.error('Error fetching agent:', error);
        res.status(500).json({ error: 'Failed to fetch agent' });
      }
    });

    // Get context status
    this.app.get('/api/context', (req, res) => {
      try {
        const status = this.contextManager.getContextStatus();
        res.json(status);
      } catch (error) {
        logger.error('Error fetching context status:', error);
        res.status(500).json({ error: 'Failed to fetch context status' });
      }
    });

    // Get task execution status
    this.app.get('/api/tasks', (req, res) => {
      try {
        const status = this.taskExecutor.getExecutionStatus();
        res.json(status);
      } catch (error) {
        logger.error('Error fetching task status:', error);
        res.status(500).json({ error: 'Failed to fetch task status' });
      }
    });

    // Get pending permissions
    this.app.get('/api/permissions', (req, res) => {
      try {
        const pending = this.permissionManager.getPendingRequests();
        const history = this.permissionManager.getPermissionHistory(20);
        res.json({ pending, history });
      } catch (error) {
        logger.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Failed to fetch permissions' });
      }
    });

    // Respond to permission request
    this.app.post('/api/permissions/:requestId/respond', async (req, res) => {
      try {
        const { requestId } = req.params;
        const { approved, reason } = req.body;

        if (typeof approved !== 'boolean') {
          return res.status(400).json({ error: 'approved field must be boolean' });
        }

        await this.permissionManager.respondToRequest(
          requestId,
          approved,
          reason,
          'dashboard-user'
        );

        res.json({ success: true });
      } catch (error) {
        logger.error('Error responding to permission:', error);
        res.status(500).json({ error: 'Failed to respond to permission request' });
      }
    });

    // Emergency stop
    this.app.post('/api/emergency-stop', async (req, res) => {
      try {
        await this.orchestrator.emergencyStop();
        await this.contextManager.emergencyCleanup();
        
        // Broadcast emergency stop to all clients
        this.io.emit('emergency-stop', {
          timestamp: new Date(),
          reason: 'User initiated emergency stop'
        });

        res.json({ success: true });
      } catch (error) {
        logger.error('Error during emergency stop:', error);
        res.status(500).json({ error: 'Failed to execute emergency stop' });
      }
    });

    // Serve dashboard frontend (fallback to index.html for SPA)
    this.app.get('*', (req, res) => {
      if (this.config.staticPath) {
        const indexPath = path.join(this.config.staticPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
          return;
        }
      }
      
      // Fallback response if no static files
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Sentra Dashboard</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
              .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
              .status { background: #e8f4fd; padding: 20px; border-radius: 4px; margin: 20px 0; }
              .api-list { background: #f8f9fa; padding: 20px; border-radius: 4px; }
              code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚀 Sentra Dashboard</h1>
              <div class="status">
                <h3>✅ Dashboard Server Running</h3>
                <p><strong>Status:</strong> Active</p>
                <p><strong>Port:</strong> ${this.config.port}</p>
                <p><strong>Started:</strong> ${new Date().toISOString()}</p>
              </div>
              <div class="api-list">
                <h3>📡 Available API Endpoints</h3>
                <ul>
                  <li><code>GET /api/health</code> - Server health check</li>
                  <li><code>GET /api/dashboard</code> - Complete dashboard data</li>
                  <li><code>GET /api/metrics</code> - System metrics</li>
                  <li><code>GET /api/agents</code> - All agents status</li>
                  <li><code>GET /api/context</code> - Context usage status</li>
                  <li><code>GET /api/tasks</code> - Task execution status</li>
                  <li><code>GET /api/permissions</code> - Permission requests</li>
                  <li><code>POST /api/emergency-stop</code> - Emergency stop all agents</li>
                </ul>
              </div>
              <p><em>Frontend dashboard coming soon. Use API endpoints for now.</em></p>
            </div>
          </body>
        </html>
      `);
    });
  }

  /**
   * Setup WebSocket handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      this.connectedClients.add(clientId);

      logger.info(`Dashboard client connected: ${clientId}`);

      // Send initial data
      this.getDashboardData().then(data => {
        socket.emit('dashboard-data', data);
      });

      // Handle client disconnection
      socket.on('disconnect', () => {
        this.connectedClients.delete(clientId);
        logger.info(`Dashboard client disconnected: ${clientId}`);
      });

      // Handle permission responses via WebSocket
      socket.on('permission-response', async (data) => {
        try {
          const { requestId, approved, reason } = data;
          await this.permissionManager.respondToRequest(
            requestId,
            approved,
            reason,
            `dashboard-${clientId}`
          );
        } catch (error) {
          logger.error('Error handling permission response via WebSocket:', error);
          socket.emit('error', { message: 'Failed to process permission response' });
        }
      });

      // Handle emergency stop via WebSocket
      socket.on('emergency-stop', async () => {
        try {
          await this.orchestrator.emergencyStop();
          await this.contextManager.emergencyCleanup();
          
          this.io.emit('emergency-stop', {
            timestamp: new Date(),
            reason: `User initiated via dashboard (${clientId})`
          });
        } catch (error) {
          logger.error('Error handling emergency stop via WebSocket:', error);
          socket.emit('error', { message: 'Failed to execute emergency stop' });
        }
      });
    });
  }

  /**
   * Setup event listeners from core systems
   */
  private setupEventListeners(): void {
    // Agent orchestrator events
    this.orchestrator.on('task.assigned', (event) => {
      this.broadcastUpdate('task-assigned', event);
    });

    this.orchestrator.on('task.completed', (event) => {
      this.broadcastUpdate('task-completed', event);
    });

    this.orchestrator.on('task.failed', (event) => {
      this.broadcastUpdate('task-failed', event);
    });

    this.orchestrator.on('agent.status.changed', (event) => {
      this.broadcastUpdate('agent-status-changed', event);
    });

    // Context manager events
    this.contextManager.on('context.warning', (event) => {
      this.broadcastUpdate('context-warning', event);
    });

    this.contextManager.on('context.critical', (event) => {
      this.broadcastUpdate('context-critical', event);
    });

    this.contextManager.on('context.cleanup.completed', (event) => {
      this.broadcastUpdate('context-cleanup', event);
    });

    // Permission manager events
    this.permissionManager.on('permission.requested', (event) => {
      this.broadcastUpdate('permission-requested', event);
    });

    this.permissionManager.on('permission.approved', (event) => {
      this.broadcastUpdate('permission-approved', event);
    });

    this.permissionManager.on('permission.denied', (event) => {
      this.broadcastUpdate('permission-denied', event);
    });

    // Dashboard-specific events
    this.permissionManager.on('dashboard.notification', (event) => {
      this.broadcastUpdate('dashboard-notification', event);
    });
  }

  /**
   * Broadcast update to all connected clients
   */
  private broadcastUpdate(eventType: string, data: any): void {
    if (this.connectedClients.size > 0) {
      this.io.emit(eventType, {
        type: eventType,
        timestamp: new Date(),
        data
      });

      logger.debug(`Broadcasted ${eventType} to ${this.connectedClients.size} clients`);
    }
  }

  /**
   * Get complete dashboard data
   */
  private async getDashboardData(): Promise<DashboardData> {
    const agents = this.orchestrator.getAllAgents();
    const tasks: Task[] = []; // In real implementation, get from task store
    const project = await this.getProjectInfo();
    const permissions = this.permissionManager.getPendingRequests();
    const metrics = await this.getSystemMetrics();

    return {
      agents,
      tasks,
      project,
      permissions,
      metrics
    };
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const orchestratorStatus = this.orchestrator.getStatus();
    const contextStatus = this.contextManager.getContextStatus();
    const taskStatus = this.taskExecutor.getExecutionStatus();

    // Calculate agent utilization
    const agentUtilization: Record<string, number> = {};
    for (const agent of orchestratorStatus.agents) {
      agentUtilization[agent.persona] = agent.status === 'working' ? 100 : 0;
    }

    return {
      tasksCompleted: taskStatus.completed,
      averageCompletionTime: taskStatus.averageDuration,
      successRate: taskStatus.completed / (taskStatus.completed + taskStatus.failed) * 100 || 100,
      contextEfficiency: 100 - contextStatus.totalUsage,
      agentUtilization: agentUtilization as any
    };
  }

  /**
   * Get project information
   */
  private async getProjectInfo(): Promise<any> {
    // In real implementation, this would load from project configuration
    return {
      id: 'sentra-project',
      name: 'Sentra CLI Project',
      description: 'The intelligent Claude Code command center',
      repository: 'https://github.com/barnent1/sentra-cli',
      branch: 'main',
      context: this.contextManager.getContextStatus(),
      configuration: {
        contextLimit: 40,
        testCoverageRequirement: 95,
        maxRetries: 3,
        permissionTimeout: 300000,
        notifications: {
          channels: ['dashboard', 'push'],
          quietHours: {
            start: '22:00',
            end: '08:00',
            timezone: 'UTC'
          },
          priority: {
            low: ['dashboard'],
            medium: ['dashboard', 'push'],
            high: ['dashboard', 'push', 'sms'],
            critical: ['dashboard', 'push', 'sms']
          }
        },
        integrations: {
          linear: {
            apiKey: process.env.LINEAR_API_KEY ? '***' : 'not-configured',
            teamId: process.env.LINEAR_TEAM_ID || 'not-configured'
          },
          github: {
            token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN ? '***' : 'not-configured',
            owner: 'barnent1',
            defaultBranch: 'main'
          },
          figma: {
            accessToken: process.env.FIGMA_ACCESS_TOKEN ? '***' : 'not-configured',
            teamId: process.env.FIGMA_TEAM_ID || 'not-configured'
          },
          twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID ? '***' : 'not-configured',
            authToken: process.env.TWILIO_AUTH_TOKEN ? '***' : 'not-configured',
            phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'not-configured',
            notificationNumber: process.env.TWILIO_NOTIFICATION_NUMBER || 'not-configured'
          },
          pushover: {
            token: process.env.PUSHOVER_TOKEN ? '***' : 'not-configured',
            user: process.env.PUSHOVER_USER || 'not-configured'
          }
        }
      }
    };
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    connectedClients: number;
    config: DashboardConfig;
    uptime: number;
  } {
    return {
      isRunning: this.isRunning,
      connectedClients: this.connectedClients.size,
      config: this.config,
      uptime: process.uptime()
    };
  }
}