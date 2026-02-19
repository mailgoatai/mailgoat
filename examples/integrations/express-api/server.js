const express = require('express');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const app = express();

app.use(express.json());

app.post('/api/send-email', async (req, res) => {
  const { to, subject, message } = req.body || {};

  if (!to || !subject || !message) {
    return res.status(400).json({
      success: false,
      error: 'Fields required: to, subject, message'
    });
  }

  try {
    const env = {
      ...process.env,
      MAILGOAT_SERVER_URL: process.env.POSTAL_URL || process.env.MAILGOAT_SERVER_URL,
      MAILGOAT_API_KEY: process.env.POSTAL_API_KEY || process.env.MAILGOAT_API_KEY
    };

    const { stdout } = await execFileAsync(
      'mailgoat',
      ['send', '--to', to, '--subject', subject, '--body', message, '--json'],
      { env }
    );

    const payload = JSON.parse(stdout);
    return res.json({ success: true, messageId: payload.messageId || payload.id || null });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.stderr || error.message });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Express API listening on :${port}`);
});
