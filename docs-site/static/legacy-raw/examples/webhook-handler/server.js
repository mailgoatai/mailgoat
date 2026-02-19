#!/usr/bin/env node
const { spawn } = require('node:child_process');

const child = spawn('mailgoat', ['inbox', 'serve', '--host', '127.0.0.1', '--port', '3000', '--path', '/webhooks/postal'], {
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
