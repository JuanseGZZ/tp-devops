const express = require('express');
const { applyRateLimit } = require('./middleware/rateLimit.middleware');
const { metricsMiddleware, registry } = require('./middleware/metrics.middleware');
const routes = require('./api/index');

const app = express();
app.set('trust proxy', 1);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(JSON.stringify({ method: req.method, path: req.path, status: res.statusCode, ms }));
  });
  next();
});

app.use(express.json());
applyRateLimit(app);
app.use(metricsMiddleware);

app.use('/api', routes);

app.get('/metrics', async (req, res) => {
  const token = process.env.METRICS_TOKEN;
  if (token) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${token}`) {
      return res.status(401).end('Unauthorized');
    }
  }
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  const fs = require('fs');
  const path = require('path');
  const pool = require('./config/db');

  pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users')")
    .then(({ rows }) => {
      if (!rows[0].exists) {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_init.sql'), 'utf8');
        return pool.query(sql).then(() => console.log('Migration OK'));
      }
    })
    .then(() => app.listen(port, () => console.log(`Server running on port ${port}`)))
    .catch(err => { console.error('Startup error:', err); process.exit(1); });
}
