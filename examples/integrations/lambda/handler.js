const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

exports.handler = async (event) => {
  const to = event.recipient;
  const subject = event.subject;
  const body = event.message;

  if (!to || !subject || !body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'recipient, subject, and message are required' })
    };
  }

  try {
    const { stdout } = await execFileAsync('mailgoat', ['send', '--to', to, '--subject', subject, '--body', body, '--json'], {
      env: process.env
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, result: JSON.parse(stdout) })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.stderr || error.message })
    };
  }
};
