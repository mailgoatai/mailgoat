/**
 * System monitoring modules
 */

import * as si from 'systeminformation';
import { logger } from './logger.js';

export interface SystemMetrics {
  cpu: {
    usage: number;
    load: number[];
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentUsed: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentUsed: number;
  };
  network?: {
    rx: number;
    tx: number;
  };
  timestamp: Date;
}

export interface AlertThresholds {
  cpu: number;
  memory: number;
  disk: number;
  temperature?: number;
}

/**
 * Collect system metrics
 */
export async function collectMetrics(): Promise<SystemMetrics> {
  try {
    const [cpuLoad, mem, disk, currentLoad, cpuTemp] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      si.cpuTemperature().catch(() => null), // Temperature may not be available
    ]);

    // Get total disk usage across all filesystems
    const totalDisk = disk.reduce((acc, d) => ({
      size: acc.size + d.size,
      used: acc.used + d.used,
      available: acc.available + d.available,
    }), { size: 0, used: 0, available: 0 });

    return {
      cpu: {
        usage: Math.round(currentLoad.currentLoad),
        load: cpuLoad.avgLoad,
        temperature: cpuTemp?.main || undefined,
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        percentUsed: Math.round((mem.used / mem.total) * 100),
      },
      disk: {
        total: totalDisk.size,
        used: totalDisk.used,
        free: totalDisk.available,
        percentUsed: Math.round((totalDisk.used / totalDisk.size) * 100),
      },
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Failed to collect metrics:', error);
    throw error;
  }
}

/**
 * Check if metrics exceed thresholds
 */
export function checkThresholds(
  metrics: SystemMetrics,
  thresholds: AlertThresholds
): Array<{ type: string; message: string; value: number; threshold: number }> {
  const alerts: Array<{ type: string; message: string; value: number; threshold: number }> = [];

  // CPU check
  if (metrics.cpu.usage > thresholds.cpu) {
    alerts.push({
      type: 'cpu',
      message: `CPU usage at ${metrics.cpu.usage}%`,
      value: metrics.cpu.usage,
      threshold: thresholds.cpu,
    });
  }

  // Memory check
  if (metrics.memory.percentUsed > thresholds.memory) {
    alerts.push({
      type: 'memory',
      message: `Memory usage at ${metrics.memory.percentUsed}%`,
      value: metrics.memory.percentUsed,
      threshold: thresholds.memory,
    });
  }

  // Disk check
  if (metrics.disk.percentUsed > thresholds.disk) {
    alerts.push({
      type: 'disk',
      message: `Disk usage at ${metrics.disk.percentUsed}%`,
      value: metrics.disk.percentUsed,
      threshold: thresholds.disk,
    });
  }

  // Temperature check (if available and threshold set)
  if (
    thresholds.temperature &&
    metrics.cpu.temperature &&
    metrics.cpu.temperature > thresholds.temperature
  ) {
    alerts.push({
      type: 'temperature',
      message: `CPU temperature at ${metrics.cpu.temperature}°C`,
      value: metrics.cpu.temperature,
      threshold: thresholds.temperature,
    });
  }

  return alerts;
}

/**
 * Format metrics for human-readable display
 */
export function formatMetrics(metrics: SystemMetrics): string {
  const formatBytes = (bytes: number): string => {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(2)} GB`;
  };

  return `
System Metrics - ${metrics.timestamp.toISOString()}

CPU:
  Usage: ${metrics.cpu.usage}%
  Load Average: ${metrics.cpu.load.map(l => l.toFixed(2)).join(', ')}
  ${metrics.cpu.temperature ? `Temperature: ${metrics.cpu.temperature}°C` : ''}

Memory:
  Used: ${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)} (${metrics.memory.percentUsed}%)
  Free: ${formatBytes(metrics.memory.free)}

Disk:
  Used: ${formatBytes(metrics.disk.used)} / ${formatBytes(metrics.disk.total)} (${metrics.disk.percentUsed}%)
  Free: ${formatBytes(metrics.disk.free)}
`.trim();
}

/**
 * Generate HTML email for alert
 */
export function generateAlertEmail(
  metrics: SystemMetrics,
  alerts: Array<{ type: string; message: string; value: number; threshold: number }>
): { subject: string; html: string; plain: string } {
  const hostname = process.env.HOSTNAME || 'unknown';
  const severity = alerts.length > 2 ? 'CRITICAL' : 'WARNING';
  
  const alertList = alerts.map(a => 
    `<li><strong>${a.type.toUpperCase()}:</strong> ${a.message} (threshold: ${a.threshold}%)</li>`
  ).join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: ${severity === 'CRITICAL' ? '#d32f2f' : '#ff9800'}; color: white; padding: 20px; }
    .content { padding: 20px; }
    .alert-box { background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 15px 0; }
    .metrics { background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; }
    .footer { padding: 20px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 ${severity} Alert: ${hostname}</h1>
    <p>System threshold exceeded</p>
  </div>
  
  <div class="content">
    <div class="alert-box">
      <h2>Alerts Triggered:</h2>
      <ul>
        ${alertList}
      </ul>
    </div>
    
    <h2>Current System Metrics:</h2>
    <div class="metrics">
      <pre>${formatMetrics(metrics)}</pre>
    </div>
    
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p><strong>Server:</strong> ${hostname}</p>
  </div>
  
  <div class="footer">
    <p>This is an automated alert from MailGoat Notification Bot</p>
    <p>To stop receiving these alerts, update your configuration</p>
  </div>
</body>
</html>
`.trim();

  const plain = `
${severity} ALERT: ${hostname}

Alerts Triggered:
${alerts.map(a => `- ${a.type.toUpperCase()}: ${a.message} (threshold: ${a.threshold}%)`).join('\n')}

Current System Metrics:
${formatMetrics(metrics)}

Timestamp: ${new Date().toISOString()}
Server: ${hostname}

--
This is an automated alert from MailGoat Notification Bot
`.trim();

  return {
    subject: `[${severity}] System Alert: ${hostname} - ${alerts.map(a => a.type).join(', ')}`,
    html,
    plain,
  };
}
