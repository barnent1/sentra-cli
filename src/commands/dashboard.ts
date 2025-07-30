/**
 * Dashboard command - Launch real-time monitoring dashboard
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import { logger } from '../utils/logger.js';
import { DashboardServer } from '../dashboard/server.js';
import { AgentOrchestrator } from '../core/agent-orchestrator.js';
import { ContextManager } from '../core/context-manager.js';
import { TaskExecutor } from '../core/task-executor.js';
import { PermissionManager } from '../core/permission-manager.js';
import { SentraError } from '../types/index.js';

interface DashboardOptions {
  port?: number;
  host?: string;
  open?: boolean;
  dev?: boolean;
}

export const dashboardCommand = new Command('dashboard')
  .description('Launch real-time monitoring dashboard')
  .option('-p, --port <number>', 'Dashboard port', '3001')
  .option('-h, --host <string>', 'Dashboard host', 'localhost')
  .option('--no-open', 'Don\'t automatically open browser')
  .option('--dev', 'Enable development mode')
  .action(async (options: DashboardOptions) => {
    const spinner = ora('Starting Sentra dashboard...').start();
    
    try {
      await startDashboard(options);
      spinner.succeed(chalk.green('✅ Dashboard started successfully!'));
    } catch (error) {
      spinner.fail(chalk.red('❌ Failed to start dashboard'));
      throw error;
    }
  });

async function startDashboard(options: DashboardOptions): Promise<void> {
  const port = parseInt(options.port || '3001');
  const host = options.host || 'localhost';
  const shouldOpen = options.open !== false;

  logger.info('Starting dashboard server', { port, host, dev: options.dev });

  // Initialize core systems
  const contextManager = new ContextManager();
  const taskExecutor = new TaskExecutor();
  const orchestrator = new AgentOrchestrator(contextManager, taskExecutor);
  const permissionManager = new PermissionManager();

  // Load persisted context state
  await contextManager.loadPersistedState();

  // Start monitoring systems
  contextManager.startMonitoring();

  // Configure dashboard server
  const dashboardConfig = {
    port,
    host,
    enableCors: options.dev || false,
    staticPath: options.dev ? undefined : 'dashboard/dist'
  };

  // Create and start dashboard server
  const dashboardServer = new DashboardServer(
    dashboardConfig,
    orchestrator,
    contextManager,
    taskExecutor,
    permissionManager
  );

  await dashboardServer.start();

  const dashboardUrl = `http://${host}:${port}`;

  // Display startup information
  console.log(chalk.cyan('\n🚀 Sentra Dashboard Started\n'));
  console.log(chalk.white(`📡 Server:`), chalk.green(dashboardUrl));
  console.log(chalk.white(`🔧 Environment:`), options.dev ? chalk.yellow('Development') : chalk.green('Production'));
  console.log(chalk.white(`📊 API Base:`), chalk.blue(`${dashboardUrl}/api`));
  console.log(chalk.white(`🔌 WebSocket:`), chalk.blue(`ws://${host}:${port}`));

  console.log(chalk.cyan('\n📋 Available Endpoints:\n'));
  const endpoints = [
    { method: 'GET', path: '/api/health', description: 'Server health check' },
    { method: 'GET', path: '/api/dashboard', description: 'Complete dashboard data' },
    { method: 'GET', path: '/api/metrics', description: 'System metrics' },
    { method: 'GET', path: '/api/agents', description: 'All agents status' },
    { method: 'GET', path: '/api/context', description: 'Context usage status' },
    { method: 'GET', path: '/api/tasks', description: 'Task execution status' },
    { method: 'GET', path: '/api/permissions', description: 'Permission requests' },
    { method: 'POST', path: '/api/emergency-stop', description: 'Emergency stop all agents' }
  ];

  endpoints.forEach(endpoint => {
    const methodColor = endpoint.method === 'GET' ? chalk.green : chalk.yellow;
    console.log(`  ${methodColor(endpoint.method.padEnd(4))} ${chalk.blue(endpoint.path.padEnd(25))} ${chalk.gray(endpoint.description)}`);
  });

  console.log(chalk.cyan('\n💡 Usage Tips:\n'));
  console.log(chalk.gray('  • Use the web interface for visual monitoring'));
  console.log(chalk.gray('  • API endpoints provide programmatic access'));
  console.log(chalk.gray('  • WebSocket connection provides real-time updates'));
  console.log(chalk.gray('  • Press Ctrl+C to stop the dashboard'));

  // Open browser if requested
  if (shouldOpen) {
    try {
      await open(dashboardUrl);
      console.log(chalk.green('\n🌐 Dashboard opened in browser'));
    } catch (error) {
      console.log(chalk.yellow('\n⚠️  Could not open browser automatically'));
      console.log(chalk.gray(`   Please open ${dashboardUrl} manually`));
    }
  }

  // Start orchestrator
  await orchestrator.start();

  // Handle graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(chalk.yellow(`\n⚡ Received ${signal}, shutting down gracefully...`));
    
    try {
      // Stop all systems
      await orchestrator.stop();
      contextManager.stopMonitoring();
      await dashboardServer.stop();
      
      console.log(chalk.green('✅ Dashboard shutdown complete'));
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('❌ Error during shutdown:'), error);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Keep process alive
  console.log(chalk.gray('\n📡 Dashboard running... Press Ctrl+C to stop\n'));
}