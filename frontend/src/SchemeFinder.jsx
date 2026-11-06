import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function SchemeFinder() {
  const [form, setForm] = useState({ age: "", income: "", state: "Bihar", occupation: "Farmer" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true); setResult("");
    try {
      const token = localStorage.getItem("authToken");
      const res = await axios.post(`${API}/api/schemes/find`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(res.data.result);
    } catch (err) {
      setResult(err.response?.data?.message || "Error fetching schemes");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px" }}>
      <h3>AI Scheme Finder</h3>
      <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input type="number" placeholder="Age" value={form.age} onChange={(e) => setForm({...form, age: e.target.value})} required style={{ padding: "10px" }} />
        <input type="number" placeholder="Annual Income (₹)" value={form.income} onChange={(e) => setForm({...form, income: e.target.value})} required style={{ padding: "10px" }} />
        <select value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} style={{ padding: "10px" }}>
          <option value="Bihar">Bihar</option>
          <option value="UP">Uttar Pradesh</option>
        </select>
        <select value={form.occupation} onChange={(e) => setForm({...form, occupation: e.target.value})} style={{ padding: "10px" }}>
          <option value="Farmer">Farmer</option>
          <option value="Student">Student</option>
        </select>
        <button type="submit" disabled={loading} style={{ padding: "10px", background: "#007bff", color: "white", border: "none" }}>
          {loading ? "AI Thinking..." : "Find Schemes"}
        </button>
      </form>
      {result && (
        <div style={{ marginTop: "20px", padding: "15px", background: "#f4f4f4", whiteSpace: "pre-wrap" }}>
          {result}
        </div>
      )}
    </div>
  );
}