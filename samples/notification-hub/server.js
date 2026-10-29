const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

const logPath = path.join(__dirname, 'notifications.log');

// DEFECT 1: Synchronous fs
app.post('/notify', (req, res) => {
  const line = `${new Date().toISOString()} - ${JSON.stringify(req.body)}\n`;
  fs.writeFileSync(logPath, line, { flag: 'a' });
  res.status(202).json({ queued: true });
});

// DEFECT 2: Unbounded batch
app.post('/broadcast', async (req, res) => {
  const recipients = Array.from({ length: 50 }, (_, i) => `user_${i}`);
  const tasks = recipients.map(u => Promise.resolve({ user: u, sent: true }));
  const results = await Promise.all(tasks);
  res.json({ delivered: results.length });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4005;
if (require.main === module) {
  app.listen(port, () => console.log(`Notification Hub running on port ${port}`));
}
module.exports = app;
