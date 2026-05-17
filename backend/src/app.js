const express = require('express');
const { applyRateLimit } = require('./middleware/rateLimit.middleware');
const routes = require('./api/index');

const app = express();

app.use(express.json());
applyRateLimit(app);

app.use('/api', routes);

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}
