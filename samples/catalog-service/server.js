const express = require('express');
const app = express();
app.use(express.json());

const products = Array.from({ length: 500 }, (_, i) => ({
  id: `sku_${i}`,
  name: `Industrial Equipment SKU #${i}`,
  description: `Standard multi-purpose manufacturing unit item with specifications and metadata details ${i}`,
  price: 99.99 + (i % 100)
}));

// DEFECT 1: Missing pagination
app.get('/products', (req, res) => {
  res.json(products);
});

// DEFECT 2: Uncompressed large catalog
app.get('/catalog/full', (req, res) => {
  res.json({ catalog: products, count: products.length, generatedAt: new Date().toISOString() });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4004;
if (require.main === module) {
  app.listen(port, () => console.log(`Catalog Service running on port ${port}`));
}
module.exports = app;
