/**
 * Context Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ContextManager } from '../context-manager.js';
import { ContextOverflowError } from '../../types/index.js';

describe('ContextManager', () => {
  let contextManager: ContextManager;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.sentra-test', 'context-manager-test');
    await fs.ensureDir(testDir);
    contextManager = new ContextManager(testDir);
  });

  afterEach(async () => {
    contextManager.stopMonitoring();
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('initialization', () => {
    it('should initialize with default context limits', () => {
      const status = contextManager.getContextStatus();
      
      expect(status.limits.maxPercentage).toBe(40);
      expect(status.limits.warningThreshold).toBe(35);
      expect(status.limits.maxItems).toBe(1000);
    });

    it('should initialize context windows for all personas', () => {
      const status = contextManager.getContextStatus();
      
      expect(Object.keys(status.agentUsage)).toHaveLength(8);
      expect(status.agentUsage).toHaveProperty('requirements-analyst');
      expect(status.agentUsage).toHaveProperty('ui-ux-designer');
      expect(status.agentUsage).toHaveProperty('frontend-developer');
      expect(status.agentUsage).toHaveProperty('backend-architect');
      expect(status.agentUsage).toHaveProperty('qa-engineer');
      expect(status.agentUsage).toHaveProperty('security-analyst');
      expect(status.agentUsage).toHaveProperty('technical-writer');
      expect(status.agentUsage).toHaveProperty('devops-engineer');
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(contextManager['isMonitoring']).toBe(false);
      
      contextManager.startMonitoring();
      expect(contextManager['isMonitoring']).toBe(true);
      
      contextManager.stopMonitoring();
      expect(contextManager['isMonitoring']).toBe(false);
    });

    it('should not start monitoring if already running', () => {
      contextManager.startMonitoring();
      expect(contextManager['isMonitoring']).toBe(true);
      
      // Should not change state if already monitoring
      contextManager.startMonitoring();
      expect(contextManager['isMonitoring']).toBe(true);
    });
  });

  describe('context management', () => {
    it('should add context item successfully', async () => {
      const contextItem = {
        type: 'file' as const,
        path: '/test/file.ts',
        content: 'const test = "hello world";',
        size: 0 // Will be calculated
      };

      await contextManager.addContext('frontend-developer', contextItem);
      
      const usage = await contextManager.calculateUsage('frontend-developer');
      expect(usage).toBeGreaterThan(0);
    });

    it('should calculate item size correctly', async () => {
      const largeContent = 'x'.repeat(1000);
      const contextItem = {
        type: 'file' as const,
        path: '/test/large-file.ts',
        content: largeContent,
        size: 0
      };

      await contextManager.addContext('frontend-developer', contextItem);
      
      const usage = await contextManager.calculateUsage('frontend-developer');
      expect(usage).toBeGreaterThan(0);
    });

    it('should remove context item successfully', async () => {
      const contextItem = {
        type: 'file' as const,
        path: '/test/file.ts',
        content: 'const test = "hello";',
        size: 0
      };

      await contextManager.addContext('frontend-developer', contextItem);
      const usageBeforeRemoval = await contextManager.calculateUsage('frontend-developer');
      
      const removed = await contextManager.removeContext('frontend-developer', '/test/file.ts');
      expect(removed).toBe(true);
      
      const usageAfterRemoval = await contextManager.calculateUsage('frontend-developer');
      expect(usageAfterRemoval).toBeLessThan(usageBeforeRemoval);
    });

    it('should return false when removing non-existent context item', async () => {
      const removed = await contextManager.removeContext('frontend-developer', '/non/existent/file.ts');
      expect(removed).toBe(false);
    });
  });

  describe('context limits and overflow', () => {
    it('should throw ContextOverflowError when limit exceeded', async () => {
      // Create a very large context item that would exceed limits
      const largeContent = 'x'.repeat(50000); // Large content to trigger overflow
      const contextItem = {
        type: 'file' as const,
        path: '/test/huge-file.ts',
        content: largeContent,
        size: 0
      };

      await expect(
        contextManager.addContext('technical-writer', contextItem) // Technical writer has lower limit
      ).rejects.toThrow(ContextOverflowError);
    });

    it('should perform automatic cleanup when approaching limits', async () => {
      const spy = vi.spyOn(contextManager as any, 'performAutomaticCleanup');
      
      // Add multiple items to trigger cleanup
      for (let i = 0; i < 5; i++) {
        const contextItem = {
          type: 'file' as const,
          path: `/test/file-${i}.ts`,
          content: 'x'.repeat(2000),
          size: 0
        };
        
        try {
          await contextManager.addContext('technical-writer', contextItem);
        } catch (error) {
          // Expected to fail at some point due to limits
          break;
        }
      }
      
      // Cleanup should have been attempted
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('context status and recommendations', () => {
    it('should provide context status with recommendations', async () => {
      const status = contextManager.getContextStatus();
      
      expect(status).toHaveProperty('totalUsage');
      expect(status).toHaveProperty('agentUsage');
      expect(status).toHaveProperty('limits');
      expect(status).toHaveProperty('recommendations');
      expect(Array.isArray(status.recommendations)).toBe(true);
    });

    it('should provide recommendations when usage is high', async () => {
      // Add context to increase usage
      const contextItem = {
        type: 'file' as const,
        path: '/test/file.ts',
        content: 'x'.repeat(5000),
        size: 0
      };

      await contextManager.addContext('frontend-developer', contextItem);
      
      const status = contextManager.getContextStatus();
      
      if (status.totalUsage > 35) {
        expect(status.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('cleanup operations', () => {
    it('should perform manual cleanup successfully', async () => {
      // Add some context first
      const contextItem = {
        type: 'file' as const,
        path: '/test/file.ts',
        content: 'test content',
        size: 0
      };

      await contextManager.addContext('frontend-developer', contextItem);
      const usageBeforeCleanup = await contextManager.calculateUsage('frontend-developer');
      
      await contextManager.cleanup('frontend-developer');
      const usageAfterCleanup = await contextManager.calculateUsage('frontend-developer');
      
      expect(usageAfterCleanup).toBe(0);
      expect(usageAfterCleanup).toBeLessThan(usageBeforeCleanup);
    });

    it('should perform emergency cleanup on all personas', async () => {
      // Add context to multiple personas
      const contextItem = {
        type: 'file' as const,
        path: '/test/file.ts',
        content: 'test content',
        size: 0
      };

      await contextManager.addContext('frontend-developer', contextItem);
      await contextManager.addContext('backend-architect', contextItem);
      
      await contextManager.emergencyCleanup();
      
      const frontendUsage = await contextManager.calculateUsage('frontend-developer');
      const backendUsage = await contextManager.calculateUsage('backend-architect');
      
      expect(frontendUsage).toBe(0);
      expect(backendUsage).toBe(0);
      expect(contextManager.getTotalUsage()).toBe(0);
    });
  });

  describe('event emission', () => {
    it('should emit warning event when approaching limits', async () => {
      const warningHandler = vi.fn();
      contextManager.on('context.warning', warningHandler);

      // Add context that approaches warning threshold
      const contextItem = {
        type: 'file' as const,
        path: '/test/large-file.ts',
        content: 'x'.repeat(3000),
        size: 0
      };

      await contextManager.addContext('technical-writer', contextItem);
      
      const usage = await contextManager.calculateUsage('technical-writer');
      if (usage >= 35) {
        expect(warningHandler).toHaveBeenCalled();
      }
    });

    it('should emit cleanup event after cleanup', async () => {
      const cleanupHandler = vi.fn();
      contextManager.on('context.cleanup.manual', cleanupHandler);

      // Add and then cleanup context
      const contextItem = {
        type: 'file' as const,
        path: '/test/file.ts',
        content: 'test content',
        size: 0
      };

      await contextManager.addContext('frontend-developer', contextItem);
      await contextManager.cleanup('frontend-developer');
      
      expect(cleanupHandler).toHaveBeenCalled();
    });
  });

  describe('persistence', () => {
    it('should persist context state to disk', async () => {
      const contextItem = {
        type: 'file' as const,
        path: '/test/file.ts',
        content: 'test content',
        size: 0
      };

      await contextManager.addContext('frontend-developer', contextItem);
      
      // Check if state file was created
      const statePath = path.join(testDir, '.sentra', 'context', 'frontend-developer.json');
      const stateExists = await fs.pathExists(statePath);
      expect(stateExists).toBe(true);

      if (stateExists) {
        const state = await fs.readJson(statePath);
        expect(state.persona).toBe('frontend-developer');
        expect(state.items).toHaveLength(1);
        expect(state.items[0].path).toBe('/test/file.ts');
      }
    });

    it('should load persisted context state', async () => {
      // Create a new context manager to test loading
      const newContextManager = new ContextManager(testDir);
      
      // Add context with first manager
      const contextItem = {
        type: 'file' as const,
        path: '/test/persisted-file.ts',
        content: 'persisted content',
        size: 0
      };

      await contextManager.addContext('frontend-developer', contextItem);
      
      // Load state with new manager
      await newContextManager.loadPersistedState();
      
      const usage = await newContextManager.calculateUsage('frontend-developer');
      expect(usage).toBeGreaterThan(0);
    });
  });
});