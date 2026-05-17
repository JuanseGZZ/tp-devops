const express = require('express');
const { applyRateLimit } = require('./middleware/rateLimit.middleware');
const { metricsMiddleware, registry } = require('./middleware/metrics.middleware');
const routes = require('./api/index');

const app = express();

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
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}
