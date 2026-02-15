#!/usr/bin/env node
/**
 * List inbox messages for OpenClaw
 * Usage: node inbox.js [--unread] [--limit 10]
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { PostalClient, loadConfig } = require('./postal-client');

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('unread', {
      type: 'boolean',
      description: 'Only show unread messages',
      default: false,
    })
    .option('limit', {
      alias: 'l',
      type: 'number',
      description: 'Maximum number of messages to return',
      default: 50,
    })
    .option('since', {
      type: 'string',
      description: 'Only messages since (e.g., "1 hour ago", ISO date)',
    })
    .option('json', {
      type: 'boolean',
      description: 'Output JSON',
      default: true,
    })
    .help()
    .alias('help', 'h')
    .argv;

  try {
    // Load config
    const config = loadConfig();
    const client = new PostalClient(config);

    // Fetch inbox
    const result = await client.inbox({
      unread: argv.unread,
      limit: argv.limit,
      since: argv.since,
    });

    // Output result
    if (argv.json) {
      console.log(JSON.stringify(result.messages || [], null, 2));
    } else {
      if (result.success) {
        if (result.messages.length === 0) {
          console.log('No messages found');
        } else {
          console.log(`Found ${result.messages.length} message(s):`);
          result.messages.forEach((msg, i) => {
            console.log(`\n${i + 1}. ${msg.subject}`);
            console.log(`   From: ${msg.from}`);
            console.log(`   ID: ${msg.id}`);
            console.log(`   Date: ${msg.receivedAt}`);
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
