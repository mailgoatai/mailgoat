/**
 * Example: Send Email Notification from OpenClaw
 * 
 * This example shows how to send a simple notification email
 * from within an OpenClaw agent workflow.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function sendNotification() {
  try {
    // Send email using the OpenClaw email skill
    const { stdout } = await execAsync(
      'node lib/send.js --to admin@example.com --subject "Alert from OpenClaw" --body "This is a test notification" --json',
      { cwd: __dirname + '/..' }
    );

    const result = JSON.parse(stdout);

    if (result.success) {
      console.log(`✓ Notification sent: ${result.messageId}`);
      return result;
    } else {
      console.error(`✗ Failed to send notification: ${result.error.message}`);
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error(`Error sending notification: ${error.message}`);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  sendNotification()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { sendNotification };
