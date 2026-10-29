const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

const inventory = new Map(Array.from({ length: 100 }, (_, i) => [`sku_${i}`, 50]));
const auditLog = path.join(__dirname, 'audit.log');

// DEFECT 1: N+1 loop
app.post('/inventory/check', (req, res) => {
  const skus = req.body.skus || [];
  const results = {};
  for (const sku of skus) {
    // Sequential lookup
    results[sku] = inventory.get(sku) || 0;
  }
  res.json({ stock: results });
});

// DEFECT 2: Sync audit log
app.post('/inventory/deduct', (req, res) => {
  const { sku, quantity = 1 } = req.body;
  const current = inventory.get(sku) || 0;
  inventory.set(sku, Math.max(0, current - quantity));
  fs.writeFileSync(auditLog, `DEDUCT: ${sku} - ${quantity} at ${Date.now()}\n`, { flag: 'a' });
  res.json({ sku, remaining: inventory.get(sku) });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4008;
if (require.main === module) {
  app.listen(port, () => console.log(`Inventory Tracker running on port ${port}`));
}
module.exports = app;
