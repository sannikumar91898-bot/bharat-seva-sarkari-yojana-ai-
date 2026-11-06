// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10kb' }));

// ---------- MongoDB Connection (Pool optimized) ----------
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 100,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

// ---------- Redis (OTP cache + rate limit store) ----------
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (t) => Math.min(t * 50, 2000),
});

// ---------- Schemas ----------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    isVerified: { type: Boolean, default: false, index: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);
userSchema.index({ createdAt: -1 });
const User = mongoose.model('User', userSchema);

// ---------- Helpers ----------
const OTP_TTL_SEC = 300; // 5 min
const OTP_MAX_ATTEMPTS = 5;

const otpKey = (type, identifier) => `otp:${type}:${identifier}`;
const otpAttemptsKey = (type, identifier) => `otp_attempts:${type}:${identifier}`;

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(otp, salt) {
  return crypto.createHmac('sha256', process.env.OTP_SECRET).update(`${otp}:${salt}`).digest('hex');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  pool: true, // connection pooling for high traffic
  maxConnections: 20,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendOtpEmail(email, otp) {
  await transporter.sendMail({
    from: `"App" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Your verification code',
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
  });
}

// ---------- Rate limiters (Redis-backed) ----------
const RedisStore = require('rate-limit-redis');
const registerLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  keyGenerator: (req) => req.ip,
});

const otpRequestLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  keyGenerator: (req) => req.body?.identifier || req.ip,
});

// ---------- Validation rules ----------
const registerRules = [
  body('name').isString().trim().isLength({ min: 2, max: 80 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('phone').isMobilePhone('any'),
  body('password')
    .isLength({ min: 8, max: 72 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain upper, lower, number & special char'),
];

// ---------- Routes ----------

// Step 1: Register -> creates unverified user, sends OTP
app.post('/api/register', registerLimiter, registerRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, phone, password } = req.body;

  try {
    // Check existing (efficient single query, covered by unique indexes)
    const existing = await User.findOne({ $or: [{ email }, { phone }] })
      .select('_id email phone')
      .lean();
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 12);

    // Insert — rely on unique indexes to guard races
    let user;
    try {
      user = await User.create({ name, email, phone, passwordHash, isVerified: false });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'User already exists' });
      throw e;
    }

    const otp = generateOtp();
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = hashOtp(otp, salt);

    // Atomic write with TTL
    await redis
      .multi()
      .set(otpKey('email', email), JSON.stringify({ hash: otpHash, salt }), 'EX', OTP_TTL_SEC)
      .del(otpAttemptsKey('email', email))
      .exec();

    // Fire and forget — do not block response on SMTP
    sendOtpEmail(email, otp).catch((err) => console.error('OTP email failed:', err.message));

    return res.status(201).json({ message: 'OTP sent', userId: user._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Step 2: Resend OTP
app.post(
  '/api/otp/resend',
  otpRequestLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;
    const user = await User.findOne({ email, isVerified: false }).select('_id').lean();
    if (!user) return res.status(404).json({ message: 'Pending registration not found' });

    const otp = generateOtp();
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = hashOtp(otp, salt);

    await redis
      .multi()
      .set(otpKey('email', email), JSON.stringify({ hash: otpHash, salt }), 'EX', OTP_TTL_SEC)
      .del(otpAttemptsKey('email', email))
      .exec();

    sendOtpEmail(email, otp).catch((err) => console.error('OTP email failed:', err.message));
    return res.json({ message: 'OTP resent' });
  }
);

// Step 3: Verify OTP -> activate user + issue JWT
app.post(
  '/api/otp/verify',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, otp } = req.body;
    const key = otpKey('email', email);
    const attKey = otpAttemptsKey('email', email);

    // Atomic attempt counter (prevents brute force under concurrency)
    const attempts = await redis.incr(attKey);
    if (attempts === 1) await redis.expire(attKey, OTP_TTL_SEC);
    if (attempts > OTP_MAX_ATTEMPTS) {
      await redis.del(key);
      return res.status(429).json({ message: 'Too many attempts. Request a new OTP.' });
    }

    const raw = await redis.get(key);
    if (!raw) return res.status(400).json({ message: 'OTP expired or not found' });

    const { hash, salt } = JSON.parse(raw);
    const providedHash = hashOtp(otp, salt);

    // Timing-safe compare
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(providedHash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Atomically mark user verified (idempotent-safe)
    const updated = await User.findOneAndUpdate(
      { email, isVerified: false },
      { $set: { isVerified: true, lastLoginAt: new Date() } },
      { new: true, projection: { _id: 1, name: 1, email: 1 } }
    ).lean();

    if (!updated) {
      // Already verified or user missing — still clean OTP
      await redis.multi().del(key).del(attKey).exec();
      return res.status(400).json({ message: 'Verification not applicable' });
    }

    await redis.multi().del(key).del(attKey).exec();

    const token = jwt.sign(
      { sub: String(updated._id), email: updated.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    return res.json({
      message: 'Verified',
      token,
      user: { id: updated._id, name: updated.name, email: updated.email },
    });
  }
);

// Health (for load balancers)
app.get('/health', async (_req, res) => {
  const ok = mongoose.connection.readyState === 1 && redis.status === 'ready';
  res.status(ok ? 200 : 503).json({ ok });
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`API listening on ${PORT}`));

// Graceful shutdown for rolling deploys
['SIGTERM', 'SIGINT'].forEach((sig) =>
  process.on(sig, async () => {
    server.close();
    await mongoose.connection.close();
    redis.disconnect();
    process.exit(0);
  })
);