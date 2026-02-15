#!/usr/bin/env node
/**
 * Send email command for OpenClaw
 * Usage: node send.js --to user@example.com --subject "Subject" --body "Body"
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { PostalClient, loadConfig } = require('./postal-client');

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('to', {
      alias: 't',
      type: 'string',
      description: 'Recipient email (comma-separated for multiple)',
      demandOption: true,
    })
    .option('subject', {
      alias: 's',
      type: 'string',
      description: 'Email subject',
      demandOption: true,
    })
    .option('body', {
      alias: 'b',
      type: 'string',
      description: 'Email body (plain text)',
      demandOption: true,
    })
    .option('html', {
      alias: 'H',
      type: 'string',
      description: 'HTML body (if different from plain text)',
    })
    .option('from', {
      alias: 'f',
      type: 'string',
      description: 'From email (override default)',
    })
    .option('cc', {
      type: 'string',
      description: 'CC recipients (comma-separated)',
    })
    .option('bcc', {
      type: 'string',
      description: 'BCC recipients (comma-separated)',
    })
    .option('reply-to', {
      type: 'string',
      description: 'Reply-to email',
    })
    .option('json', {
      type: 'boolean',
      description: 'Output JSON',
      default: false,
    })
    .help()
    .alias('help', 'h')
    .argv;

  try {
    // Load config
    const config = loadConfig();
    const client = new PostalClient(config);

    // Parse recipients
    const to = argv.to.split(',').map(e => e.trim());
    const cc = argv.cc ? argv.cc.split(',').map(e => e.trim()) : undefined;
    const bcc = argv.bcc ? argv.bcc.split(',').map(e => e.trim()) : undefined;

    // Send email
    const result = await client.send({
      to,
      subject: argv.subject,
      body: argv.body,
      html: argv.html,
      from: argv.from,
      cc,
      bcc,
      replyTo: argv['reply-to'],
    });

    // Output result
    if (argv.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.success) {
        console.log(`✓ Email sent successfully`);
        console.log(`  Message ID: ${result.messageId}`);
        console.log(`  To: ${to.join(', ')}`);
        console.log(`  Subject: ${argv.subject}`);
      } else {
        console.error(`✗ Failed to send email`);
        console.error(`  Error: ${result.error.message}`);
        process.exit(1);
      }
    }
  } catch (error) {
    if (argv.json) {
      console.log(JSON.stringify({
        success: false,
        error: {
          code: 'ERROR',
          message: error.message,
        },
      }, null, 2));
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
