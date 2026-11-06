import { useState, useCallback } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL });

const LANGS = [
  { code: 'hi', label: 'हिंदी' }, { code: 'en', label: 'English' },
  { code: 'bho', label: 'भोजपुरी' }, { code: 'mai', label: 'मैथिली' },
  { code: 'ur', label: 'اردو' }, { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' }, { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'ta', label: 'தமிழ்' }, { code: 'te', label: 'తెలుగు' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' }, { code: 'gu', label: 'ગુજરાતી' },
];

const STATES = [
  { code: 'BR', label: 'बिहार' }, { code: 'UP', label: 'उत्तर प्रदेश' },
  { code: 'JH', label: 'झारखंड' }, { code: 'MP', label: 'मध्य प्रदेश' },
  { code: 'RJ', label: 'राजस्थान' }, { code: 'OD', label: 'ओडिशा' },
  { code: 'WB', label: 'पश्चिम बंगाल' }, { code: 'CG', label: 'छत्तीसगढ़' },
  { code: 'MH', label: 'महाराष्ट्र' }, { code: 'DL', label: 'दिल्ली' },
  { code: 'GJ', label: 'गुजरात' }, { code: 'PB', label: 'पंजाब' },
  { code: 'TN', label: 'तमिलनाडु' }, { code: 'AP', label: 'आंध्र प्रदेश' },
  { code: 'TS', label: 'तेलंगाना' }, { code: 'KA', label: 'कर्नाटक' },
  { code: 'KL', label: 'केरल' }, { code: 'AS', label: 'असम' },
];

export default function SchemeFinder() {
  const [lang, setLang] = useState('hi');
  const [form, setForm] = useState({
    age: '', annualIncome: '', gender: 'male', caste: 'general',
    occupation: 'farmer', education: 'graduate', residency: 'rural', state: 'BR',
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback((k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value })), []);

  const findSchemes = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.age || +form.age < 0 || +form.age > 120) {
      setError('कृपया सही उम्र दर्ज करें');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/schemes/match', {
        ...form, age: +form.age, annualIncome: +form.annualIncome || 0, lang,
      });
      setResults(data.matches);
    } catch (err) {
      setError(err.response?.data?.error || 'सर्वर त्रुटि');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '20px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>भारत सेवा AI</h1>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="भाषा">
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </header>

      <form onSubmit={findSchemes} style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', marginTop: 20 }}>
        <input placeholder="उम्र" type="number" min="0" max="120" value={form.age} onChange={update('age')} required />
        <input placeholder="वार्षिक आय (₹)" type="number" min="0" value={form.annualIncome} onChange={update('annualIncome')} />

        <select value={form.gender} onChange={update('gender')}>
          <option value="male">पुरुष</option><option value="female">महिला</option><option value="other">अन्य</option>
        </select>

        <select value={form.caste} onChange={update('caste')}>
          <option value="general">सामान्य</option><option value="obc">OBC</option>
          <option value="sc">SC</option><option value="st">ST</option><option value="ews">EWS</option>
        </select>

        <select value={form.occupation} onChange={update('occupation')}>
          <option value="farmer">किसान</option><option value="student">विद्यार्थी</option>
          <option value="laborer">मजदूर</option><option value="business">व्यवसाय</option>
          <option value="salaried">नौकरीपेशा</option><option value="unemployed">बेरोजगार</option>
        </select>

        <select value={form.state} onChange={update('state')}>
          {STATES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>

        <select value={form.residency} onChange={update('residency')}>
          <option value="rural">ग्रामीण</option><option value="urban">शहरी</option>
        </select>

        <button type="submit" disabled={loading} style={{ padding: 12, gridColumn: '1 / -1', fontWeight: 'bold' }}>
          {loading ? 'खोज रहे हैं…' : 'मेरे लिए योजनाएँ खोजें'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginTop: 24 }}>
        {results.map((s) => (
          <div key={s.schemeId} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{s.name}</h3>
              <span style={{
                background: s.eligible ? '#e6ffe6' : '#fff4e6',
                padding: '2px 8px', borderRadius: 12, fontSize: 12,
              }}>
                {s.eligible ? '✅ पात्र' : `⚠️ ${s.score}% मैच`}
              </span>
            </div>
            <p style={{ margin: '8px 0', color: '#555' }}>{s.purpose}</p>
            <p><strong>लाभ:</strong> {s.benefitAmount || 'जानकारी उपलब्ध नहीं'}</p>
            {s.failedChecks?.length > 0 && (
              <details>
                <summary>क्यों पूरी तरह पात्र नहीं</summary>
                <ul>{s.failedChecks.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </details>
            )}
            <a href={s.officialUrl} target="_blank" rel="noopener noreferrer"
               style={{ display: 'inline-block', marginTop: 8, color: '#0066cc' }}>
              आधिकारिक वेबसाइट →
            </a>
          </div>
        ))}
        {!loading && results.length === 0 && form.age && (
          <p style={{ textAlign: 'center', color: '#888' }}>कोई योजना नहीं मिली — फ़िल्टर बदलकर दोबारा प्रयास करें</p>
        )}
      </div>
    </div>
  );
}