const express = require('express');
const { buildEmailPayload, sendWithMailGoat } = require('./mailgoat');

const app = express();
app.use(express.json());

app.post('/signup', async (req, res) => {
  const payload = buildEmailPayload('welcome', req.body);
  await sendWithMailGoat(payload);
  res.json({ ok: true });
});

app.post('/tasks/assign', async (req, res) => {
  const payload = buildEmailPayload('task-assigned', req.body);
  await sendWithMailGoat(payload);
  res.json({ ok: true });
});

app.post('/tasks/complete', async (req, res) => {
  const payload = buildEmailPayload('task-completed', req.body);
  await sendWithMailGoat(payload);
  res.json({ ok: true });
});

app.post('/digest', async (req, res) => {
  const payload = buildEmailPayload('daily-digest', req.body);
  await sendWithMailGoat(payload);
  res.json({ ok: true });
});

app.post('/password-reset', async (req, res) => {
  const payload = buildEmailPayload('password-reset', req.body);
  await sendWithMailGoat(payload);
  res.json({ ok: true });
});

app.listen(process.env.PORT || 3001, () => {
  console.log('todo backend running');
});
