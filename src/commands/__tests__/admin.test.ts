import { mapInboxMessageToAdminMessage, matchesInboxIdentifier, normalizeInboxId } from '../admin';
import { InboxMessage } from '../../lib/inbox-store';

describe('admin inbox helpers', () => {
  it('normalizes inbox id safely', () => {
    expect(normalizeInboxId('  QA%2BInbox%40Example.com  ')).toBe('qa+inbox@example.com');
  });

  it('matches recipient by full email or local part', () => {
    const message: InboxMessage = {
      id: 'm-1',
      from: 'sender@example.com',
      to: ['qa@example.com', 'ops@example.com'],
      subject: 'Hello',
      timestamp: '2026-02-19T00:00:00.000Z',
      read: false,
      snippet: 'preview',
    };

    expect(matchesInboxIdentifier(message, 'qa@example.com')).toBe(true);
    expect(matchesInboxIdentifier(message, 'qa')).toBe(true);
    expect(matchesInboxIdentifier(message, 'dev@example.com')).toBe(false);
  });

  it('maps inbox message into admin response shape', () => {
    const mapped = mapInboxMessageToAdminMessage({
      id: 'm-2',
      from: 'sender@example.com',
      to: ['qa@example.com'],
      subject: 'Subject',
      timestamp: '2026-02-19T00:00:00.000Z',
      read: true,
      snippet: 'Body preview',
    });

    expect(mapped.id).toBe('m-2');
    expect(mapped.body.text).toBe('Body preview');
    expect(mapped.attachments).toEqual([]);
    expect(mapped.cc).toEqual([]);
    expect(mapped.bcc).toEqual([]);
  });
});
