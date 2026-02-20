const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReportPayload } = require('../scripts/send-report');

test('build report payload includes workflow and status', () => {
  const p = buildReportPayload({ to: 'team@example.com', workflow: 'build', status: 'failed', url: 'u' });
  assert.match(p.subject, /build/);
  assert.match(p.subject, /failed/);
});
