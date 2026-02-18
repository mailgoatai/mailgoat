#!/usr/bin/env node
const { execSync } = require('node:child_process');

setInterval(() => {
  try {
    const out = execSync('mailgoat inbox list --limit 5 --json', { encoding: 'utf8' });
    console.log(new Date().toISOString(), out.trim());
  } catch (error) {
    console.error('poll failed', error.message);
  }
}, 15000);
