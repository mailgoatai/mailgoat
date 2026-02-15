/**
 * MailGoat Notification Bot
 * Production-ready system monitoring with email alerts
 */

import { config } from 'dotenv';
import { PostalClient } from './postal-client.js';
import { collectMetrics, checkThresholds, generateAlertEmail, AlertThresholds } from './monitors.js';
import { logger } from './logger.js';

// Load environment variables
config();

// Configuration
const POSTAL_SERVER_URL = process.env.POSTAL_SERVER_URL || 'https://postal.example.com';
const POSTAL_API_KEY = process.env.POSTAL_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'monitor@example.com';
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'admin@example.com';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || '60000', 10); // 1 minute default

// Alert thresholds (percentage)
const thresholds: AlertThresholds = {
  cpu: parseInt(process.env.THRESHOLD_CPU || '80', 10),
  memory: parseInt(process.env.THRESHOLD_MEMORY || '85', 10),
  disk: parseInt(process.env.THRESHOLD_DISK || '90', 10),
  temperature: process.env.THRESHOLD_TEMP ? parseInt(process.env.THRESHOLD_TEMP, 10) : undefined,
};

// Alert cooldown to prevent spam (5 minutes default)
const ALERT_COOLDOWN_MS = parseInt(process.env.ALERT_COOLDOWN_MS || '300000', 10);
const lastAlertTime = new Map<string, number>();

/**
 * Main monitoring loop
 */
async function monitoringLoop(postalClient: PostalClient): Promise<void> {
  try {
    logger.info('Collecting system metrics...');
    const metrics = await collectMetrics();
    
    logger.debug('Metrics collected', {
      cpu: metrics.cpu.usage,
      memory: metrics.memory.percentUsed,
      disk: metrics.disk.percentUsed,
    });

    // Check thresholds
    const alerts = checkThresholds(metrics, thresholds);

    if (alerts.length > 0) {
      logger.warn(`${alerts.length} threshold(s) exceeded`, { alerts });

      // Check cooldown for each alert type
      const alertsToSend = alerts.filter(alert => {
        const lastAlert = lastAlertTime.get(alert.type) || 0;
        const now = Date.now();
        const shouldSend = now - lastAlert > ALERT_COOLDOWN_MS;
        
        if (shouldSend) {
          lastAlertTime.set(alert.type, now);
        } else {
          logger.debug(`Alert for ${alert.type} in cooldown, skipping`);
        }
        
        return shouldSend;
      });

      if (alertsToSend.length > 0) {
        // Generate and send alert email
        const { subject, html, plain } = generateAlertEmail(metrics, alertsToSend);
        
        logger.info(`Sending alert email to ${ALERT_EMAIL}`);
        
        try {
          const messageId = await postalClient.sendHtmlEmail(
            ALERT_EMAIL,
            subject,
            html,
            plain
          );
          
          logger.info(`Alert email sent successfully`, { messageId });
        } catch (error) {
          logger.error('Failed to send alert email', { error });
        }
      }
    } else {
      logger.info('All metrics within thresholds ✓');
    }
  } catch (error) {
    logger.error('Error in monitoring loop', { error });
  }
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  logger.info('Starting MailGoat Notification Bot');
  logger.info('Configuration:', {
    postalServer: POSTAL_SERVER_URL,
    fromEmail: FROM_EMAIL,
    alertEmail: ALERT_EMAIL,
    checkInterval: `${CHECK_INTERVAL}ms`,
    thresholds,
  });

  // Validate configuration
  if (!POSTAL_API_KEY) {
    logger.error('POSTAL_API_KEY environment variable is required');
    process.exit(1);
  }

  // Initialize Postal client
  const postalClient = new PostalClient({
    serverUrl: POSTAL_SERVER_URL,
    apiKey: POSTAL_API_KEY,
    fromEmail: FROM_EMAIL,
  });

  // Health check
  logger.info('Performing Postal health check...');
  const isHealthy = await postalClient.healthCheck();
  
  if (!isHealthy) {
    logger.error('Postal health check failed. Check your configuration.');
    process.exit(1);
  }
  
  logger.info('Postal connection OK ✓');

  // Send startup notification
  try {
    await postalClient.sendSimpleEmail(
      ALERT_EMAIL,
      '✅ Notification Bot Started',
      `MailGoat Notification Bot has started successfully.

Server: ${process.env.HOSTNAME || 'unknown'}
Check Interval: ${CHECK_INTERVAL}ms
Thresholds: CPU ${thresholds.cpu}%, Memory ${thresholds.memory}%, Disk ${thresholds.disk}%

Monitoring will begin now.`
    );
    logger.info('Startup notification sent');
  } catch (error) {
    logger.warn('Failed to send startup notification', { error });
  }

  // Start monitoring loop
  logger.info('Starting monitoring loop...');
  
  // Run immediately, then on interval
  await monitoringLoop(postalClient);
  
  const intervalId = setInterval(() => {
    monitoringLoop(postalClient).catch(err => {
      logger.error('Unhandled error in monitoring loop', { err });
    });
  }, CHECK_INTERVAL);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    clearInterval(intervalId);
    
    try {
      await postalClient.sendSimpleEmail(
        ALERT_EMAIL,
        '⚠️ Notification Bot Stopped',
        `MailGoat Notification Bot has been stopped.

Server: ${process.env.HOSTNAME || 'unknown'}
Reason: ${signal}

Monitoring has ceased.`
      );
    } catch (error) {
      logger.warn('Failed to send shutdown notification', { error });
    }
    
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Run the bot
main().catch(error => {
  logger.error('Fatal error', { error });
  process.exit(1);
});
