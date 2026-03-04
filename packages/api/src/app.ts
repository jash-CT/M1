import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middleware/error';

import authRoutes from './routes/auth';
import tenantsRoutes from './routes/tenants';
import ordersRoutes from './routes/orders';
import analyticsRoutes from './routes/analytics';
import integrationsRoutes from './routes/integrations';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.webUrl, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/integrations', integrationsRoutes);

app.use(errorHandler);

export default app;
