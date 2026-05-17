const client = require('prom-client');

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de requests HTTP recibidos',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duración de requests HTTP en milisegundos',
  labelNames: ['method', 'route'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [registry],
});

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode });
    httpRequestDurationMs.observe({ method: req.method, route }, duration);
  });
  next();
}

module.exports = { metricsMiddleware, registry };
