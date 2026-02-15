import Table from 'cli-table3';
import chalk from 'chalk';
import { MessageDetails } from './postal-client';

/**
 * Output formatting utilities
 */
export class Formatter {
  private jsonMode: boolean;

  constructor(jsonMode: boolean = false) {
    this.jsonMode = jsonMode;
  }

  /**
   * Output data in appropriate format (JSON or human-readable)
   */
  output(data: any): void {
    if (this.jsonMode) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      // For non-JSON mode, data should already be formatted
      console.log(data);
    }
  }

  /**
   * Format success message
   */
  success(message: string): string {
    if (this.jsonMode) {
      return JSON.stringify({ status: 'success', message });
    }
    return chalk.green('✓') + ' ' + message;
  }

  /**
   * Format error message
   */
  error(message: string): string {
    if (this.jsonMode) {
      return JSON.stringify({ status: 'error', message });
    }
    return chalk.red('✗') + ' ' + message;
  }

  /**
   * Format send message response
   */
  formatSendResponse(data: { message_id: string; messages: any }): string | object {
    if (this.jsonMode) {
      return data;
    }

    const recipientCount = Object.keys(data.messages).length;
    return (
      chalk.green('✓') +
      ` Message sent successfully\n` +
      `  Message ID: ${chalk.cyan(data.message_id)}\n` +
      `  Recipients: ${recipientCount}`
    );
  }

  /**
   * Format inbox list (stub for now - would need actual inbox API)
   */
  formatInboxList(messages: MessageDetails[]): string | object {
    if (this.jsonMode) {
      return messages;
    }

    if (messages.length === 0) {
      return chalk.yellow('No messages found');
    }

    const table = new Table({
      head: [
        chalk.bold('ID'),
        chalk.bold('From'),
        chalk.bold('Subject'),
        chalk.bold('Date'),
        chalk.bold('Status'),
      ],
      colWidths: [20, 30, 40, 20, 15],
      wordWrap: true,
    });

    for (const msg of messages) {
      const date = msg.details?.timestamp
        ? new Date(msg.details.timestamp * 1000).toLocaleString()
        : 'Unknown';

      table.push([
        msg.details?.message_id || msg.id.toString(),
        msg.details?.mail_from || 'Unknown',
        msg.details?.subject || '(no subject)',
        date,
        msg.status?.status || 'Unknown',
      ]);
    }

    return table.toString();
  }

  /**
   * Format single message for reading
   */
  formatMessage(message: MessageDetails): string | object {
    if (this.jsonMode) {
      return message;
    }

    const lines: string[] = [];

    lines.push(chalk.bold.underline('Message Details'));
    lines.push('');

    if (message.details) {
      lines.push(`${chalk.bold('Message ID:')} ${message.details.message_id}`);
      lines.push(`${chalk.bold('From:')} ${message.details.mail_from}`);
      lines.push(`${chalk.bold('To:')} ${message.details.rcpt_to}`);
      lines.push(`${chalk.bold('Subject:')} ${message.details.subject}`);
      lines.push(
        `${chalk.bold('Date:')} ${new Date(message.details.timestamp * 1000).toLocaleString()}`
      );
      lines.push(`${chalk.bold('Size:')} ${this.formatBytes(message.details.size)}`);

      if (message.details.tag) {
        lines.push(`${chalk.bold('Tag:')} ${message.details.tag}`);
      }
    }

    if (message.status) {
      lines.push('');
      lines.push(chalk.bold('Status:'));
      lines.push(`  ${message.status.status}`);
      if (message.status.held) {
        lines.push(`  ${chalk.yellow('(held)')}`);
      }
    }

    if (message.inspection) {
      lines.push('');
      lines.push(chalk.bold('Inspection:'));
      if (message.inspection.spam) {
        lines.push(
          `  ${chalk.red('SPAM')} (score: ${message.inspection.spam_score})`
        );
      }
      if (message.inspection.threat) {
        lines.push(
          `  ${chalk.red('THREAT')}: ${message.inspection.threat_details}`
        );
      }
      if (!message.inspection.spam && !message.inspection.threat) {
        lines.push(`  ${chalk.green('Clean')}`);
      }
    }

    if (message.plain_body) {
      lines.push('');
      lines.push(chalk.bold('Body:'));
      lines.push('─'.repeat(60));
      lines.push(message.plain_body);
      lines.push('─'.repeat(60));
    }

    if (message.attachments && message.attachments.length > 0) {
      lines.push('');
      lines.push(chalk.bold('Attachments:'));
      for (const att of message.attachments) {
        lines.push(
          `  • ${att.filename} (${att.content_type}, ${this.formatBytes(att.size)})`
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * Format bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
