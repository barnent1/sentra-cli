/**
 * Test setup and configuration
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';

// Test environment setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Create test directories
  const testDir = path.join(process.cwd(), '.sentra-test');
  await fs.ensureDir(testDir);
  await fs.ensureDir(path.join(testDir, 'logs'));
  await fs.ensureDir(path.join(testDir, 'context'));
  await fs.ensureDir(path.join(testDir, 'permissions'));
  await fs.ensureDir(path.join(testDir, 'artifacts'));
  
  // Mock environment variables for testing
  process.env.LINEAR_API_KEY = 'test_linear_key';
  process.env.LINEAR_TEAM_ID = 'test_team_id';
  process.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'test_github_token';
  process.env.TWILIO_ACCOUNT_SID = 'test_twilio_sid';
  process.env.TWILIO_AUTH_TOKEN = 'test_twilio_token';
  process.env.TWILIO_PHONE_NUMBER = '+1234567890';
  process.env.TWILIO_NOTIFICATION_NUMBER = '+0987654321';
  process.env.PUSHOVER_TOKEN = 'test_pushover_token';
  process.env.PUSHOVER_USER = 'test_pushover_user';
  
  logger.info('Test environment initialized');
});

afterAll(async () => {
  // Clean up test directories
  const testDir = path.join(process.cwd(), '.sentra-test');
  if (await fs.pathExists(testDir)) {
    await fs.remove(testDir);
  }
  
  logger.info('Test environment cleaned up');
});

beforeEach(() => {
  // Reset any module-level state before each test
  // This helps ensure test isolation
});

afterEach(() => {
  // Clean up after each test
  // Reset any timers, intervals, or async operations
});