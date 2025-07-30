/**
 * Pushover Integration - Push notifications for real-time updates
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { SentraError } from '../types/index.js';

interface PushNotification {
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'emergency';
  sound?: string;
  url?: string;
  urlTitle?: string;
  device?: string;
  timestamp?: number;
}

interface PushResponse {
  status: number;
  request: string;
  receipt?: string;
  errors?: string[];
}

export class PushoverIntegration {
  private client: AxiosInstance;
  private token: string | undefined;
  private userKey: string | undefined;

  constructor() {
    this.token = process.env.PUSHOVER_TOKEN;
    this.userKey = process.env.PUSHOVER_USER;

    this.client = axios.create({
      baseURL: 'https://api.pushover.net/1',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      logger.debug('Pushover API request', {
        url: config.url,
        method: config.method
      });
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Pushover API request failed', {
          status: error.response?.status,
          message: error.response?.data?.errors || error.message,
          url: error.config?.url
        });
        throw new SentraError(
          `Pushover API request failed: ${error.response?.data?.errors?.[0] || error.message}`,
          'PUSHOVER_REQUEST_FAILED',
          { 
            status: error.response?.status, 
            url: error.config?.url,
            errors: error.response?.data?.errors 
          }
        );
      }
    );
  }

  /**
   * Check if Pushover integration is properly configured
   */
  async isConfigured(): Promise<boolean> {
    if (!this.token || !this.userKey) {
      return false;
    }

    try {
      await this.validateCredentials();
      return true;
    } catch (error) {
      logger.warn('Pushover integration configuration check failed', { error });
      return false;
    }
  }

  /**
   * Validate credentials
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.token || !this.userKey) {
      throw new SentraError('Pushover credentials not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const payload = new URLSearchParams({
      token: this.token,
      user: this.userKey
    });

    const response = await this.client.post('/users/validate.json', payload);
    return response.data.status === 1;
  }

  /**
   * Send push notification
   */
  async sendNotification(notification: PushNotification): Promise<PushResponse> {
    if (!await this.isConfigured()) {
      throw new SentraError('Pushover integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    // Priority mapping
    const priorityMap = {
      low: -1,
      normal: 0,
      high: 1,
      emergency: 2
    };

    const payload = new URLSearchParams({
      token: this.token!,
      user: this.userKey!,
      title: notification.title,
      message: notification.message,
      priority: String(priorityMap[notification.priority || 'normal']),
      ...(notification.sound && { sound: notification.sound }),
      ...(notification.url && { url: notification.url }),
      ...(notification.urlTitle && { url_title: notification.urlTitle }),
      ...(notification.device && { device: notification.device }),
      ...(notification.timestamp && { timestamp: String(notification.timestamp) })
    });

    // Emergency priority requires additional parameters
    if (notification.priority === 'emergency') {
      payload.append('retry', '30'); // Retry every 30 seconds
      payload.append('expire', '300'); // Expire after 5 minutes
    }

    logger.info('Sending push notification via Pushover', {
      title: notification.title,
      messageLength: notification.message.length,
      priority: notification.priority || 'normal'
    });

    const response = await this.client.post('/messages.json', payload);
    const data = response.data;

    const pushResponse: PushResponse = {
      status: data.status,
      request: data.request,
      receipt: data.receipt,
      errors: data.errors
    };

    logger.info('Push notification sent successfully via Pushover', {
      request: pushResponse.request,
      status: pushResponse.status,
      hasReceipt: !!pushResponse.receipt
    });

    return pushResponse;
  }

  /**
   * Send permission request notification
   */
  async sendPermissionRequest(requestId: string, agent: string, command: string, riskLevel: string): Promise<PushResponse> {
    const priorityMap = {
      low: 'normal' as const,
      medium: 'normal' as const,
      high: 'high' as const,
      critical: 'emergency' as const
    };

    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    }[riskLevel as keyof typeof riskEmoji] || '⚪';

    const truncatedCommand = command.length > 100 
      ? command.substring(0, 100) + '...'
      : command;

    return await this.sendNotification({
      title: `${riskEmoji} Sentra Permission Request (${riskLevel.toUpperCase()})`,
      message: `${agent} wants to execute: ${truncatedCommand}`,
      priority: priorityMap[riskLevel as keyof typeof priorityMap] || 'normal',
      sound: riskLevel === 'critical' ? 'siren' : 'pushover'
    });
  }

  /**
   * Send approval confirmation notification
   */
  async sendApprovalConfirmation(requestId: string, approved: boolean, agent: string): Promise<PushResponse> {
    const emoji = approved ? '✅' : '❌';
    const status = approved ? 'Approved' : 'Denied';

    return await this.sendNotification({
      title: `${emoji} Permission ${status}`,
      message: `Request ${requestId} for ${agent} has been ${status.toLowerCase()}`,
      priority: 'normal',
      sound: approved ? 'magic' : 'falling'
    });
  }

  /**
   * Send task completion notification
   */
  async sendTaskNotification(taskTitle: string, agent: string, status: 'completed' | 'failed', duration?: number): Promise<PushResponse> {
    const emoji = status === 'completed' ? '✅' : '❌';
    const statusText = status === 'completed' ? 'Completed' : 'Failed';

    const truncatedTitle = taskTitle.length > 80 
      ? taskTitle.substring(0, 80) + '...'
      : taskTitle;

    let message = `${agent}: ${truncatedTitle}`;
    if (duration && status === 'completed') {
      const durationText = duration < 60000 
        ? `${Math.round(duration / 1000)}s`
        : `${Math.round(duration / 60000)}m`;
      message += `\nDuration: ${durationText}`;
    }

    return await this.sendNotification({
      title: `${emoji} Task ${statusText}`,
      message,
      priority: status === 'failed' ? 'high' : 'normal',
      sound: status === 'completed' ? 'magic' : 'falling'
    });
  }

  /**
   * Send context warning notification
   */
  async sendContextWarning(agent: string, usage: number, limit: number): Promise<PushResponse> {
    return await this.sendNotification({
      title: '⚠️ Context Usage Warning',
      message: `${agent} context usage: ${usage.toFixed(1)}% (limit: ${limit}%)`,
      priority: usage > 90 ? 'high' : 'normal',
      sound: 'falling'
    });
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(reason: string): Promise<PushResponse> {
    return await this.sendNotification({
      title: '🚨 Sentra Emergency Stop',
      message: `All agents stopped: ${reason}`,
      priority: 'emergency',
      sound: 'siren'
    });
  }

  /**
   * Send agent status change notification
   */
  async sendAgentStatusChange(agent: string, previousStatus: string, currentStatus: string): Promise<PushResponse> {
    const statusEmojis = {
      idle: '😴',
      working: '⚡',
      blocked: '⏳',
      error: '💥'
    };

    const emoji = statusEmojis[currentStatus as keyof typeof statusEmojis] || '🤖';

    return await this.sendNotification({
      title: `${emoji} Agent Status Change`,
      message: `${agent}: ${previousStatus} → ${currentStatus}`,
      priority: currentStatus === 'error' ? 'high' : 'normal',
      sound: currentStatus === 'error' ? 'falling' : 'pushover'
    });
  }

  /**
   * Send system metrics notification
   */
  async sendSystemMetrics(metrics: {
    completedTasks: number;
    successRate: number;
    contextEfficiency: number;
    activeAgents: number;
  }): Promise<PushResponse> {
    const message = [
      `Tasks: ${metrics.completedTasks}`,
      `Success: ${metrics.successRate.toFixed(1)}%`,
      `Context Efficiency: ${metrics.contextEfficiency.toFixed(1)}%`,
      `Active Agents: ${metrics.activeAgents}`
    ].join('\n');

    return await this.sendNotification({
      title: '📊 Sentra System Report',
      message,
      priority: 'low',
      sound: 'none'
    });
  }

  /**
   * Get receipt status (for emergency priority messages)
   */
  async getReceiptStatus(receipt: string): Promise<any> {
    if (!await this.isConfigured()) {
      throw new SentraError('Pushover integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const params = new URLSearchParams({
      token: this.token!
    });

    const response = await this.client.get(`/receipts/${receipt}.json?${params}`);
    return response.data;
  }

  /**
   * Cancel emergency notification
   */
  async cancelEmergencyNotification(receipt: string): Promise<void> {
    if (!await this.isConfigured()) {
      throw new SentraError('Pushover integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const payload = new URLSearchParams({
      token: this.token!
    });

    await this.client.post(`/receipts/${receipt}/cancel.json`, payload);

    logger.info('Emergency notification cancelled', { receipt });
  }

  /**
   * Get available sounds
   */
  async getSounds(): Promise<string[]> {
    if (!await this.isConfigured()) {
      throw new SentraError('Pushover integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const params = new URLSearchParams({
      token: this.token!
    });

    const response = await this.client.get(`/sounds.json?${params}`);
    return Object.keys(response.data.sounds);
  }

  /**
   * Test push notification functionality
   */
  async testPushNotification(): Promise<PushResponse> {
    return await this.sendNotification({
      title: '🧪 Sentra Test Notification',
      message: `Test notification sent at ${new Date().toISOString()}. If you received this, push notifications are working correctly.`,
      priority: 'normal',
      sound: 'magic'
    });
  }

  /**
   * Get integration status
   */
  getStatus(): {
    configured: boolean;
    token: boolean;
    userKey: boolean;
  } {
    return {
      configured: !!(this.token && this.userKey),
      token: !!this.token,
      userKey: !!this.userKey
    };
  }

  /**
   * Get masked configuration for display
   */
  getMaskedConfig(): {
    token?: string;
    userKey?: string;
  } {
    return {
      token: this.token ? `***${this.token.slice(-8)}` : undefined,
      userKey: this.userKey ? `***${this.userKey.slice(-8)}` : undefined
    };
  }
}