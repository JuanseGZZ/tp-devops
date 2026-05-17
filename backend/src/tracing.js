// Se carga con --require antes de app.js. Si no hay OTEL_EXPORTER_OTLP_ENDPOINT, no hace nada.
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
  const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
  const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

  const sdk = new NodeSDK({
    serviceName: 'tp-devops-backend',
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new PgInstrumentation(),
    ],
  });

  sdk.start();
  process.on('SIGTERM', () => sdk.shutdown());
}
