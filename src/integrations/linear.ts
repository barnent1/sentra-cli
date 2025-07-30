/**
 * Linear Integration - Task management and issue tracking
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { SentraError } from '../types/index.js';

interface LinearTask {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: string;
  priority: number;
  estimate?: number;
  labels: string[];
  assignee?: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateTaskInput {
  title: string;
  description?: string;
  acceptanceCriteria?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimate?: number;
  labels?: string[];
}

export class LinearIntegration {
  private client: AxiosInstance;
  private apiKey: string | undefined;
  private teamId: string | undefined;
  private workspaceId: string | undefined;

  constructor() {
    this.apiKey = process.env.LINEAR_API_KEY;
    this.teamId = process.env.LINEAR_TEAM_ID;
    this.workspaceId = process.env.LINEAR_WORKSPACE_ID;

    this.client = axios.create({
      baseURL: 'https://api.linear.app/graphql',
      headers: {
        'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      logger.debug('Linear API request', {
        url: config.url,
        method: config.method,
        hasAuth: !!config.headers.Authorization
      });
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        if (response.data.errors) {
          logger.error('Linear API GraphQL errors', { errors: response.data.errors });
          throw new SentraError(
            `Linear API error: ${response.data.errors[0].message}`,
            'LINEAR_API_ERROR',
            response.data.errors
          );
        }
        return response;
      },
      (error) => {
        logger.error('Linear API request failed', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        throw new SentraError(
          `Linear API request failed: ${error.message}`,
          'LINEAR_REQUEST_FAILED',
          { status: error.response?.status, url: error.config?.url }
        );
      }
    );
  }

  /**
   * Check if Linear integration is properly configured
   */
  async isConfigured(): Promise<boolean> {
    if (!this.apiKey || !this.teamId) {
      return false;
    }

    try {
      await this.getTeamInfo();
      return true;
    } catch (error) {
      logger.warn('Linear integration configuration check failed', { error });
      return false;
    }
  }

  /**
   * Get team information
   */
  async getTeamInfo(): Promise<any> {
    const query = `
      query GetTeam($teamId: String!) {
        team(id: $teamId) {
          id
          name
          description
          key
          organization {
            id
            name
          }
        }
      }
    `;

    const response = await this.client.post('', {
      query,
      variables: { teamId: this.teamId }
    });

    return response.data.data.team;
  }

  /**
   * Create a new task in Linear
   */
  async createTask(input: CreateTaskInput): Promise<LinearTask> {
    if (!await this.isConfigured()) {
      throw new SentraError('Linear integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            state {
              id
              name
            }
            priority
            estimate
            labels {
              nodes {
                id
                name
              }
            }
            assignee {
              id
              name
              email
            }
            url
            createdAt
            updatedAt
          }
        }
      }
    `;

    // Map priority to Linear priority levels (1-4, where 4 is highest)
    const priorityMap = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };

    const description = this.formatDescription(input.description, input.acceptanceCriteria);

    const variables = {
      input: {
        teamId: this.teamId,
        title: input.title,
        description,
        priority: priorityMap[input.priority || 'medium'],
        estimate: input.estimate,
        labelIds: [], // We would need to resolve label names to IDs in a real implementation
      }
    };

    logger.info('Creating Linear task', {
      title: input.title,
      priority: input.priority,
      estimate: input.estimate
    });

    const response = await this.client.post('', {
      query: mutation,
      variables
    });

    const issue = response.data.data.issueCreate.issue;
    
    const task: LinearTask = {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      state: issue.state.name,
      priority: issue.priority,
      estimate: issue.estimate,
      labels: issue.labels.nodes.map((label: any) => label.name),
      assignee: issue.assignee?.name,
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt
    };

    logger.info('Linear task created successfully', {
      identifier: task.identifier,
      title: task.title,
      url: task.url
    });

    return task;
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    if (!await this.isConfigured()) {
      throw new SentraError('Linear integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    // First, get available states for the team
    const states = await this.getTeamStates();
    const targetState = states.find(state => 
      state.name.toLowerCase() === status.toLowerCase() ||
      state.name.toLowerCase().includes(status.toLowerCase())
    );

    if (!targetState) {
      throw new SentraError(`Status not found: ${status}`, 'INVALID_STATUS');
    }

    const mutation = `
      mutation UpdateIssue($input: IssueUpdateInput!) {
        issueUpdate(input: $input) {
          success
          issue {
            id
            identifier
            state {
              name
            }
          }
        }
      }
    `;

    const variables = {
      input: {
        id: taskId,
        stateId: targetState.id
      }
    };

    await this.client.post('', {
      query: mutation,
      variables
    });

    logger.info('Linear task status updated', {
      taskId,
      newStatus: targetState.name
    });
  }

  /**
   * Add comment to task
   */
  async addComment(taskId: string, comment: string): Promise<void> {
    if (!await this.isConfigured()) {
      throw new SentraError('Linear integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const mutation = `
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
            body
          }
        }
      }
    `;

    const variables = {
      input: {
        issueId: taskId,
        body: comment
      }
    };

    await this.client.post('', {
      query: mutation,
      variables
    });

    logger.info('Comment added to Linear task', {
      taskId,
      commentLength: comment.length
    });
  }

  /**
   * Get task by identifier
   */
  async getTask(identifier: string): Promise<LinearTask | null> {
    if (!await this.isConfigured()) {
      throw new SentraError('Linear integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const query = `
      query GetIssue($identifier: String!) {
        issue(id: $identifier) {
          id
          identifier
          title
          description
          state {
            id
            name
          }
          priority
          estimate
          labels {
            nodes {
              id
              name
            }
          }
          assignee {
            id
            name
            email
          }
          url
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.post('', {
      query,
      variables: { identifier }
    });

    const issue = response.data.data.issue;
    if (!issue) {
      return null;
    }

    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      state: issue.state.name,
      priority: issue.priority,
      estimate: issue.estimate,
      labels: issue.labels.nodes.map((label: any) => label.name),
      assignee: issue.assignee?.name,
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt
    };
  }

  /**
   * Get team states
   */
  private async getTeamStates(): Promise<Array<{ id: string; name: string }>> {
    const query = `
      query GetTeamStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    `;

    const response = await this.client.post('', {
      query,
      variables: { teamId: this.teamId }
    });

    return response.data.data.team.states.nodes;
  }

  /**
   * Format task description with acceptance criteria
   */
  private formatDescription(description?: string, acceptanceCriteria?: string[]): string {
    let formatted = description || '';

    if (acceptanceCriteria && acceptanceCriteria.length > 0) {
      formatted += '\n\n## Acceptance Criteria\n\n';
      acceptanceCriteria.forEach((criteria, index) => {
        formatted += `${index + 1}. ${criteria}\n`;
      });
    }

    formatted += '\n\n---\n*Generated by Sentra CLI - The intelligent Claude Code command center*';

    return formatted;
  }

  /**
   * Search tasks
   */
  async searchTasks(query: string, limit: number = 20): Promise<LinearTask[]> {
    if (!await this.isConfigured()) {
      throw new SentraError('Linear integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const graphqlQuery = `
      query SearchIssues($teamId: String!, $filter: IssueFilter, $first: Int) {
        team(id: $teamId) {
          issues(filter: $filter, first: $first) {
            nodes {
              id
              identifier
              title
              description
              state {
                name
              }
              priority
              estimate
              labels {
                nodes {
                  name
                }
              }
              assignee {
                name
              }
              url
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const variables = {
      teamId: this.teamId,
      filter: {
        title: { containsIgnoreCase: query }
      },
      first: limit
    };

    const response = await this.client.post('', {
      query: graphqlQuery,
      variables
    });

    return response.data.data.team.issues.nodes.map((issue: any) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      state: issue.state.name,
      priority: issue.priority,
      estimate: issue.estimate,
      labels: issue.labels.nodes.map((label: any) => label.name),
      assignee: issue.assignee?.name,
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt
    }));
  }

  /**
   * Get integration status
   */
  getStatus(): {
    configured: boolean;
    apiKey: boolean;
    teamId: boolean;
    workspaceId: boolean;
  } {
    return {
      configured: !!(this.apiKey && this.teamId),
      apiKey: !!this.apiKey,
      teamId: !!this.teamId,
      workspaceId: !!this.workspaceId
    };
  }
}