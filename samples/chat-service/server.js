const express = require('express');
const app = express();
app.use(express.json());

const messages = [];

// DEFECT 1: Unbounded array
app.post('/messages', (req, res) => {
  const msg = { id: `m_${messages.length}`, text: req.body.text || 'hello', time: Date.now() };
  messages.push(msg);
  res.status(201).json(msg);
});

// DEFECT 2: Missing pagination
app.get('/messages', (req, res) => {
  res.json({ total: messages.length, messages });
});

app.get('/health', (req, res) => res.json({ status: 'ok', count: messages.length }));

const port = process.env.PORT || 4007;
if (require.main === module) {
  app.listen(port, () => console.log(`Chat Service running on port ${port}`));
}
module.exports = app;
