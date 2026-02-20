function buildReportPayload(input) {
  const subject = `${input.workflow}: ${input.status}`;
  return {
    to: [input.to],
    subject,
    html_body: `<p>Workflow: ${input.workflow}</p><p>Status: ${input.status}</p><p>URL: ${input.url}</p>`,
  };
}

if (require.main === module) {
  const payload = buildReportPayload({
    to: process.env.TEAM_EMAIL || 'team@example.com',
    workflow: process.env.WORKFLOW_NAME || 'CI',
    status: process.env.WORKFLOW_STATUS || 'success',
    url: process.env.RUN_URL || 'https://github.com/example/actions/runs/1',
  });
  console.log(JSON.stringify(payload));
}

module.exports = { buildReportPayload };
