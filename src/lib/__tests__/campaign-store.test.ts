import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CampaignStore } from '../campaign-store';

describe('CampaignStore', () => {
  it('creates campaign, tracks recipient results, and reports summary', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-store-'));
    const dbPath = path.join(dir, 'campaigns.db');
    const store = new CampaignStore(dbPath);

    const campaign = store.createCampaign({
      id: 'camp-1',
      name: 'March Newsletter',
      template: '/tmp/template.html',
      subjectTemplate: 'Hi {{name}}',
      total: 2,
      batchSize: 100,
      delayMs: 0,
    });

    expect(campaign.id).toBe('camp-1');

    store.addRecipients('camp-1', [
      { email: 'a@example.com', variablesJson: '{"name":"A"}' },
      { email: 'b@example.com', variablesJson: '{"name":"B"}' },
    ]);

    store.markRecipientSent('camp-1', 0, 120);
    store.markRecipientFailed('camp-1', 1, 'SMTP_TEMP_FAIL', 200);
    store.markCampaignCompleted('camp-1', 'completed');

    const report = store.getReport('camp-1');
    expect(report).toBeDefined();
    expect(report?.campaign.sent).toBe(1);
    expect(report?.campaign.failed).toBe(1);
    expect(report?.pending).toBe(0);
    expect(report?.errorSummary[0].error).toBe('SMTP_TEMP_FAIL');

    store.close();
  });
});
