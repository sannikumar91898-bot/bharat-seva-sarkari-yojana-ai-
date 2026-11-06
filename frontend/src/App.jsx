import { useState } from "react";
import RegisterForm from "./RegisterForm";
import SchemeFinder from "./SchemeFinder";

export default function App() {
  // चेक करें कि यूजर पहले से लॉगिन है या नहीं (Token मौजूद है या नहीं)
  const [verified, setVerified] = useState(
    Boolean(localStorage.getItem("authToken"))
  );

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setVerified(false);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>
        <h2>🇮🇳 Bharat Seva AI</h2>
        {verified && (
          <button onClick={handleLogout} style={{ padding: "8px 12px", background: "#ff4d4d", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            Logout
          </button>
        )}
      </header>

      <main style={{ marginTop: "20px" }}>
        {!verified ? (
          // अगर लॉगिन नहीं है, तो सिर्फ OTP फॉर्म दिखेगा
          <RegisterForm onVerified={() => setVerified(true)} />
        ) : (
          // अगर OTP वेरिफाई हो गया है, तो Scheme Finder दिखेगा
          <SchemeFinder />
        )}
      </main>
    </div>
  );
}