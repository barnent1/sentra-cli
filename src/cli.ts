#!/usr/bin/env node

/**
 * Sentra CLI Entry Point
 * The intelligent Claude Code command center for autonomous project execution
 */

import { program } from 'commander';
import chalk from 'chalk';
import { SentraError } from './types/index.js';
import { initCommand } from './commands/init.js';
import { requirementsCommand } from './commands/requirements.js';
import { taskCommand } from './commands/task.js';
import { dashboardCommand } from './commands/dashboard.js';
import { configCommand } from './commands/config.js';
import { statusCommand } from './commands/status.js';
import { logsCommand } from './commands/logs.js';
import { permissionsCommand } from './commands/permissions.js';
import { contextCommand } from './commands/context.js';
import { logger } from './utils/logger.js';

const VERSION = '0.1.0';

// ASCII Art Banner
const banner = `
${chalk.cyan('╔══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('🚀 SENTRA CLI')}                                          ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('The intelligent Claude Code command center')}            ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('for autonomous project execution')}                     ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════╝')}
`;

// Configure program
program
  .name('sentra')
  .description('The intelligent Claude Code command center for autonomous project execution')
  .version(VERSION, '-v, --version', 'Output the current version')
  .helpOption('-h, --help', 'Display help information')
  .configureHelp({
    sortSubcommands: true,
    showGlobalOptions: true,
  });

// Global error handler
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  console.error(chalk.red('💥 Fatal error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection:', reason);
  console.error(chalk.red('💥 Unhandled promise rejection:'), reason);
  process.exit(1);
});

// Custom error handling
const handleError = (error: Error): void => {
  if (error instanceof SentraError) {
    console.error(chalk.red(`❌ ${error.message}`));
    if (error.context) {
      console.error(chalk.gray('Context:'), error.context);
    }
    logger.error(`SentraError [${error.code}]:`, error.message, error.context);
  } else {
    console.error(chalk.red('❌ Unexpected error:'), error.message);
    logger.error('Unexpected error:', error);
  }
  process.exit(1);
};

// Show banner on help or version
const originalHelp = program.help;
program.help = function(options?: any) {
  console.log(banner);
  return originalHelp.call(this, options);
};

// Add version display enhancement
program.on('option:version', () => {
  console.log(banner);
  console.log(`${chalk.green('Version:')} ${VERSION}`);
  console.log(`${chalk.gray('Node.js:')} ${process.version}`);
  console.log(`${chalk.gray('Platform:')} ${process.platform} ${process.arch}`);
  process.exit(0);
});

// Register commands
try {
  // Project Management Commands
  program.addCommand(initCommand);
  program.addCommand(requirementsCommand);
  program.addCommand(taskCommand);
  program.addCommand(dashboardCommand);

  // Configuration Commands
  program.addCommand(configCommand);

  // Monitoring & Control Commands
  program.addCommand(statusCommand);
  program.addCommand(logsCommand);
  program.addCommand(permissionsCommand);
  program.addCommand(contextCommand);

  // Parse arguments and execute
  program.parseAsync(process.argv).catch(handleError);

} catch (error) {
  handleError(error as Error);
}

// Show banner and help if no command provided
if (process.argv.length <= 2) {
  console.log(banner);
  program.help();
}