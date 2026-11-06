import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function RegisterForm({ onVerified }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage("");
    try {
      const res = await axios.post(`${API}/api/auth/send-otp`, { email });
      setStep("otp"); setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error sending OTP");
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage("");
    try {
      const res = await axios.post(`${API}/api/auth/verify-otp`, { email, otp });
      localStorage.setItem("authToken", res.data.token);
      onVerified();
    } catch (err) {
      setMessage(err.response?.data?.message || "Invalid OTP");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px" }}>
      <h3 style={{ textAlign: "center" }}>{step === "email" ? "Email Registration" : "Verify Email"}</h3>
      {step === "email" ? (
        <form onSubmit={handleSendOTP} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: "10px" }} />
          <button type="submit" disabled={loading} style={{ padding: "10px", background: "#007bff", color: "white", border: "none" }}>
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p>OTP sent to: <b>{email}</b></p>
          <input type="text" placeholder="6-digit OTP" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} required style={{ padding: "10px" }} />
          <button type="submit" disabled={loading || otp.length !== 6} style={{ padding: "10px", background: "#28a745", color: "white", border: "none" }}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      )}
      {message && <p style={{ color: "red", marginTop: "10px" }}>{message}</p>}
    </div>
  );
}