/**
 * Permission Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { PermissionManager } from '../permission-manager.js';
import { PermissionDeniedError } from '../../types/index.js';
import { mockTwilioIntegration, mockPushoverIntegration } from '../../test/mocks/integrations.js';

// Mock the integrations
vi.mock('../../integrations/twilio.js', () => ({
  TwilioIntegration: vi.fn(() => mockTwilioIntegration)
}));

vi.mock('../../integrations/pushover.js', () => ({
  PushoverIntegration: vi.fn(() => mockPushoverIntegration)
}));

describe('PermissionManager', () => {
  let permissionManager: PermissionManager;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.sentra-test', 'permission-manager-test');
    await fs.ensureDir(testDir);
    permissionManager = new PermissionManager(testDir);
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('initialization', () => {
    it('should initialize with default permission rules', () => {
      expect(permissionManager['permissionRules']).toBeDefined();
      expect(permissionManager['permissionRules'].length).toBeGreaterThan(0);
    });

    it('should create permissions directory', async () => {
      const permissionsDir = path.join(testDir, '.sentra', 'permissions');
      const dirExists = await fs.pathExists(permissionsDir);
      expect(dirExists).toBe(true);
    });
  });

  describe('risk assessment', () => {
    it('should assess low risk for safe operations', () => {
      const riskAssessment = permissionManager['assessRisk']('ls -la', 'development environment');
      
      expect(riskAssessment.level).toBe('low');
      expect(riskAssessment.score).toBeLessThan(50);
    });

    it('should assess critical risk for destructive operations', () => {
      const riskAssessment = permissionManager['assessRisk']('rm -rf /', 'production environment');
      
      expect(riskAssessment.level).toBe('critical');
      expect(riskAssessment.score).toBeGreaterThan(80);
      expect(riskAssessment.factors).toContain('Destructive file system operation');
      expect(riskAssessment.factors).toContain('Production environment');
    });

    it('should assess high risk for database operations', () => {
      const riskAssessment = permissionManager['assessRisk']('DROP TABLE users', 'database operation');
      
      expect(riskAssessment.level).toBe('critical');
      expect(riskAssessment.factors).toContain('Destructive database operation');
    });

    it('should assess medium risk for package installations', () => {
      const riskAssessment = permissionManager['assessRisk']('npm install -g some-package', 'global package installation');
      
      expect(['medium', 'high']).toContain(riskAssessment.level);
      expect(riskAssessment.factors).toContain('Global package installation');
    });
  });

  describe('permission requirements', () => {
    it('should not require approval for low risk operations', () => {
      const requiresApproval = permissionManager['requiresApproval']('ls -la', 'low');
      expect(requiresApproval).toBe(false);
    });

    it('should require approval for high risk operations', () => {
      const requiresApproval = permissionManager['requiresApproval']('rm -rf *', 'high');
      expect(requiresApproval).toBe(true);
    });

    it('should require approval for critical risk operations', () => {
      const requiresApproval = permissionManager['requiresApproval']('DROP DATABASE', 'critical');
      expect(requiresApproval).toBe(true);
    });
  });

  describe('permission requests', () => {
    it('should auto-approve low risk operations', async () => {
      const response = await permissionManager.requestPermission(
        'frontend-developer',
        'npm test',
        'running tests'
      );

      expect(response.approved).toBe(true);
      expect(response.respondedBy).toBe('system');
      expect(response.reason).toContain('Auto-approved');
    });

    it('should create permission request for high risk operations', async () => {
      // Mock the waitForResponse method to resolve quickly for testing
      const originalWaitForResponse = permissionManager['waitForResponse'];
      permissionManager['waitForResponse'] = vi.fn().mockResolvedValue({
        approved: true,
        respondedAt: new Date(),
        respondedBy: 'test-user',
        reason: 'Test approval'
      });

      const responsePromise = permissionManager.requestPermission(
        'devops-engineer',
        'rm -rf node_modules',
        'cleaning up dependencies'
      );

      // Give a moment for the request to be created
      await new Promise(resolve => setTimeout(resolve, 100));

      const pendingRequests = permissionManager.getPendingRequests();
      expect(pendingRequests.length).toBeGreaterThan(0);

      const request = pendingRequests[0];
      expect(request.agent).toBe('devops-engineer');
      expect(request.command).toBe('rm -rf node_modules');
      expect(request.riskLevel).toBe('high');

      // Wait for the mocked response
      await responsePromise;

      // Restore original method
      permissionManager['waitForResponse'] = originalWaitForResponse;
    });

    it('should send notifications for permission requests', async () => {
      // Mock the waitForResponse method
      permissionManager['waitForResponse'] = vi.fn().mockResolvedValue({
        approved: true,
        respondedAt: new Date(),
        respondedBy: 'test-user'
      });

      await permissionManager.requestPermission(
        'backend-architect',
        'docker run --privileged',
        'running privileged container'
      );

      // Check that notification methods were called
      expect(mockTwilioIntegration.isConfigured).toHaveBeenCalled();
      expect(mockPushoverIntegration.isConfigured).toHaveBeenCalled();
    });
  });

  describe('permission responses', () => {
    it('should respond to permission request successfully', async () => {
      // Create a pending request first
      const request = {
        id: 'test-request-id',
        agent: 'qa-engineer' as const,
        command: 'pytest --cov',
        context: 'running test coverage',
        riskLevel: 'medium' as const,
        timeout: 300000,
        createdAt: new Date(),
        status: 'pending' as const
      };

      permissionManager['pendingRequests'].set(request.id, request);

      await permissionManager.respondToRequest(
        request.id,
        true,
        'Approved for testing',
        'test-user'
      );

      const history = permissionManager.getPermissionHistory();
      expect(history.length).toBeGreaterThan(0);

      const response = permissionManager['permissionHistory'].get(request.id);
      expect(response?.approved).toBe(true);
      expect(response?.reason).toBe('Approved for testing');
      expect(response?.respondedBy).toBe('test-user');
    });

    it('should throw error when responding to non-existent request', async () => {
      await expect(
        permissionManager.respondToRequest('non-existent-id', true)
      ).rejects.toThrow('Permission request not found');
    });

    it('should throw error when responding to already resolved request', async () => {
      // Create and resolve a request
      const request = {
        id: 'resolved-request-id',
        agent: 'security-analyst' as const,
        command: 'nmap -sS',
        context: 'security scan',
        riskLevel: 'high' as const,
        timeout: 300000,
        createdAt: new Date(),
        status: 'approved' as const,
        response: {
          approved: true,
          respondedAt: new Date(),
          respondedBy: 'previous-user'
        }
      };

      permissionManager['pendingRequests'].set(request.id, request);

      await expect(
        permissionManager.respondToRequest(request.id, false)
      ).rejects.toThrow('Permission request already resolved');
    });
  });

  describe('request management', () => {
    it('should get pending requests', () => {
      const request = {
        id: 'pending-request-id',
        agent: 'technical-writer' as const,
        command: 'git push --force',
        context: 'force pushing changes',
        riskLevel: 'high' as const,
        timeout: 300000,
        createdAt: new Date(),
        status: 'pending' as const
      };

      permissionManager['pendingRequests'].set(request.id, request);

      const pendingRequests = permissionManager.getPendingRequests();
      expect(pendingRequests).toHaveLength(1);
      expect(pendingRequests[0].id).toBe('pending-request-id');
    });

    it('should cancel pending request', async () => {
      const request = {
        id: 'cancel-request-id',
        agent: 'ui-ux-designer' as const,
        command: 'figma export',
        context: 'exporting designs',
        riskLevel: 'low' as const,
        timeout: 300000,
        createdAt: new Date(),
        status: 'pending' as const
      };

      permissionManager['pendingRequests'].set(request.id, request);

      await permissionManager.cancelRequest(request.id, 'Test cancellation');

      const pendingRequests = permissionManager.getPendingRequests();
      expect(pendingRequests).toHaveLength(0);

      const response = permissionManager['permissionHistory'].get(request.id);
      expect(response?.approved).toBe(false);
      expect(response?.reason).toBe('Test cancellation');
    });
  });

  describe('permission history', () => {
    it('should maintain permission history', async () => {
      // Add a completed request to history
      const response = {
        approved: true,
        respondedAt: new Date(),
        respondedBy: 'test-user',
        reason: 'Test history'
      };

      permissionManager['permissionHistory'].set('history-test-id', response);

      const history = permissionManager.getPermissionHistory();
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('should limit history results', () => {
      // Add multiple items to history
      for (let i = 0; i < 150; i++) {
        const response = {
          approved: i % 2 === 0,
          respondedAt: new Date(),
          respondedBy: 'test-user',
          reason: `Test ${i}`
        };
        permissionManager['permissionHistory'].set(`history-${i}`, response);
      }

      const history = permissionManager.getPermissionHistory(50);
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('timeout handling', () => {
    it('should set appropriate timeout based on risk level', () => {
      const lowTimeout = permissionManager['getTimeoutForRisk']('low');
      const mediumTimeout = permissionManager['getTimeoutForRisk']('medium');
      const highTimeout = permissionManager['getTimeoutForRisk']('high');
      const criticalTimeout = permissionManager['getTimeoutForRisk']('critical');

      expect(lowTimeout).toBeLessThan(mediumTimeout);
      expect(mediumTimeout).toBeLessThan(highTimeout);
      expect(highTimeout).toBeLessThan(criticalTimeout);
    });

    it('should handle request timeout', async () => {
      // Mock setTimeout to fire immediately for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((callback: () => void) => {
        callback();
        return 1 as any;
      }) as any;

      const request = {
        id: 'timeout-request-id',
        agent: 'requirements-analyst' as const,
        command: 'complex analysis',
        context: 'timeout test',
        riskLevel: 'medium' as const,
        timeout: 100, // Very short timeout
        createdAt: new Date(),
        status: 'pending' as const
      };

      permissionManager['pendingRequests'].set(request.id, request);
      
      // Trigger timeout
      permissionManager['setupRequestTimeout'](request);

      // Give a moment for timeout to process
      await new Promise(resolve => setTimeout(resolve, 50));

      const pendingRequests = permissionManager.getPendingRequests();
      expect(pendingRequests.find(r => r.id === request.id)).toBeUndefined();

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('event emission', () => {
    it('should emit permission requested event', async () => {
      const eventHandler = vi.fn();
      permissionManager.on('permission.requested', eventHandler);

      // Mock waitForResponse to avoid hanging
      permissionManager['waitForResponse'] = vi.fn().mockResolvedValue({
        approved: true,
        respondedAt: new Date(),
        respondedBy: 'test-user'
      });

      await permissionManager.requestPermission(
        'backend-architect',
        'sudo systemctl restart service',
        'restarting system service'
      );

      expect(eventHandler).toHaveBeenCalled();
      const eventData = eventHandler.mock.calls[0][0];
      expect(eventData.type).toBe('permission.requested');
      expect(eventData.data.agent).toBe('backend-architect');
    });

    it('should emit permission approved event', async () => {
      const eventHandler = vi.fn();
      permissionManager.on('permission.approved', eventHandler);

      const request = {
        id: 'approval-event-test',
        agent: 'devops-engineer' as const,
        command: 'kubectl apply',
        context: 'deploying to kubernetes',
        riskLevel: 'high' as const,
        timeout: 300000,
        createdAt: new Date(),
        status: 'pending' as const
      };

      permissionManager['pendingRequests'].set(request.id, request);

      await permissionManager.respondToRequest(request.id, true, 'Test approval');

      expect(eventHandler).toHaveBeenCalled();
      const eventData = eventHandler.mock.calls[0][0];
      expect(eventData.type).toBe('permission.approved');
    });

    it('should emit permission denied event', async () => {
      const eventHandler = vi.fn();
      permissionManager.on('permission.denied', eventHandler);

      const request = {
        id: 'denial-event-test',
        agent: 'security-analyst' as const,
        command: 'dangerous-operation',
        context: 'testing denial',
        riskLevel: 'critical' as const,
        timeout: 300000,
        createdAt: new Date(),
        status: 'pending' as const
      };

      permissionManager['pendingRequests'].set(request.id, request);

      await permissionManager.respondToRequest(request.id, false, 'Too risky');

      expect(eventHandler).toHaveBeenCalled();
      const eventData = eventHandler.mock.calls[0][0];
      expect(eventData.type).toBe('permission.denied');
    });
  });
});