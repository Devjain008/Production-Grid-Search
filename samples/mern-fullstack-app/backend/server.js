const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Simulated MongoDB MERN in-memory collection
const usersCollection = [
  { _id: '1', name: 'Alice Developer', email: 'alice@example.com', role: 'admin' },
  { _id: '2', name: 'Bob Engineer', email: 'bob@example.com', role: 'member' },
  { _id: '3', name: 'Charlie Designer', email: 'charlie@example.com', role: 'member' }
];

const postsCollection = Array.from({ length: 50 }, (_, i) => ({
  _id: `${i + 1}`,
  title: `MERN Post #${i + 1} with Fullstack React integration`,
  authorId: (i % 3) + 1,
  likes: i * 7
}));

// Standard MERN healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mern-backend-api',
    uptime: process.uptime(),
    database: 'connected (simulated mongo)'
  });
});

// GET /api/users
app.get('/api/users', (req, res) => {
  res.json({
    count: usersCollection.length,
    users: usersCollection
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email = 'alice@example.com' } = req.body || {};
  res.json({
    token: 'mern_jwt_mock_token_abc123',
    user: { email, role: 'admin' }
  });
});

// GET /api/posts
app.get('/api/posts', (req, res) => {
  res.json({
    total: postsCollection.length,
    posts: postsCollection.slice(0, 15)
  });
});

// POST /api/posts
app.post('/api/posts', (req, res) => {
  const newPost = {
    _id: `${postsCollection.length + 1}`,
    title: req.body?.title || 'New MERN Post',
    createdAt: new Date().toISOString()
  };
  postsCollection.push(newPost);
  res.status(201).json(newPost);
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MERN Backend] Listening on port ${PORT}`);
  });
}

module.exports = app;
