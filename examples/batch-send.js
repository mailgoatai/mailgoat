#!/usr/bin/env node

/**
 * Batch email sender from a CSV file.
 *
 * CSV format:
 * email,name,subject,body
 * alice@example.com,Alice,Welcome,Hello Alice
 *
 * Usage:
 *   node batch-send.js recipients.csv [--execute]
 */

const fs = require('fs');
const { execFile } = require('child_process');

const isHelp = process.argv.includes('--help') || process.argv.includes('-h');
const execute = process.argv.includes('--execute');
const csvPath = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'recipients.csv';

if (isHelp) {
  console.log('Usage: node batch-send.js recipients.csv [--execute]');
  console.log('Without --execute, prints each command only (safe dry-run).');
  process.exit(0);
}

if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

const rows = fs
  .readFileSync(csvPath, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

if (rows.length < 2) {
  console.error('CSV must include a header and at least one data row.');
  process.exit(1);
}

const entries = rows.slice(1).map((line) => {
  const [email, name, subject, body] = line.split(',').map((v) => (v || '').trim());
  return {
    email,
    name: name || 'Friend',
    subject: subject || 'Hello from MailGoat',
    body: body || `Hi ${name || 'there'}, this is a batch email.`,
  };
});

function sendOne(entry) {
  return new Promise((resolve, reject) => {
    const args = [
      'send',
      '--to',
      entry.email,
      '--subject',
      entry.subject,
      '--body',
      entry.body,
      '--json',
    ];

    if (!execute) {
      console.log('[dry-run] mailgoat ' + args.join(' '));
      return resolve();
    }

    execFile('mailgoat', args, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message));
      }
      console.log(`Sent to ${entry.email}: ${stdout.trim()}`);
      resolve();
    });
  });
}

(async () => {
  for (const entry of entries) {
    if (!entry.email) {
      console.warn('Skipping row with empty email.');
      continue;
    }
    try {
      await sendOne(entry);
    } catch (err) {
      console.error(`Failed for ${entry.email}: ${err.message}`);
    }
  }

  if (!execute) {
    console.log('Dry-run complete. Add --execute to send for real.');
  }
})();
