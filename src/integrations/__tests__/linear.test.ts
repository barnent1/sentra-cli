/**
 * Linear Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { LinearIntegration } from '../linear.js';
import { SentraError } from '../../types/index.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('LinearIntegration', () => {
  let linearIntegration: LinearIntegration;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    linearIntegration = new LinearIntegration();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('configuration', () => {
    it('should initialize with environment variables', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.linear.app/graphql',
        headers: {
          'Authorization': 'Bearer test_linear_key',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    });

    it('should detect configuration status', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            team: {
              id: 'test_team_id',
              name: 'Test Team',
              key: 'TEST'
            }
          }
        }
      });

      const isConfigured = await linearIntegration.isConfigured();
      expect(isConfigured).toBe(true);
    });

    it('should return false for invalid configuration', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Unauthorized'));

      const isConfigured = await linearIntegration.isConfigured();
      expect(isConfigured).toBe(false);
    });

    it('should return configuration status', () => {
      const status = linearIntegration.getStatus();
      
      expect(status).toEqual({
        configured: true,
        apiKey: true,
        teamId: true,
        workspaceId: false
      });
    });
  });

  describe('team operations', () => {
    it('should get team information', async () => {
      const mockTeam = {
        id: 'test_team_id',
        name: 'Test Team',
        description: 'A test team',
        key: 'TEST',
        organization: {
          id: 'org_id',
          name: 'Test Organization'
        }
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            team: mockTeam
          }
        }
      });

      const team = await linearIntegration.getTeamInfo();
      expect(team).toEqual(mockTeam);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('', {
        query: expect.stringContaining('query GetTeam'),
        variables: { teamId: 'test_team_id' }
      });
    });

    it('should handle GraphQL errors', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          errors: [{ message: 'Team not found' }]
        }
      });

      await expect(linearIntegration.getTeamInfo()).rejects.toThrow(SentraError);
    });
  });

  describe('task operations', () => {
    it('should create a task successfully', async () => {
      const mockIssue = {
        id: 'issue_id',
        identifier: 'TEST-123',
        title: 'Test Task',
        description: 'Test description',
        state: { id: 'state_id', name: 'Todo' },
        priority: 2,
        estimate: 3,
        labels: { nodes: [{ id: 'label_id', name: 'test' }] },
        assignee: { id: 'user_id', name: 'Test User', email: 'test@example.com' },
        url: 'https://linear.app/test/issue/TEST-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            issueCreate: {
              success: true,
              issue: mockIssue
            }
          }
        }
      });

      const taskInput = {
        title: 'Test Task',
        description: 'Test description',
        acceptanceCriteria: ['Should work', 'Should be tested'],
        priority: 'medium' as const,
        estimate: 3,
        labels: ['test']
      };

      const task = await linearIntegration.createTask(taskInput);

      expect(task).toEqual({
        id: 'issue_id',
        identifier: 'TEST-123',
        title: 'Test Task',
        description: 'Test description',
        state: 'Todo',
        priority: 2,
        estimate: 3,
        labels: ['test'],
        assignee: 'Test User',
        url: 'https://linear.app/test/issue/TEST-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });
    });

    it('should format description with acceptance criteria', async () => {
      const mockIssue = {
        id: 'issue_id',
        identifier: 'TEST-124',
        title: 'Test Task with Criteria',
        description: 'Base description\n\n## Acceptance Criteria\n\n1. Should work\n2. Should be tested\n\n---\n*Generated by Sentra CLI - The intelligent Claude Code command center*',
        state: { id: 'state_id', name: 'Todo' },
        priority: 2,
        estimate: null,
        labels: { nodes: [] },
        assignee: null,
        url: 'https://linear.app/test/issue/TEST-124',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            issueCreate: {
              success: true,
              issue: mockIssue
            }
          }
        }
      });

      const taskInput = {
        title: 'Test Task with Criteria',
        description: 'Base description',
        acceptanceCriteria: ['Should work', 'Should be tested']
      };

      await linearIntegration.createTask(taskInput);

      const createCall = mockAxiosInstance.post.mock.calls[0][1];
      expect(createCall.variables.input.description).toContain('## Acceptance Criteria');
      expect(createCall.variables.input.description).toContain('1. Should work');
      expect(createCall.variables.input.description).toContain('2. Should be tested');
      expect(createCall.variables.input.description).toContain('Generated by Sentra CLI');
    });

    it('should throw error when not configured', async () => {
      // Create a new instance without proper configuration
      const unconfiguredIntegration = new LinearIntegration();
      unconfiguredIntegration['apiKey'] = undefined;

      await expect(
        unconfiguredIntegration.createTask({ title: 'Test Task' })
      ).rejects.toThrow('Linear integration not configured');
    });

    it('should get task by identifier', async () => {
      const mockIssue = {
        id: 'issue_id',
        identifier: 'TEST-123',
        title: 'Existing Task',
        description: 'Existing description',
        state: { id: 'state_id', name: 'In Progress' },
        priority: 3,
        estimate: 5,
        labels: { nodes: [] },
        assignee: null,
        url: 'https://linear.app/test/issue/TEST-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            issue: mockIssue
          }
        }
      });

      const task = await linearIntegration.getTask('TEST-123');

      expect(task).toEqual({
        id: 'issue_id',
        identifier: 'TEST-123',
        title: 'Existing Task',
        description: 'Existing description',
        state: 'In Progress',
        priority: 3,
        estimate: 5,
        labels: [],
        assignee: null,
        url: 'https://linear.app/test/issue/TEST-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      });
    });

    it('should return null for non-existent task', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            issue: null
          }
        }
      });

      const task = await linearIntegration.getTask('NON-EXISTENT');
      expect(task).toBeNull();
    });
  });

  describe('task status updates', () => {
    it('should update task status successfully', async () => {
      // Mock getTeamStates call
      mockAxiosInstance.post
        .mockResolvedValueOnce({
          data: {
            data: {
              team: {
                states: {
                  nodes: [
                    { id: 'todo_state', name: 'Todo', type: 'unstarted' },
                    { id: 'progress_state', name: 'In Progress', type: 'started' },
                    { id: 'done_state', name: 'Done', type: 'completed' }
                  ]
                }
              }
            }
          }
        })
        // Mock updateIssue call
        .mockResolvedValueOnce({
          data: {
            data: {
              issueUpdate: {
                success: true,
                issue: {
                  id: 'issue_id',
                  identifier: 'TEST-123',
                  state: { name: 'Done' }
                }
              }
            }
          }
        });

      await linearIntegration.updateTaskStatus('issue_id', 'Done');

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      
      // Check the update call
      const updateCall = mockAxiosInstance.post.mock.calls[1][1];
      expect(updateCall.variables.input.stateId).toBe('done_state');
    });

    it('should throw error for invalid status', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            team: {
              states: {
                nodes: [
                  { id: 'todo_state', name: 'Todo', type: 'unstarted' }
                ]
              }
            }
          }
        }
      });

      await expect(
        linearIntegration.updateTaskStatus('issue_id', 'Invalid Status')
      ).rejects.toThrow('Status not found: Invalid Status');
    });
  });

  describe('comments', () => {
    it('should add comment to task', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment_id',
                body: 'Test comment'
              }
            }
          }
        }
      });

      await linearIntegration.addComment('issue_id', 'Test comment');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('', {
        query: expect.stringContaining('mutation CreateComment'),
        variables: {
          input: {
            issueId: 'issue_id',
            body: 'Test comment'
          }
        }
      });
    });
  });

  describe('search', () => {
    it('should search tasks successfully', async () => {
      const mockSearchResults = [
        {
          id: 'issue_1',
          identifier: 'TEST-100',
          title: 'Search Result 1',
          description: 'First search result',
          state: { name: 'Todo' },
          priority: 2,
          estimate: null,
          labels: { nodes: [] },
          assignee: null,
          url: 'https://linear.app/test/issue/TEST-100',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            team: {
              issues: {
                nodes: mockSearchResults
              }
            }
          }
        }
      });

      const results = await linearIntegration.searchTasks('search query');

      expect(results).toHaveLength(1);
      expect(results[0].identifier).toBe('TEST-100');
      expect(results[0].title).toBe('Search Result 1');
    });

    it('should limit search results', async () => {
      await linearIntegration.searchTasks('query', 5);

      const searchCall = mockAxiosInstance.post.mock.calls[0][1];
      expect(searchCall.variables.first).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      await expect(linearIntegration.getTeamInfo()).rejects.toThrow(SentraError);
    });

    it('should handle API errors with response interceptor', () => {
      // Test that interceptors are set up
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });
  });
});