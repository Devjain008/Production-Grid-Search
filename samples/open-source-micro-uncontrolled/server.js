const express = require('express');
const app = express();
app.use(express.json());

app.get('/api/v1/info', (req, res) => {
  res.json({
    app: 'express-microservice-uncontrolled',
    version: '1.2.0',
    uptime: process.uptime(),
    node: process.version
  });
});

app.post('/api/v1/echo', (req, res) => {
  res.json({ echo: req.body, receivedAt: new Date().toISOString() });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4010;
if (require.main === module) {
  app.listen(port, () => console.log(`Uncontrolled Microservice running on port ${port}`));
}
module.exports = app;
