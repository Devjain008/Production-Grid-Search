const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// DEFECT 1: Synchronous crypto
app.post('/login', (req, res) => {
  const { password = 'pass' } = req.body;
  const hash = crypto.pbkdf2Sync(password, 'salt123', 50000, 64, 'sha512').toString('hex');
  res.json({ token: `session-${hash.substring(0, 16)}` });
});

// DEFECT 2: No pooling (creates client on every request)
app.get('/session/:id', (req, res) => {
  const newClientInstance = { connectedAt: Date.now(), query: () => ({ valid: true }) };
  const session = newClientInstance.query();
  res.json({ session });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4002;
if (require.main === module) {
  app.listen(port, () => console.log(`Auth Service running on port ${port}`));
}
module.exports = app;
