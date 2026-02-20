const express = require('express');
const { trialStart } = require('./email');
const app = express();
app.use(express.json());
app.post('/trial/start', (req, res) => res.json(trialStart(req.body)));
app.listen(3003, () => console.log('saas app running'));
