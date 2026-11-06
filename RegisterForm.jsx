// RegisterForm.jsx
import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s\-()]{7,15}$/;
const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,72}$/;

function validateStep1({ name, email, phone, password }) {
  const e = {};
  if (!name || name.trim().length < 2) e.name = 'Name must be at least 2 characters';
  if (!EMAIL_RE.test(email)) e.email = 'Invalid email';
  if (!PHONE_RE.test(phone)) e.phone = 'Invalid phone';
  if (!PWD_RE.test(password)) e.password = 'Min 8 chars with upper, lower, number, symbol';
  return e;
}

export default function RegisterForm({ onSuccess }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState('');
  const verifyLock = useRef(false);

  const onChange = useCallback(
    (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value })),
    []
  );

  const submitStep1 = async (e) => {
    e.preventDefault();
    setServerMsg('');
    const v = validateStep1(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    setLoading(true);
    try {
      await api.post('/api/register', form);
      setStep(2);
      setServerMsg('OTP sent to your email. Check inbox & spam.');
    } catch (err) {
      const data = err.response?.data;
      setServerMsg(data?.message || 'Registration failed');
      if (data?.errors) {
        const map = {};
        data.errors.forEach((x) => (map[x.path] = x.msg));
        setErrors(map);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    if (verifyLock.current) return;
    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: 'Enter 6-digit code' });
      return;
    }
    verifyLock.current = true;
    setLoading(true);
    setServerMsg('');
    try {
      const { data } = await api.post('/api/otp/verify', { email: form.email, otp });
      sessionStorage.setItem('token', data.token);
      onSuccess?.(data.user);
    } catch (err) {
      setServerMsg(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
      verifyLock.current = false;
    }
  };

  const resend = async () => {
    setServerMsg('');
    setLoading(true);
    try {
      await api.post('/api/otp/resend', { email: form.email });
      setServerMsg('New OTP sent.');
    } catch (err) {
      setServerMsg(err.response?.data?.message || 'Resend failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-card">
      {step === 1 && (
        <form onSubmit={submitStep1} noValidate>
          <h2>Create Account</h2>
          <input name="name" placeholder="Full name" value={form.name} onChange={onChange} autoComplete="name" />
          {errors.name && <small>{errors.name}</small>}

          <input name="email" type="email" placeholder="Email" value={form.email} onChange={onChange} autoComplete="email" />
          {errors.email && <small>{errors.email}</small>}

          <input name="phone" placeholder="Phone" value={form.phone} onChange={onChange} autoComplete="tel" />
          {errors.phone && <small>{errors.phone}</small>}

          <input name="password" type="password" placeholder="Password" value={form.password} onChange={onChange} autoComplete="new-password" />
          {errors.password && <small>{errors.password}</small>}

          <button disabled={loading} type="submit">{loading ? 'Sending OTP…' : 'Register'}</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitOtp} noValidate>
          <h2>Verify Email</h2>
          <p>Enter the 6-digit code sent to {form.email}</p>
          <input
            name="otp"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          {errors.otp && <small>{errors.otp}</small>}

          <button disabled={loading} type="submit">{loading ? 'Verifying…' : 'Verify'}</button>
          <button type="button" onClick={resend} disabled={loading}>Resend OTP</button>
        </form>
      )}

      {serverMsg && <div role="status">{serverMsg}</div>}
    </div>
  );
}