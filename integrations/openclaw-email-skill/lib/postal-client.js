/**
 * Postal API Client for OpenClaw
 * Direct integration with Postal HTTP API
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PostalClient {
  constructor(config) {
    if (!config || !config.serverUrl || !config.apiKey) {
      throw new Error('Invalid config: serverUrl and apiKey required');
    }
    
    this.config = config;
    this.client = axios.create({
      baseURL: `${config.serverUrl}/api/v1`,
      headers: {
        'X-Server-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Send an email
   */
  async send(options) {
    const {
      to,
      subject,
      body,
      html,
      from,
      cc,
      bcc,
      replyTo,
      attachments,
    } = options;

    // Normalize to arrays
    const toArray = Array.isArray(to) ? to : [to];
    const fromEmail = from || this.config.fromEmail;

    const payload = {
      to: toArray,
      from: fromEmail,
      subject,
      ...(html ? { html_body: html, plain_body: body } : { plain_body: body }),
      ...(cc && { cc: Array.isArray(cc) ? cc : [cc] }),
      ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
      ...(replyTo && { reply_to: replyTo }),
      ...(attachments && { attachments }),
    };

    try {
      const response = await this.client.post('/send/message', payload);
      
      return {
        success: true,
        messageId: response.data.data.message_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this._handleError(error);
    }
  }

  /**
   * Read inbox (placeholder - requires Postal inbox API)
   */
  async inbox(options = {}) {
    // Note: Postal's API for reading messages may vary by implementation
    // This is a placeholder that demonstrates the expected interface
    try {
      // In a real implementation, this would call Postal's message listing API
      // For now, return empty array with success
      return {
        success: true,
        messages: [],
        count: 0,
      };
    } catch (error) {
      return this._handleError(error);
    }
  }

  /**
   * Read a specific message
   */
  async read(messageId) {
    try {
      const response = await this.client.post(`/messages/message?id=${messageId}`, {
        expansions: ['details', 'inspection'],
      });

      const data = response.data.data;

      return {
        success: true,
        message: {
          id: data.id,
          from: data.mail_from,
          to: data.rcpt_to,
          subject: data.subject,
          body: data.plain_body,
          htmlBody: data.html_body,
          receivedAt: data.timestamp,
          attachments: data.attachments || [],
        },
      };
    } catch (error) {
      return this._handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  _handleError(error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      let errorCode = 'NETWORK_ERROR';
      let errorMessage = error.message;

      if (status === 401 || status === 403) {
        errorCode = 'AUTH_FAILED';
        errorMessage = 'Invalid API key or insufficient permissions';
      } else if (status === 404) {
        errorCode = 'NOT_FOUND';
        errorMessage = 'Resource not found';
      } else if (status === 429) {
        errorCode = 'RATE_LIMIT';
        errorMessage = 'Rate limit exceeded';
      }

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: data,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message,
      },
    };
  }
}

/**
 * Load config from file
 */
function loadConfig() {
  const configPath = path.join(__dirname, '..', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}\nCopy config.example.json to config.json and update with your credentials.`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  if (!config.postal || !config.postal.serverUrl || !config.postal.apiKey) {
    throw new Error('Invalid config: postal.serverUrl and postal.apiKey required');
  }

  return config.postal;
}

module.exports = { PostalClient, loadConfig };
