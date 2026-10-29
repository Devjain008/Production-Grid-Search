const express = require('express');
const app = express();
app.use(express.json());

const users = Array.from({ length: 200 }, (_, i) => ({
  id: `u_${i}`,
  email: `user${i}@example.com`,
  name: `User ${i}`
}));

const activity = Array.from({ length: 1000 }, (_, i) => ({
  id: `act_${i}`,
  userId: `u_${i % 50}`,
  action: 'PAGE_VIEW',
  timestamp: Date.now() - i * 1000
}));

// DEFECT 1: Unindexed search
app.get('/users/by-email', (req, res) => {
  const email = (req.query.email || '').toLowerCase();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// DEFECT 2: Missing pagination
app.get('/users/:id/activity', (req, res) => {
  const userActivity = activity.filter(a => a.userId === req.params.id);
  res.json({ count: userActivity.length, activity: userActivity });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4009;
if (require.main === module) {
  app.listen(port, () => console.log(`User Profile Service running on port ${port}`));
}
module.exports = app;
