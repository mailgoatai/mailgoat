#!/usr/bin/env node

/**
 * Send an email with a saved MailGoat template.
 *
 * Usage:
 *   node template-email.js --template welcome --to user@example.com [--execute]
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
  console.log('Usage: node template-email.js --template welcome --to user@example.com [--execute]');
  console.log('Optional: --var key=value (repeatable)');
  process.exit(0);
}

const template = argValue('--template', 'welcome');
const to = argValue('--to', 'user@example.com');
const normalizedVars = [];
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--var' && process.argv[i + 1]) normalizedVars.push(process.argv[i + 1]);
}

const args = ['send', '--template', template, '--to', to, '--json'];
normalizedVars.forEach((pair) => {
  args.push('--var', pair);
});

if (!execute) {
  console.log('[dry-run] mailgoat ' + args.join(' '));
  console.log('Add --execute to actually send.');
  process.exit(0);
}

execFile('mailgoat', args, (error, stdout, stderr) => {
  if (error) {
    console.error('Template send failed:', stderr || error.message);
    process.exit(1);
  }
  console.log('Template email sent:');
  console.log(stdout.trim());
});
