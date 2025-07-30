/**
 * GitHub Integration - Repository management and CI/CD
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { SentraError } from '../types/index.js';

interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  defaultBranch: string;
  visibility: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreatePRInput {
  title: string;
  body?: string;
  head: string;
  base?: string;
  draft?: boolean;
}

export class GitHubIntegration {
  private client: AxiosInstance;
  private token: string | undefined;
  private owner: string | undefined;
  private defaultBranch: string;

  constructor() {
    this.token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    this.owner = process.env.GITHUB_OWNER || 'barnent1';
    this.defaultBranch = process.env.GITHUB_DEFAULT_BRANCH || 'main';

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Sentra-CLI/0.1.0',
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      logger.debug('GitHub API request', {
        url: config.url,
        method: config.method,
        hasAuth: !!config.headers.Authorization
      });
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('GitHub API request failed', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url
        });
        throw new SentraError(
          `GitHub API request failed: ${error.response?.data?.message || error.message}`,
          'GITHUB_REQUEST_FAILED',
          { 
            status: error.response?.status, 
            url: error.config?.url,
            data: error.response?.data 
          }
        );
      }
    );
  }

  /**
   * Check if GitHub integration is properly configured
   */
  async isConfigured(): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      logger.warn('GitHub integration configuration check failed', { error });
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<any> {
    const response = await this.client.get('/user');
    return response.data;
  }

  /**
   * Get repository information
   */
  async getRepository(repo: string): Promise<GitHubRepository> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const response = await this.client.get(`/repos/${this.owner}/${repo}`);
    const data = response.data;

    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      url: data.html_url,
      defaultBranch: data.default_branch,
      visibility: data.visibility,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Create a new repository
   */
  async createRepository(name: string, options: {
    description?: string;
    private?: boolean;
    autoInit?: boolean;
    gitignoreTemplate?: string;
    licenseTemplate?: string;
  } = {}): Promise<GitHubRepository> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const payload = {
      name,
      description: options.description,
      private: options.private || false,
      auto_init: options.autoInit || true,
      gitignore_template: options.gitignoreTemplate,
      license_template: options.licenseTemplate
    };

    logger.info('Creating GitHub repository', {
      name,
      private: payload.private,
      autoInit: payload.auto_init
    });

    const response = await this.client.post('/user/repos', payload);
    const data = response.data;

    const repository: GitHubRepository = {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      url: data.html_url,
      defaultBranch: data.default_branch,
      visibility: data.visibility,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    logger.info('GitHub repository created successfully', {
      name: repository.name,
      url: repository.url
    });

    return repository;
  }

  /**
   * Create a pull request
   */
  async createPullRequest(repo: string, input: CreatePRInput): Promise<GitHubPullRequest> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const payload = {
      title: input.title,
      body: input.body || '',
      head: input.head,
      base: input.base || this.defaultBranch,
      draft: input.draft || false
    };

    logger.info('Creating GitHub pull request', {
      repo,
      title: input.title,
      head: input.head,
      base: payload.base
    });

    const response = await this.client.post(`/repos/${this.owner}/${repo}/pulls`, payload);
    const data = response.data;

    const pullRequest: GitHubPullRequest = {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      url: data.html_url,
      head: {
        ref: data.head.ref,
        sha: data.head.sha
      },
      base: {
        ref: data.base.ref,
        sha: data.base.sha
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    logger.info('GitHub pull request created successfully', {
      number: pullRequest.number,
      url: pullRequest.url
    });

    return pullRequest;
  }

  /**
   * Get pull request status
   */
  async getPullRequest(repo: string, number: number): Promise<GitHubPullRequest> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const response = await this.client.get(`/repos/${this.owner}/${repo}/pulls/${number}`);
    const data = response.data;

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      url: data.html_url,
      head: {
        ref: data.head.ref,
        sha: data.head.sha
      },
      base: {
        ref: data.base.ref,
        sha: data.base.sha
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Merge pull request
   */
  async mergePullRequest(repo: string, number: number, options: {
    commitTitle?: string;
    commitMessage?: string;
    mergeMethod?: 'merge' | 'squash' | 'rebase';
  } = {}): Promise<void> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const payload = {
      commit_title: options.commitTitle,
      commit_message: options.commitMessage,
      merge_method: options.mergeMethod || 'merge'
    };

    await this.client.put(`/repos/${this.owner}/${repo}/pulls/${number}/merge`, payload);

    logger.info('GitHub pull request merged successfully', {
      repo,
      number,
      mergeMethod: payload.merge_method
    });
  }

  /**
   * Get workflow runs
   */
  async getWorkflowRuns(repo: string, workflowId?: string): Promise<any[]> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const url = workflowId 
      ? `/repos/${this.owner}/${repo}/actions/workflows/${workflowId}/runs`
      : `/repos/${this.owner}/${repo}/actions/runs`;

    const response = await this.client.get(url);
    return response.data.workflow_runs;
  }

  /**
   * Trigger workflow
   */
  async triggerWorkflow(repo: string, workflowId: string, ref: string = 'main', inputs: Record<string, any> = {}): Promise<void> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const payload = {
      ref,
      inputs
    };

    await this.client.post(`/repos/${this.owner}/${repo}/actions/workflows/${workflowId}/dispatches`, payload);

    logger.info('GitHub workflow triggered', {
      repo,
      workflowId,
      ref,
      inputs
    });
  }

  /**
   * Create or update file
   */
  async createOrUpdateFile(repo: string, path: string, content: string, message: string, branch?: string): Promise<void> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    // Check if file exists
    let sha: string | undefined;
    try {
      const response = await this.client.get(`/repos/${this.owner}/${repo}/contents/${path}`, {
        params: { ref: branch || this.defaultBranch }
      });
      sha = response.data.sha;
    } catch (error) {
      // File doesn't exist, which is fine for create operation
    }

    const payload = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch: branch || this.defaultBranch,
      ...(sha && { sha })
    };

    await this.client.put(`/repos/${this.owner}/${repo}/contents/${path}`, payload);

    logger.info('GitHub file updated', {
      repo,
      path,
      branch: payload.branch,
      operation: sha ? 'update' : 'create'
    });
  }

  /**
   * Get file content
   */
  async getFileContent(repo: string, path: string, ref?: string): Promise<string> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const response = await this.client.get(`/repos/${this.owner}/${repo}/contents/${path}`, {
      params: { ref: ref || this.defaultBranch }
    });

    return Buffer.from(response.data.content, 'base64').toString('utf-8');
  }

  /**
   * Create release
   */
  async createRelease(repo: string, options: {
    tagName: string;
    name?: string;
    body?: string;
    draft?: boolean;
    prerelease?: boolean;
    targetCommitish?: string;
  }): Promise<any> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const payload = {
      tag_name: options.tagName,
      name: options.name || options.tagName,
      body: options.body || '',
      draft: options.draft || false,
      prerelease: options.prerelease || false,
      target_commitish: options.targetCommitish || this.defaultBranch
    };

    const response = await this.client.post(`/repos/${this.owner}/${repo}/releases`, payload);

    logger.info('GitHub release created', {
      repo,
      tagName: options.tagName,
      url: response.data.html_url
    });

    return response.data;
  }

  /**
   * List repositories
   */
  async listRepositories(): Promise<GitHubRepository[]> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const response = await this.client.get('/user/repos', {
      params: {
        per_page: 100,
        sort: 'updated'
      }
    });

    return response.data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      visibility: repo.visibility,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at
    }));
  }

  /**
   * Get commit status
   */
  async getCommitStatus(repo: string, sha: string): Promise<any> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const response = await this.client.get(`/repos/${this.owner}/${repo}/commits/${sha}/status`);
    return response.data;
  }

  /**
   * Create commit status
   */
  async createCommitStatus(repo: string, sha: string, status: {
    state: 'pending' | 'success' | 'error' | 'failure';
    targetUrl?: string;
    description?: string;
    context?: string;
  }): Promise<void> {
    if (!await this.isConfigured()) {
      throw new SentraError('GitHub integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const payload = {
      state: status.state,
      target_url: status.targetUrl,
      description: status.description,
      context: status.context || 'sentra-cli'
    };

    await this.client.post(`/repos/${this.owner}/${repo}/statuses/${sha}`, payload);

    logger.info('GitHub commit status created', {
      repo,
      sha: sha.substring(0, 8),
      state: status.state,
      context: payload.context
    });
  }

  /**
   * Get integration status
   */
  getStatus(): {
    configured: boolean;
    token: boolean;
    owner: boolean;
  } {
    return {
      configured: !!(this.token && this.owner),
      token: !!this.token,
      owner: !!this.owner
    };
  }
}