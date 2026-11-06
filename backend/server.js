require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const RedisStore = require('rate-limit-redis');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN, credentials: true }));
app.use(express.json({ limit: '50kb' }));

mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 100,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
});

const redis = new Redis(process.env.REDIS_URL);

const globalLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...a) => redis.call(...a) }),
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
});
app.use('/api', globalLimiter);

// AI endpoint stricter (expensive)
app.use('/api/ai', rateLimit({
  store: new RedisStore({ sendCommand: (...a) => redis.call(...a) }),
  windowMs: 60 * 1000,
  max: 10,
}));

app.use('/api/schemes', require('./routes/schemes'));
app.use('/api/ai', require('./routes/ai'));

app.get('/health', (_req, res) => {
  const ok = mongoose.connection.readyState === 1 && redis.status === 'ready';
  res.status(ok ? 200 : 503).json({ ok, version: '1.0.0' });
});

const server = app.listen(process.env.PORT || 5000, () =>
  console.log(`Bharat Seva AI backend on ${process.env.PORT || 5000}`)
);

['SIGTERM', 'SIGINT'].forEach((sig) =>
  process.on(sig, async () => {
    server.close();
    await mongoose.connection.close();
    redis.disconnect();
    process.exit(0);
  })
);