const test = require('node:test');
const assert = require('node:assert/strict');
const { trialStart, trialExpiring, trialExpired } = require('../app/email');

test('trial start subject', () => {
  assert.match(trialStart({ email: 'a@b.com', name: 'A' }).subject, /started/i);
});

test('expiring subject', () => {
  assert.match(trialExpiring({ email: 'a@b.com' }).subject, /3 days left/i);
});

test('expired subject', () => {
  assert.match(trialExpired({ email: 'a@b.com' }).subject, /expired/i);
});
