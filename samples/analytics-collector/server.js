const express = require('express');
const app = express();
app.use(express.json());

// DEFECT 1: Unbounded memory leak
const eventLog = new Map();
let counter = 0;

app.post('/events', (req, res) => {
  const id = `ev_${++counter}`;
  eventLog.set(id, { ...req.body, timestamp: Date.now() });
  res.status(201).json({ id });
});

// DEFECT 2: Unindexed scan
app.get('/metrics', (req, res) => {
  const since = Number(req.query.since) || 0;
  const filtered = [];
  for (const [id, ev] of eventLog.entries()) {
    if (ev.timestamp >= since) filtered.push(ev);
  }
  res.json({ count: filtered.length, events: filtered.slice(0, 100) });
});

app.get('/health', (req, res) => res.json({ status: 'ok', memoryItems: eventLog.size }));

const port = process.env.PORT || 4003;
if (require.main === module) {
  app.listen(port, () => console.log(`Analytics Collector running on port ${port}`));
}
module.exports = app;
