import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function SchemeFinder() {
  const [form, setForm] = useState({
    age: "",
    income: "",
    state: "Bihar",
    occupation: "Farmer",
    lang: "Hindi"
  });
  
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // इनपुट बदलने का फंक्शन
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // AI से स्कीम खोजने का फंक्शन
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult("");

    try {
      const token = localStorage.getItem("authToken");
      
      const res = await axios.post(`${API}/api/schemes/find`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResult(res.data.result);

    } catch (err) {
      setResult(err.response?.data?.message || "AI से जानकारी लाने में समस्या हुई।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
      <h3 style={{ textAlign: "center", marginBottom: "20px" }}>AI सरकारी योजना खोजक</h3>

      <form onSubmit={handleSearch} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
        <input 
          type="number" 
          name="age"
          placeholder="आपकी उम्र (Age)" 
          value={form.age} 
          onChange={handleChange} 
          required 
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />
        
        <input 
          type="number" 
          name="income"
          placeholder="वार्षिक आय (₹)" 
          value={form.income} 
          onChange={handleChange} 
          required 
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />

        <select name="state" value={form.state} onChange={handleChange} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}>
          <option value="Bihar">बिहार (Bihar)</option>
          <option value="UP">उत्तर प्रदेश (UP)</option>
          <option value="Jharkhand">झारखंड (Jharkhand)</option>
          <option value="Other">अन्य राज्य (Other)</option>
        </select>

        <select name="occupation" value={form.occupation} onChange={handleChange} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}>
          <option value="Farmer">किसान (Farmer)</option>
          <option value="Student">छात्र (Student)</option>
          <option value="Business">व्यापारी (Business)</option>
          <option value="Laborer">मजदूर (Laborer)</option>
          <option value="Unemployed">बेरोजगार (Unemployed)</option>
        </select>

        <button type="submit" disabled={loading} style={{ gridColumn: "1 / -1", padding: "12px", fontSize: "16px", background: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "AI खोज रहा है..." : "मेरे लिए योजनाएं खोजें"}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: "20px", padding: "15px", background: "#f8f9fa", borderRadius: "5px", borderLeft: "5px solid #28a745", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
          <h4 style={{ marginTop: 0 }}>AI का सुझाव:</h4>
          {result}
        </div>
      )}
    </div>
  );
}