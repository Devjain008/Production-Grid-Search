const express = require('express');
const app = express();
app.use(express.json({ limit: '20mb' }));

const posts = Array.from({ length: 50 }, (_, i) => ({ id: `p${i}`, title: `Post ${i}` }));
const comments = Array.from({ length: 200 }, (_, i) => ({ id: `c${i}`, postId: `p${i % 50}`, text: `Comment ${i}` }));

// DEFECT 1: N+1 query loop
app.get('/posts', async (req, res) => {
  const result = [];
  for (const p of posts) {
    // Injected N+1 sequential lookup
    const postComments = comments.filter(c => c.postId === p.id);
    result.push({ ...p, comments: postComments });
  }
  res.json(result);
});

// DEFECT 2: Blocking JSON parse
app.post('/import', (req, res) => {
  const data = JSON.parse(JSON.stringify(req.body));
  res.json({ imported: Array.isArray(data) ? data.length : 1 });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4001;
if (require.main === module) {
  app.listen(port, () => console.log(`Blog API running on port ${port}`));
}
module.exports = app;
