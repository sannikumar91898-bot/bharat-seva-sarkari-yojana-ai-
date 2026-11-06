import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { createClient } from "redis";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "10kb" }));

// --- DATABASE & REDIS ---
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("MongoDB Connected"));

const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", (err) => console.error("Redis Error", err));
await redis.connect();

// --- MODELS (No Phone, Only Email) ---
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  emailVerified: { type: Boolean, default: false }
}, { timestamps: true });
const User = mongoose.model("User", userSchema);

// --- HELPERS ---
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const otpHash = (email, otp) => crypto.createHmac("sha256", process.env.OTP_SECRET).update(`${email}:${otp}`).digest("hex");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// --- AUTH MIDDLEWARE ---
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Please login first." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Login again." });
  }
};

// --- ROUTES: OTP ---
app.post("/api/auth/send-otp", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!validEmail(email)) return res.status(400).json({ message: "Invalid email." });

  const cooldown = await redis.set(`otp:cd:${email}`, "1", { NX: true, EX: 60 });
  if (!cooldown) return res.status(429).json({ message: "Wait 60 seconds before requesting again." });

  const otp = crypto.randomInt(100000, 1000000).toString();
  await redis.set(`otp:code:${email}`, otpHash(email, otp), { EX: 300 });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Your Verification Code",
      html: `<h2>Your OTP is: <b>${otp}</b></h2><p>Valid for 5 minutes.</p>`
    });
    res.json({ message: "OTP sent successfully!" });
  } catch (err) {
    await redis.del(`otp:code:${email}`);
    res.status(500).json({ message: "Email sending failed." });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "");
  if (!validEmail(email) || otp.length !== 6) return res.status(400).json({ message: "Invalid format." });

  const savedHash = await redis.get(`otp:code:${email}`);
  if (!savedHash) return res.status(400).json({ message: "OTP expired or not found." });

  const submittedHash = otpHash(email, otp);
  if (savedHash !== submittedHash) return res.status(401).json({ message: "Incorrect OTP." });

  await redis.del(`otp:code:${email}`);
  await redis.del(`otp:cd:${email}`);

  const user = await User.findOneAndUpdate({ email }, { emailVerified: true }, { new: true, upsert: true });
  const token = jwt.sign({ userId: user._id, email }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.json({ success: true, message: "Verified!", token, user: { email: user.email } });
});

// --- ROUTES: AI SCHEME FINDER ---
app.post("/api/schemes/find", authenticate, async (req, res) => {
  const { age, income, state, occupation, lang = "Hindi" } = req.body;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are Bharat Seva AI. The user is from ${state}, Age: ${age}, Income: ₹${income}, Occupation: ${occupation}.
      List 3 relevant Indian/Bihar government schemes for them.
      Return response ONLY in ${lang} language.
      Format: 
      1. Scheme Name
      2. Benefit
      3. Official Link (Must be a real .gov.in link)
    `;

    const result = await model.generateContent(prompt);
    res.json({ success: true, result: result.response.text() });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "AI failed to find schemes." });
  }
});

app.get("/", (req, res) => res.send("Bharat Seva AI Backend Running..."));

app.listen(process.env.PORT || 5000, () => console.log(`Server on port ${process.env.PORT || 5000}`));