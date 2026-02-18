import {
  parseSearchDate,
  searchCachedMessages,
  sortCachedMessages,
  type CachedMessage,
} from '../message-search';

describe('message-search', () => {
  const messages: CachedMessage[] = [
    {
      id: 'msg-001',
      from: 'alice@example.com',
      to: ['ops@company.com'],
      subject: 'Weekly report',
      body: 'Invoice and budget attached.',
      received_at: '2026-02-14T12:00:00.000Z',
      tag: 'report',
      has_attachments: true,
    },
    {
      id: 'msg-002',
      from: 'bob@example.com',
      to: ['support@company.com'],
      subject: 'Urgent outage update',
      body: 'Service restored.',
      received_at: '2026-02-13T09:00:00.000Z',
      tag: 'incident',
      has_attachments: false,
    },
    {
      id: 'msg-003',
      from: 'alerts@example.com',
      to: ['ops@company.com'],
      subject: 'Nightly status',
      body: 'All systems healthy.',
      received_at: '2026-02-15T03:00:00.000Z',
      attachments: [{ filename: 'status.txt' }],
    },
  ];

  it('filters by sender, subject, body, and tag', () => {
    const result = searchCachedMessages(messages, {
      from: 'alice',
      subject: 'report',
      body: 'invoice',
      tag: 'REPORT',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg-001');
  });

  it('filters by recipient and attachments', () => {
    const result = searchCachedMessages(messages, {
      to: 'ops@company.com',
      hasAttachment: true,
    });

    expect(result.map((item) => item.id)).toEqual(['msg-001', 'msg-003']);
  });

  it('filters by date range', () => {
    const result = searchCachedMessages(messages, {
      after: Date.parse('2026-02-13T10:00:00.000Z'),
      before: Date.parse('2026-02-15T00:00:00.000Z'),
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg-001');
  });

  it('sorts results by date descending', () => {
    const sorted = sortCachedMessages(messages, 'date', 'desc');
    expect(sorted.map((item) => item.id)).toEqual(['msg-003', 'msg-001', 'msg-002']);
  });

  it('sorts results by subject ascending', () => {
    const sorted = sortCachedMessages(messages, 'subject', 'asc');
    expect(sorted.map((item) => item.id)).toEqual(['msg-003', 'msg-002', 'msg-001']);
  });

  it('parses ISO date and relative date', () => {
    const iso = parseSearchDate('2026-01-01');
    expect(iso).toBe(Date.parse('2026-01-01T00:00:00.000Z'));

    const before = Date.now();
    const relative = parseSearchDate('1d');
    const after = Date.now();

    expect(relative).toBeLessThan(before);
    expect(relative).toBeGreaterThan(after - 2 * 24 * 60 * 60 * 1000);
  });

  it('throws on invalid date format', () => {
    expect(() => parseSearchDate('tomorrow')).toThrow(/Invalid date format/);
  });
});
