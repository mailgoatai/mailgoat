#!/usr/bin/env node
/**
 * OpenClaw Integration Example
 * 
 * Shows how OpenClaw agents can use MailGoat within their workflows.
 * Demonstrates exec tool usage, error handling, and JSON parsing.
 * 
 * USE CASES:
 * - OpenClaw agent email capabilities
 * - Task automation via email
 * - Email-based triggers
 * - Integration with other OpenClaw tools
 * 
 * PREREQUISITES:
 * - OpenClaw installed and running
 * - MailGoat CLI installed and configured
 * - Node.js v14+
 * 
 * USAGE:
 *   node openclaw-integration.js
 * 
 * INTEGRATION WITH OPENCLAW:
 * 
 * This example can be called from OpenClaw agents using the `exec` tool:
 * 
 * ```javascript
 * // In your OpenClaw agent:
 * await exec({
 *   command: 'node /path/to/openclaw-integration.js'
 * });
 * ```
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  mailgoatCommand: 'mailgoat',
  defaultTimeout: 30000, // 30 seconds
};

/**
 * Execute MailGoat CLI command
 * @param {string} command - MailGoat command to execute
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} - Parsed result
 */
async function execMailgoat(command, timeout = CONFIG.defaultTimeout) {
  try {
    const { stdout, stderr } = await execAsync(
      `${CONFIG.mailgoatCommand} ${command}`,
      { timeout }
    );
    
    // Check for errors in stderr
    if (stderr) {
      console.warn('Warning:', stderr);
    }
    
    return {
      success: true,
      output: stdout.trim(),
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error.message,
    };
  }
}

/**
 * Send an email via MailGoat
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Send result
 */
async function sendEmail({ to, subject, body, from = null, cc = null, bcc = null, priority = 'normal' }) {
  // Validate required fields
  if (!to || !subject || !body) {
    return {
      success: false,
      error: 'Missing required fields: to, subject, body',
    };
  }
  
  // Build command
  let command = `send --to "${to}" --subject "${subject}" --body "${body}"`;
  
  if (from) command += ` --from "${from}"`;
  if (cc) command += ` --cc "${cc}"`;
  if (bcc) command += ` --bcc "${bcc}"`;
  if (priority !== 'normal') command += ` --priority "${priority}"`;
  
  // Add JSON flag for structured output
  command += ' --json';
  
  console.log('📤 Sending email...');
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  
  const result = await execMailgoat(command);
  
  if (result.success) {
    try {
      const data = JSON.parse(result.output);
      console.log('✓ Email sent successfully');
      console.log(`   Message ID: ${data.message_id || 'N/A'}`);
      return { success: true, messageId: data.message_id, data };
    } catch (e) {
      console.log('✓ Email sent (no JSON response)');
      return { success: true, messageId: null };
    }
  } else {
    console.error('✗ Failed to send email:', result.error);
    return { success: false, error: result.error };
  }
}

/**
 * Read inbox messages
 * @param {Object} options - Inbox options
 * @returns {Promise<Object>} - Messages
 */
async function readInbox({ unread = false, limit = 10, since = null } = {}) {
  let command = 'inbox --json';
  
  if (unread) command += ' --unread';
  if (limit) command += ` --limit ${limit}`;
  if (since) command += ` --since "${since}"`;
  
  console.log('📬 Reading inbox...');
  
  const result = await execMailgoat(command);
  
  if (result.success) {
    try {
      const messages = JSON.parse(result.output);
      console.log(`✓ Found ${messages.length} message(s)`);
      return { success: true, messages };
    } catch (e) {
      console.error('✗ Failed to parse inbox response');
      return { success: false, error: 'Invalid JSON response' };
    }
  } else {
    console.error('✗ Failed to read inbox:', result.error);
    return { success: false, error: result.error };
  }
}

/**
 * Read a specific message
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} - Message details
 */
async function readMessage(messageId) {
  if (!messageId) {
    return { success: false, error: 'Message ID required' };
  }
  
  const command = `read ${messageId} --json`;
  
  console.log(`📧 Reading message ${messageId}...`);
  
  const result = await execMailgoat(command);
  
  if (result.success) {
    try {
      const message = JSON.parse(result.output);
      console.log('✓ Message read successfully');
      console.log(`   From: ${message.from}`);
      console.log(`   Subject: ${message.subject}`);
      return { success: true, message };
    } catch (e) {
      console.error('✗ Failed to parse message response');
      return { success: false, error: 'Invalid JSON response' };
    }
  } else {
    console.error('✗ Failed to read message:', result.error);
    return { success: false, error: result.error };
  }
}

/**
 * Process inbox messages with a callback
 * @param {Function} processor - Function to process each message
 * @param {Object} options - Inbox options
 */
