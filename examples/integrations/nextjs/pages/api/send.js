import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const to = req.body?.email;
  if (!to) {
    return res.status(400).json({ success: false, error: 'email is required' });
  }

  try {
    const env = {
      ...process.env,
      MAILGOAT_SERVER_URL: process.env.POSTAL_URL || process.env.MAILGOAT_SERVER_URL,
      MAILGOAT_API_KEY: process.env.POSTAL_API_KEY || process.env.MAILGOAT_API_KEY
    };

    await execFileAsync(
      'mailgoat',
      ['send', '--to', to, '--subject', 'Welcome!', '--body', 'Thanks for signing up', '--json'],
      { env }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.stderr || error.message });
  }
}
