/**
 * Twilio Integration - SMS notifications for approval workflows
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { SentraError } from '../types/index.js';

interface SMSMessage {
  to: string;
  from: string;
  body: string;
}

interface SMSResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  dateCreated: string;
  dateSent?: string;
  errorCode?: string;
  errorMessage?: string;
}

export class TwilioIntegration {
  private client: AxiosInstance;
  private accountSid: string | undefined;
  private authToken: string | undefined;
  private fromNumber: string | undefined;
  private toNumber: string | undefined;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    this.toNumber = process.env.TWILIO_NOTIFICATION_NUMBER;

    if (this.accountSid && this.authToken) {
      this.client = axios.create({
        baseURL: `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`,
        auth: {
          username: this.accountSid,
          password: this.authToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      });

      // Request interceptor for logging
      this.client.interceptors.request.use((config) => {
        logger.debug('Twilio API request', {
          url: config.url,
          method: config.method,
          hasAuth: !!config.auth
        });
        return config;
      });

      // Response interceptor for error handling
      this.client.interceptors.response.use(
        (response) => response,
        (error) => {
          logger.error('Twilio API request failed', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            code: error.response?.data?.code,
            url: error.config?.url
          });
          throw new SentraError(
            `Twilio API request failed: ${error.response?.data?.message || error.message}`,
            'TWILIO_REQUEST_FAILED',
            { 
              status: error.response?.status, 
              code: error.response?.data?.code,
              url: error.config?.url,
              data: error.response?.data 
            }
          );
        }
      );
    } else {
      // Create a dummy client for non-configured instances
      this.client = axios.create();
    }
  }

  /**
   * Check if Twilio integration is properly configured
   */
  async isConfigured(): Promise<boolean> {
    if (!this.accountSid || !this.authToken || !this.fromNumber || !this.toNumber) {
      return false;
    }

    try {
      await this.getAccountInfo();
      return true;
    } catch (error) {
      logger.warn('Twilio integration configuration check failed', { error });
      return false;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<any> {
    if (!this.accountSid || !this.authToken) {
      throw new SentraError('Twilio credentials not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const response = await this.client.get('.json');
    return response.data;
  }

  /**
   * Send SMS message
   */
  async sendSMS(message: string, toNumber?: string): Promise<SMSResponse> {
    if (!await this.isConfigured()) {
      throw new SentraError('Twilio integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const to = toNumber || this.toNumber;
    const from = this.fromNumber;

    if (!to) {
      throw new SentraError('No recipient phone number provided', 'MISSING_RECIPIENT');
    }

    if (!from) {
      throw new SentraError('No sender phone number configured', 'MISSING_SENDER');
    }

    // Ensure phone numbers are in E.164 format
    const formattedTo = this.formatPhoneNumber(to);
    const formattedFrom = this.formatPhoneNumber(from);

    const payload = new URLSearchParams({
      To: formattedTo,
      From: formattedFrom,
      Body: message
    });

    logger.info('Sending SMS via Twilio', {
      to: this.maskPhoneNumber(formattedTo),
      from: this.maskPhoneNumber(formattedFrom),
      messageLength: message.length
    });

    const response = await this.client.post('/Messages.json', payload);
    const data = response.data;

    const smsResponse: SMSResponse = {
      sid: data.sid,
      status: data.status,
      to: data.to,
      from: data.from,
      body: data.body,
      dateCreated: data.date_created,
      dateSent: data.date_sent,
      errorCode: data.error_code,
      errorMessage: data.error_message
    };

    logger.info('SMS sent successfully via Twilio', {
      sid: smsResponse.sid,
      status: smsResponse.status,
      to: this.maskPhoneNumber(smsResponse.to)
    });

    return smsResponse;
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageSid: string): Promise<SMSResponse> {
    if (!await this.isConfigured()) {
      throw new SentraError('Twilio integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const response = await this.client.get(`/Messages/${messageSid}.json`);
    const data = response.data;

    return {
      sid: data.sid,
      status: data.status,
      to: data.to,
      from: data.from,
      body: data.body,
      dateCreated: data.date_created,
      dateSent: data.date_sent,
      errorCode: data.error_code,
      errorMessage: data.error_message
    };
  }

  /**
   * List recent messages
   */
  async listMessages(limit: number = 20): Promise<SMSResponse[]> {
    if (!await this.isConfigured()) {
      throw new SentraError('Twilio integration not configured', 'INTEGRATION_NOT_CONFIGURED');
    }

    const response = await this.client.get('/Messages.json', {
      params: { PageSize: limit }
    });

    return response.data.messages.map((msg: any) => ({
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
      body: msg.body,
      dateCreated: msg.date_created,
      dateSent: msg.date_sent,
      errorCode: msg.error_code,
      errorMessage: msg.error_message
    }));
  }

  /**
   * Send permission request SMS
   */
  async sendPermissionRequest(requestId: string, agent: string, command: string, riskLevel: string): Promise<SMSResponse> {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    }[riskLevel as keyof typeof riskEmoji] || '⚪';

    const truncatedCommand = command.length > 80 
      ? command.substring(0, 80) + '...'
      : command;

    const message = [
      `${riskEmoji} SENTRA PERMISSION REQUEST`,
      '',
      `Agent: ${agent}`,
      `Risk: ${riskLevel.toUpperCase()}`,
      `Command: ${truncatedCommand}`,
      '',
      'Reply with:',
      `APPROVE ${requestId} - to approve`,
      `DENY ${requestId} - to deny`,
      '',
      'Expires in 5 minutes'
    ].join('\n');

    return await this.sendSMS(message);
  }

  /**
   * Send approval confirmation SMS
   */
  async sendApprovalConfirmation(requestId: string, approved: boolean, agent: string): Promise<SMSResponse> {
    const emoji = approved ? '✅' : '❌';
    const status = approved ? 'APPROVED' : 'DENIED';

    const message = [
      `${emoji} SENTRA PERMISSION ${status}`,
      '',
      `Request: ${requestId}`,
      `Agent: ${agent}`,
      '',
      '🤖 Sentra CLI'
    ].join('\n');

    return await this.sendSMS(message);
  }

  /**
   * Send task completion notification
   */
  async sendTaskNotification(taskTitle: string, agent: string, status: 'completed' | 'failed'): Promise<SMSResponse> {
    const emoji = status === 'completed' ? '✅' : '❌';
    const statusText = status === 'completed' ? 'COMPLETED' : 'FAILED';

    const truncatedTitle = taskTitle.length > 60 
      ? taskTitle.substring(0, 60) + '...'
      : taskTitle;

    const message = [
      `${emoji} SENTRA TASK ${statusText}`,
      '',
      `Task: ${truncatedTitle}`,
      `Agent: ${agent}`,
      '',
      '🤖 Sentra CLI'
    ].join('\n');

    return await this.sendSMS(message);
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(reason: string): Promise<SMSResponse> {
    const message = [
      '🚨 SENTRA EMERGENCY STOP',
      '',
      `Reason: ${reason}`,
      `Time: ${new Date().toISOString()}`,
      '',
      'All agents have been stopped.',
      '',
      '🤖 Sentra CLI'
    ].join('\n');

    return await this.sendSMS(message);
  }

  /**
   * Validate phone number format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 1 and has 11 digits, it's already in E.164 format for US
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // If it has 10 digits, assume US number and add country code
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it already starts with +, assume it's already formatted
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // For other cases, add + prefix
    return `+${digits}`;
  }

  /**
   * Mask phone number for logging (show only last 4 digits)
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 4) {
      return '****';
    }
    
    const lastFour = phoneNumber.slice(-4);
    const masked = '*'.repeat(phoneNumber.length - 4);
    return masked + lastFour;
  }

  /**
   * Test SMS functionality
   */
  async testSMS(): Promise<SMSResponse> {
    const testMessage = [
      '🧪 SENTRA TEST MESSAGE',
      '',
      'This is a test message from Sentra CLI.',
      `Time: ${new Date().toISOString()}`,
      '',
      'If you received this, SMS integration is working correctly.',
      '',
      '🤖 Sentra CLI'
    ].join('\n');

    return await this.sendSMS(testMessage);
  }

  /**
   * Get integration status
   */
  getStatus(): {
    configured: boolean;
    accountSid: boolean;
    authToken: boolean;
    fromNumber: boolean;
    toNumber: boolean;
  } {
    return {
      configured: !!(this.accountSid && this.authToken && this.fromNumber && this.toNumber),
      accountSid: !!this.accountSid,
      authToken: !!this.authToken,
      fromNumber: !!this.fromNumber,
      toNumber: !!this.toNumber
    };
  }

  /**
   * Get masked configuration for display
   */
  getMaskedConfig(): {
    accountSid?: string;
    fromNumber?: string;
    toNumber?: string;
  } {
    return {
      accountSid: this.accountSid ? `***${this.accountSid.slice(-8)}` : undefined,
      fromNumber: this.fromNumber ? this.maskPhoneNumber(this.fromNumber) : undefined,
      toNumber: this.toNumber ? this.maskPhoneNumber(this.toNumber) : undefined
    };
  }
}