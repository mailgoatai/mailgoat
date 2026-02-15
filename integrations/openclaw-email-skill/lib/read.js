#!/usr/bin/env node
/**
 * Read a specific message for OpenClaw
 * Usage: node read.js <message_id>
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { PostalClient, loadConfig } = require('./postal-client');

async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <message_id> [options]')
    .demandCommand(1, 'Message ID required')
    .option('json', {
      type: 'boolean',
      description: 'Output JSON',
      default: true,
    })
    .option('expand', {
      type: 'string',
      description: 'Expand fields (attachments, headers)',
    })
    .help()
    .alias('help', 'h')
    .argv;

  try {
    const messageId = argv._[0];

    // Load config
    const config = loadConfig();
    const client = new PostalClient(config);

    // Read message
    const result = await client.read(messageId);

    // Output result
    if (argv.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.success) {
        const msg = result.message;
        console.log(`Message: ${msg.id}`);
        console.log(`From: ${msg.from}`);
        console.log(`To: ${msg.to.join(', ')}`);
        console.log(`Subject: ${msg.subject}`);
        console.log(`Date: ${msg.receivedAt}`);
        console.log(`\nBody:\n${msg.body}`);
        
        if (msg.attachments && msg.attachments.length > 0) {
          console.log(`\nAttachments: ${msg.attachments.length}`);
          msg.attachments.forEach((att, i) => {
            console.log(`  ${i + 1}. ${att.name || 'unnamed'}`);
          });
        }
      } else {
        console.error(`Error: ${result.error.message}`);
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
