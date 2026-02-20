#!/usr/bin/env node

/**
 * Simple email sender using MailGoat CLI.
 *
 * Usage:
 *   node simple-send.js [--to user@example.com] [--execute]
 */

const { execFile } = require('child_process');

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const isHelp = process.argv.includes('--help') || process.argv.includes('-h');
const execute = process.argv.includes('--execute');

if (isHelp) {
  console.log('Usage: node simple-send.js [--to user@example.com] [--execute]');
  console.log('Without --execute, prints the command only (safe dry-run).');
  process.exit(0);
}

const to = argValue('--to', 'user@example.com');
const subject = argValue('--subject', 'Welcome!');
const body = argValue('--body', 'Hello from MailGoat');
const from = argValue('--from', 'sender@myapp.com');

const args = ['send', '--to', to, '--subject', subject, '--body', body, '--from', from, '--json'];

if (!execute) {
  console.log('[dry-run] mailgoat ' + args.map((v) => (v.includes(' ') ? `"${v}"` : v)).join(' '));
  console.log('Add --execute to actually send.');
  process.exit(0);
}

execFile('mailgoat', args, (error, stdout, stderr) => {
  if (error) {
    console.error('Failed to send email:', stderr || error.message);
    process.exit(1);
  }

  console.log('Email sent successfully:');
  console.log(stdout.trim());
});
