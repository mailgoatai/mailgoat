const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEmailPayload } = require('../src/mailgoat');

test('builds welcome email payload', () => {
  const p = buildEmailPayload('welcome', { email: 'u@example.com', name: 'Alex' });
  assert.equal(p.subject, 'Welcome to Todo App');
  assert.match(p.html_body, /Welcome Alex/);
});

test('builds reset payload with link', () => {
  const p = buildEmailPayload('password-reset', {
    email: 'u@example.com',
    resetLink: 'https://app/reset/token',
  });
  assert.match(p.html_body, /reset\/token/);
});
