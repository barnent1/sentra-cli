/**
 * Mock implementations for integration testing
 */

import { vi } from 'vitest';

export const mockLinearIntegration = {
  isConfigured: vi.fn().mockResolvedValue(true),
  getTeamInfo: vi.fn().mockResolvedValue({
    id: 'test-team-id',
    name: 'Test Team',
    key: 'TEST'
  }),
  createTask: vi.fn().mockResolvedValue({
    id: 'test-task-id',
    identifier: 'TEST-123',
    title: 'Test Task',
    state: 'Todo',
    priority: 2,
    url: 'https://linear.app/test/issue/TEST-123'
  }),
  updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  addComment: vi.fn().mockResolvedValue(undefined),
  getTask: vi.fn().mockResolvedValue({
    id: 'test-task-id',
    identifier: 'TEST-123',
    title: 'Test Task',
    state: 'Todo'
  }),
  searchTasks: vi.fn().mockResolvedValue([]),
  getStatus: vi.fn().mockReturnValue({
    configured: true,
    apiKey: true,
    teamId: true,
    workspaceId: false
  })
};

export const mockGitHubIntegration = {
  isConfigured: vi.fn().mockResolvedValue(true),
  getCurrentUser: vi.fn().mockResolvedValue({
    login: 'testuser',
    id: 12345,
    name: 'Test User'
  }),
  getRepository: vi.fn().mockResolvedValue({
    id: 123,
    name: 'test-repo',
    fullName: 'testuser/test-repo',
    defaultBranch: 'main'
  }),
  createRepository: vi.fn().mockResolvedValue({
    id: 123,
    name: 'test-repo',
    fullName: 'testuser/test-repo',
    url: 'https://github.com/testuser/test-repo'
  }),
  createPullRequest: vi.fn().mockResolvedValue({
    id: 456,
    number: 1,
    title: 'Test PR',
    url: 'https://github.com/testuser/test-repo/pull/1'
  }),
  getStatus: vi.fn().mockReturnValue({
    configured: true,
    token: true,
    owner: true
  })
};

export const mockTwilioIntegration = {
  isConfigured: vi.fn().mockResolvedValue(true),
  getAccountInfo: vi.fn().mockResolvedValue({
    sid: 'test-account-sid',
    friendlyName: 'Test Account'
  }),
  sendSMS: vi.fn().mockResolvedValue({
    sid: 'test-message-sid',
    status: 'queued',
    to: '+1234567890',
    from: '+0987654321',
    body: 'Test message'
  }),
  sendPermissionRequest: vi.fn().mockResolvedValue({
    sid: 'test-message-sid',
    status: 'queued'
  }),
  sendApprovalConfirmation: vi.fn().mockResolvedValue({
    sid: 'test-message-sid',
    status: 'queued'
  }),
  testSMS: vi.fn().mockResolvedValue({
    sid: 'test-message-sid',
    status: 'queued'
  }),
  getStatus: vi.fn().mockReturnValue({
    configured: true,
    accountSid: true,
    authToken: true,
    fromNumber: true,
    toNumber: true
  })
};

export const mockPushoverIntegration = {
  isConfigured: vi.fn().mockResolvedValue(true),
  validateCredentials: vi.fn().mockResolvedValue(true),
  sendNotification: vi.fn().mockResolvedValue({
    status: 1,
    request: 'test-request-id'
  }),
  sendPermissionRequest: vi.fn().mockResolvedValue({
    status: 1,
    request: 'test-request-id'
  }),
  sendApprovalConfirmation: vi.fn().mockResolvedValue({
    status: 1,
    request: 'test-request-id'
  }),
  testPushNotification: vi.fn().mockResolvedValue({
    status: 1,
    request: 'test-request-id'
  }),
  getStatus: vi.fn().mockReturnValue({
    configured: true,
    token: true,
    userKey: true
  })
};

// Mock implementations for agent classes
export const createMockAgent = (persona: string) => ({
  id: `mock-agent-${persona}`,
  name: `Mock ${persona}`,
  persona,
  specializations: [`mock-${persona}-spec`],
  contextLimit: 30,
  status: 'idle',
  contextUsage: 0,
  getSpecializations: vi.fn().mockReturnValue([`mock-${persona}-spec`])
});

// Mock task factory
export const createMockTask = (overrides = {}) => ({
  id: 'mock-task-id',
  title: 'Mock Task',
  description: 'A mock task for testing',
  status: 'pending',
  priority: 'medium',
  dependencies: [],
  contextRequirement: 20,
  acceptanceCriteria: ['Mock criteria'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Mock permission request factory
export const createMockPermissionRequest = (overrides = {}) => ({
  id: 'mock-permission-id',
  agent: 'frontend-developer',
  command: 'npm install',
  context: 'Installing dependencies',
  riskLevel: 'medium',
  timeout: 300000,
  createdAt: new Date(),
  status: 'pending',
  ...overrides
});