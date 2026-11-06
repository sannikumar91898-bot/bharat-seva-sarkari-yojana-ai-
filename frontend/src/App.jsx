import { useState } from "react";
import RegisterForm from "./RegisterForm";
import SchemeFinder from "./SchemeFinder";

export default function App() {
  const [verified, setVerified] = useState(Boolean(localStorage.getItem("authToken")));

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setVerified(false);
  };

  return (
    <div style={{ maxWidth: "500px", margin: "auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>🇮🇳 Bharat Seva AI</h1>
      {!verified ? (
        <RegisterForm onVerified={() => setVerified(true)} />
      ) : (
        <div>
          <button onClick={handleLogout} style={{ float: "right", marginBottom: "20px" }}>Logout</button>
          <SchemeFinder />
        </div>
      )}
    </div>
  );
}