async function processInbox(processor, options = {}) {
  const inboxResult = await readInbox(options);
  
  if (!inboxResult.success) {
    console.error('Failed to fetch inbox');
    return { success: false, error: inboxResult.error };
  }
  
  const results = [];
  
  for (const message of inboxResult.messages) {
    console.log(`\nProcessing message ${message.id}...`);
    
    // Read full message
    const messageResult = await readMessage(message.id);
    
    if (messageResult.success) {
      // Call processor function
      try {
        const processorResult = await processor(messageResult.message);
        results.push({ messageId: message.id, success: true, result: processorResult });
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error.message);
        results.push({ messageId: message.id, success: false, error: error.message });
      }
    } else {
      results.push({ messageId: message.id, success: false, error: 'Failed to read message' });
    }
  }
  
  return { success: true, results };
}

/**
 * Example: Send a notification email
 */
async function exampleSendNotification() {
  console.log('\n=== Example: Send Notification ===\n');
  
  await sendEmail({
    to: 'admin@example.com',
    subject: 'OpenClaw Agent Alert',
    body: `This is an automated notification from an OpenClaw agent.

Timestamp: ${new Date().toISOString()}
Hostname: ${require('os').hostname()}
Status: All systems operational

This email was sent via MailGoat CLI integration.`,
    priority: 'high',
  });
}

/**
 * Example: Check inbox and reply to unread messages
 */
async function exampleAutoReply() {
  console.log('\n=== Example: Auto-Reply to Unread ===\n');
  
  await processInbox(
    async (message) => {
      console.log(`Processing message from ${message.from}`);
      
      // Simple auto-reply logic
      const replyBody = `Thank you for your email!

This is an automated response from an OpenClaw agent. I've received your message:

Subject: ${message.subject}
Received: ${message.received_at}

A human will review your message and respond within 24 hours.

Best regards,
OpenClaw Agent`;
      
      // Send reply
      return await sendEmail({
        to: message.from,
        subject: `Re: ${message.subject}`,
        body: replyBody,
      });
    },
    { unread: true, limit: 5 }
  );
}

/**
 * Example: Extract and process commands from email
 */
async function exampleCommandProcessing() {
  console.log('\n=== Example: Command Processing ===\n');
  
  await processInbox(
    async (message) => {
      // Check if subject starts with CMD:
      if (!message.subject.startsWith('CMD:')) {
        console.log('Not a command email, skipping');
        return { skipped: true };
      }
      
      // Extract command
      const command = message.subject.replace('CMD:', '').trim();
      console.log(`Command detected: ${command}`);
      
      // Process command (simplified example)
      let result;
      if (command === 'STATUS') {
        result = `System Status: OK
Uptime: ${process.uptime().toFixed(0)} seconds
Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;
      } else if (command === 'PING') {
        result = 'PONG';
      } else {
        result = `Unknown command: ${command}`;
      }
      
      // Send result back
      return await sendEmail({
        to: message.from,
        subject: `Re: ${message.subject}`,
        body: `Command execution result:\n\n${result}`,
      });
    },
    { unread: true }
  );
}

/**
 * Example: Daily digest
 */
async function exampleDailyDigest() {
  console.log('\n=== Example: Daily Digest ===\n');
  
  // Gather some stats (example data)
  const stats = {
    timestamp: new Date().toISOString(),
    hostname: require('os').hostname(),
    uptime: process.uptime().toFixed(0),
    memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
  };
  
  const digestBody = `Daily Digest from OpenClaw Agent
${'='.repeat(40)}

Generated: ${stats.timestamp}
Server: ${stats.hostname}

System Information:
- Uptime: ${stats.uptime} seconds
- Memory Usage: ${stats.memory} MB

Recent Activity:
- Tasks completed: 42
- Emails processed: 15
- Commands executed: 7

Status: All systems operational

${'='.repeat(40)}
This is an automated digest generated by an OpenClaw agent using MailGoat.`;
  
  await sendEmail({
    to: 'team@example.com',
    subject: `Daily Digest - ${new Date().toLocaleDateString()}`,
    body: digestBody,
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('MailGoat OpenClaw Integration Examples');
  console.log('========================================\n');
  
  // Check if mailgoat is available
  const checkResult = await execMailgoat('--version');
  if (!checkResult.success) {
    console.error('✗ MailGoat CLI not found or not configured');
    console.error('  Please install and configure MailGoat first:');
    console.error('  npm install -g mailgoat');
    console.error('  mailgoat config --email agent@example.com --api-key YOUR_KEY');
    process.exit(1);
  }
  
  console.log('✓ MailGoat CLI found');
  console.log('');
  
  // Run examples (commented out - uncomment to test)
  
  // await exampleSendNotification();
  // await exampleAutoReply();
  // await exampleCommandProcessing();
  // await exampleDailyDigest();
  
  console.log('\nExamples ready to run!');
  console.log('Uncomment the example functions in main() to test them.');
  console.log('\nAvailable functions:');
  console.log('- sendEmail()');
  console.log('- readInbox()');
  console.log('- readMessage()');
  console.log('- processInbox()');
}

// Export functions for use as a module
module.exports = {
  sendEmail,
  readInbox,
  readMessage,
  processInbox,
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
