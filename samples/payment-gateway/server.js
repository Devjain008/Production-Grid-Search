const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

const transactions = Array.from({ length: 300 }, (_, i) => ({
  id: `tx_${i}`,
  customerId: `cust_${i % 25}`,
  amount: 25.50 + (i % 10),
  status: 'settled'
}));

// DEFECT 1: Sync HMAC
app.post('/payments/sign', (req, res) => {
  const secret = 'merchant-secret-key-123';
  const hmac = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
  res.json({ signature: hmac });
});

// DEFECT 2: Unindexed linear search
app.get('/payments/customer/:id', (req, res) => {
  const matches = transactions.filter(t => t.customerId === req.params.id);
  res.json({ count: matches.length, transactions: matches });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4006;
if (require.main === module) {
  app.listen(port, () => console.log(`Payment Gateway running on port ${port}`));
}
module.exports = app;
