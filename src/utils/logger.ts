/**
 * Centralized logging system for Sentra CLI
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), '.sentra', 'logs');
fs.ensureDirSync(logsDir);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'sentra-cli',
    version: '0.1.0'
  },
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'test'
    }),

    // General application logs
    new winston.transports.File({
      filename: path.join(logsDir, 'sentra.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Error-only logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 3
    }),

    // Agent-specific logs
    new winston.transports.File({
      filename: path.join(logsDir, 'agents.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      // Only log agent-related messages
      filter: (info) => info.component === 'agent'
    }),

    // Task execution logs
    new winston.transports.File({
      filename: path.join(logsDir, 'tasks.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      // Only log task-related messages
      filter: (info) => info.component === 'task'
    }),

    // Permission system logs
    new winston.transports.File({
      filename: path.join(logsDir, 'permissions.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      // Only log permission-related messages
      filter: (info) => info.component === 'permission'
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ]
});

// Utility functions for component-specific logging
export const agentLogger = {
  info: (message: string, meta?: Record<string, unknown>) => 
    logger.info(message, { component: 'agent', ...meta }),
  warn: (message: string, meta?: Record<string, unknown>) => 
    logger.warn(message, { component: 'agent', ...meta }),
  error: (message: string, meta?: Record<string, unknown>) => 
    logger.error(message, { component: 'agent', ...meta }),
  debug: (message: string, meta?: Record<string, unknown>) => 
    logger.debug(message, { component: 'agent', ...meta })
};

export const taskLogger = {
  info: (message: string, meta?: Record<string, unknown>) => 
    logger.info(message, { component: 'task', ...meta }),
  warn: (message: string, meta?: Record<string, unknown>) => 
    logger.warn(message, { component: 'task', ...meta }),
  error: (message: string, meta?: Record<string, unknown>) => 
    logger.error(message, { component: 'task', ...meta }),
  debug: (message: string, meta?: Record<string, unknown>) => 
    logger.debug(message, { component: 'task', ...meta })
};

export const permissionLogger = {
  info: (message: string, meta?: Record<string, unknown>) => 
    logger.info(message, { component: 'permission', ...meta }),
  warn: (message: string, meta?: Record<string, unknown>) => 
    logger.warn(message, { component: 'permission', ...meta }),
  error: (message: string, meta?: Record<string, unknown>) => 
    logger.error(message, { component: 'permission', ...meta }),
  debug: (message: string, meta?: Record<string, unknown>) => 
    logger.debug(message, { component: 'permission', ...meta })
};

// Export default logger
export default logger;