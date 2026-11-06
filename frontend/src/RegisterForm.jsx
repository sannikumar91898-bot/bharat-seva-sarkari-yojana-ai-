import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function RegisterForm({ onVerified }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email"); // 'email' या 'otp'
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: OTP भेजने का फंक्शन
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post(`${API}/api/auth/send-otp`, { email });
      setStep("otp");
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "OTP भेजने में समस्या आई।");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: OTP वेरिफाई करने का फंक्शन
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post(`${API}/api/auth/verify-otp`, { email, otp });
      
      // टोकन सेव करें और अगले पेज (SchemeFinder) पर भेजें
      localStorage.setItem("authToken", res.data.token);
      onVerified();

    } catch (err) {
      setMessage(err.response?.data?.message || "गलत OTP! कृपया दोबारा प्रयास करें।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
      <h3 style={{ textAlign: "center", marginBottom: "20px" }}>
        {step === "email" ? "ईमेल से रजिस्टर करें" : "ईमेल वेरिफाई करें"}
      </h3>

      {step === "email" ? (
        <form onSubmit={handleSendOTP} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <input
            type="email"
            placeholder="अपना ईमेल पता दर्ज करें"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: "10px", fontSize: "16px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
          <button type="submit" disabled={loading} style={{ padding: "10px", fontSize: "16px", background: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "भेज रहे हैं..." : "OTP भेजें"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#555" }}>
            OTP भेजा गया है: <b>{email}</b>
          </p>
          <input
            type="text"
            placeholder="6-अंकों का OTP दर्ज करें"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
            style={{ padding: "10px", fontSize: "18px", letterSpacing: "5px", textAlign: "center", borderRadius: "5px", border: "1px solid #ccc" }}
          />
          <button type="submit" disabled={loading || otp.length !== 6} style={{ padding: "10px", fontSize: "16px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: (loading || otp.length !== 6) ? "not-allowed" : "pointer" }}>
            {loading ? "वेरिफाई हो रहा है..." : "वेरिफाई करें"}
          </button>
          
          <button type="button" onClick={() => { setStep("email"); setOtp(""); setMessage(""); }} style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", textDecoration: "underline" }}>
            ईमेल बदलें
          </button>
        </form>
      )}

      {message && <p style={{ marginTop: "15px", color: "red", textAlign: "center" }}>{message}</p>}
    </div>
  );
}