import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { __campaignInternals } from '../campaign';

describe('campaign command internals', () => {
  it('parses fallback key=value pairs', () => {
    const out = __campaignInternals.parseFallbacks(['name=Friend', 'company=Acme']);
    expect(out).toEqual({ name: 'Friend', company: 'Acme' });
  });

  it('parses recipient CSV with arbitrary variables', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-csv-'));
    const file = path.join(dir, 'users.csv');
    fs.writeFileSync(file, 'email,name,company\na@example.com,Alice,Acme\n');

    const rows = __campaignInternals.parseCsvRecipients(file);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('a@example.com');
    expect(rows[0].vars).toMatchObject({ name: 'Alice', company: 'Acme' });
  });

  it('exports recipient results as CSV', () => {
    const csv = __campaignInternals.toCsv([
      {
        campaign_id: 'c1',
        idx: 0,
        email: 'a@example.com',
        variables_json: '{}',
        status: 'sent',
        error: null,
        send_time_ms: 123,
        sent_at: 1,
      },
    ]);

    expect(csv).toContain('idx,email,status,error,send_time_ms,sent_at');
    expect(csv).toContain('a@example.com');
  });
});
