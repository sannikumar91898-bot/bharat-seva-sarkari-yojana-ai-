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
      <h2>{step === "email" ? "Login / Register" : "Verify Email"}</h2>
      
      {step === "email" ? (
        <form onSubmit={handleSendOTP}>
          <input type="email" placeholder="Enter your email" value={email} 
                 onChange={(e) => setEmail(e.target.value)} required 
                 style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "10px" }}>
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP}>
          <p>OTP sent to: <b>{email}</b></p>
          <input type="text" placeholder="Enter 6-digit OTP" maxLength={6} value={otp} 
                 onChange={(e) => setOtp(e.target.value)} required 
                 style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <button type="submit" disabled={loading || otp.length !== 6} style={{ width: "100%", padding: "10px" }}>
            {loading ? "Verifying..." : "Verify & Login"}
          </button>
        </form>
      )}
      {message && <p style={{ color: "blue", marginTop: "10px" }}>{message}</p>}
    </div>
  );
}