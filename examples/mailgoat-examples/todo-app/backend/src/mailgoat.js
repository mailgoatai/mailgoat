function buildEmailPayload(type, data) {
  if (type === 'welcome') {
    return { to: [data.email], subject: 'Welcome to Todo App', html_body: `<h1>Welcome ${data.name}</h1>` };
  }
  if (type === 'task-assigned') {
    return { to: [data.email], subject: `Task assigned: ${data.taskTitle}`, html_body: `<p>${data.assignee} assigned: ${data.taskTitle}</p>` };
  }
  if (type === 'task-completed') {
    return { to: [data.email], subject: `Task completed: ${data.taskTitle}`, html_body: `<p>Completed by ${data.completedBy}</p>` };
  }
  if (type === 'daily-digest') {
    return { to: [data.email], subject: 'Daily task digest', html_body: `<p>Open tasks: ${data.openCount}</p>` };
  }
  if (type === 'password-reset') {
    return { to: [data.email], subject: 'Reset your password', html_body: `<a href="${data.resetLink}">Reset password</a>` };
  }
  throw new Error(`Unknown email type: ${type}`);
}

async function sendWithMailGoat(payload) {
  const baseUrl = process.env.MAILGOAT_API_URL;
  const apiKey = process.env.MAILGOAT_API_KEY;
  if (!baseUrl || !apiKey) return { skipped: true, payload };

  const res = await fetch(`${baseUrl}/v1/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`MailGoat send failed: ${res.status}`);
  return res.json();
}

module.exports = { buildEmailPayload, sendWithMailGoat };
