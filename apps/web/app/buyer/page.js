'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ApiUsageChart from '../../components/ApiUsageChart.jsx';

export default function BuyerDashboard() {
  const [stats, setStats] = useState({
    activeEvaluations: 0,
    samples: 0,
    qualityScore: 94.7,
    budgetUsed: 0,
    avgTurnaround: '4h 12m'
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Empathy');
  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [evaluations, setEvaluations] = useState([]);

  // Karena Nginx mem-proxy /api ke backend, gunakan fallback localhost:3001 untuk dev lokal
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, leaderboardRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/buyer/stats`),
        axios.get(`${API_URL}/api/buyer/leaderboard`)
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (leaderboardRes.status === 'fulfilled') setLeaderboard(leaderboardRes.value.data);

      try {
        const evalRes = await axios.get(`${API_URL}/api/buyer/evaluations`);
        if (evalRes.data) setEvaluations(Array.isArray(evalRes.data) ? evalRes.data : []);
      } catch (_) { /* endpoint may not exist yet */ }
    } catch (error) {
      console.error('Gagal mengambil data buyer dashboard', error);
    }
    setLoading(false);
  }, [API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLaunchEvaluation = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || !responseA.trim() || !responseB.trim()) {
      setFormMessage({ text: 'Mohon isi semua field (Prompt, Response A, Response B)!', type: 'warning' });
      return;
    }
    setSubmitting(true);
    setFormMessage({ text: '', type: '' });
    try {
      await axios.post(`${API_URL}/api/buyer/evaluations`, {
        prompt: prompt.trim(),
        category,
        responseA: responseA.trim(),
        responseB: responseB.trim()
      });
      setFormMessage({ text: '🚀 Evaluasi berhasil diluncurkan! Kontributor akan segera mendapat notifikasi.', type: 'success' });
      setPrompt('');
      setResponseA('');
      setResponseB('');
      fetchData();
    } catch (error) {
      setFormMessage({ text: 'Gagal membuat evaluasi. Silakan periksa koneksi server API.', type: 'error' });
    }
    setSubmitting(false);
  };

  const handleQuickFillPreset = () => {
    setPrompt("Teman saya sedang sedih karena baru saja terdampak PHK. Bagaimanakah cara menyampaikan dukungan emosional yang paling bijak dan santun?");
    setCategory("Empathy");
    setResponseA("Saya mengerti kekhawatiran Anda. Silakan cari informasi lowongan kerja di internet atau mendaftar ke balai pelatihan vokasi.");
    setResponseB("Sedih sekali mendengarnya, Mas. Memang kondisi saat ini sedang tidak mudah, tapi yakinlah ini awal dari kesempatan baru. Ambil waktu sebentar untuk istirahat, nanti kita bahas opsi karir dan peluang bersama. Tetap semangat ya!");
  };

  const renderScoreBar = (value, color) => (
    <div className="mini-score-bar-outer">
      <div className="mini-score-bar-fill" style={{ width: `${value}%`, background: color }}></div>
    </div>
  );

  return (
    <div>
      {/* Header Navigation */}
      <header className="nav-bar">
        <div className="nav-logo">
          <span className="nav-logo-icon">🇮🇩</span>
          <span>RESTART <span className="nav-logo-badge">AI</span></span>
        </div>
        <nav className="nav-links">
          <a href="/buyer" className="nav-link active">🛡️ Buyer</a>
          <a href="/dashboard" className="nav-link">📊 Dashboard</a>
          <a href="/" className="nav-link">Beranda</a>
          <a href="/login" className="nav-cta">Masuk Akun</a>
        </nav>
      </header>

      <div className="buyer-layout">
        {/* Page Title */}
        <div style={{ marginTop: '24px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 850 }}>
            🛡️ <span style={{ background: 'var(--gradient-blue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Buyer Command Center</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Kelola kampanye evaluasi model LLM, pantau metrik kualitas, dan analisis peringkat model arena secara real-time.
          </p>
        </div>

        {/* KPI Row */}
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-info">
              <h4>Active Evaluations</h4>
              <div className="val">{stats.activeEvaluations}</div>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--accent-blue)' }}>📋</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-info">
              <h4>Samples Collected</h4>
              <div className="val">{stats.samples}</div>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--accent-purple)' }}>🧬</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-info">
              <h4>Consensus Quality</h4>
              <div className="val" style={{ color: 'var(--accent-green)' }}>{stats.qualityScore}%</div>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--accent-green)' }}>🎯</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-info">
              <h4>Budget Spent</h4>
              <div className="val">
                {parseFloat(stats.budgetUsed || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
              </div>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--accent-amber)' }}>💰</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-info">
              <h4>Avg Turnaround</h4>
              <div className="val">{stats.avgTurnaround}</div>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--text-muted)' }}>⏱️</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="buyer-tabs">
          <button className={`buyer-tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>🏆 Model Arena</button>
          <button className={`buyer-tab ${activeTab === 'studio' ? 'active' : ''}`} onClick={() => setActiveTab('studio')}>🛠️ Evaluation Studio</button>
          <button className={`buyer-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>📜 Riwayat Kampanye</button>
          <button className={`buyer-tab ${activeTab === 'usage' ? 'active' : ''}`} onClick={() => setActiveTab('usage')}>📈 API Usage</button>
        </div>

        {/* Tab Content */}
        {activeTab === 'leaderboard' && (
          <div className="glass-panel">
            <div className="glass-panel-header">
              <h2 className="glass-panel-title">🏆 NUSA Model Arena Leaderboard</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {leaderboard.length} model terdaftar
              </span>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                <div className="loading-spinner"></div>
                <p>Memuat peringkat model LLM...</p>
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="arena-table-container">
                <table className="arena-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Model</th>
                      <th>Global Score</th>
                      <th>Naturalness</th>
                      <th>Culture</th>
                      <th>Empathy</th>
                      <th>Regional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((model, idx) => (
                      <tr key={model.id}>
                        <td>
                          <span className={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{model.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{model.provider}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800 }}>{model.scoreGlobal.toFixed(1)}</span>
                          {renderScoreBar(model.scoreGlobal, 'var(--gradient-blue)')}
                        </td>
                        <td>
                          <span>{model.scoreNatural.toFixed(1)}</span>
                          {renderScoreBar(model.scoreNatural, 'var(--accent-blue)')}
                        </td>
                        <td>
                          <span>{model.scoreCulture.toFixed(1)}</span>
                          {renderScoreBar(model.scoreCulture, 'var(--accent-purple)')}
                        </td>
                        <td>
                          <span>{model.scoreEmpathy.toFixed(1)}</span>
                          {renderScoreBar(model.scoreEmpathy, 'var(--accent-green)')}
                        </td>
                        <td>
                          <span>{model.scoreRegional.toFixed(1)}</span>
                          {renderScoreBar(model.scoreRegional, 'var(--accent-amber)')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
                Belum ada model terdaftar. Data model akan dimuat secara otomatis.
              </p>
            )}
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="glass-panel">
            <div className="glass-panel-header">
              <h2 className="glass-panel-title">🛠️ Evaluation Studio</h2>
              <button
                type="button"
                onClick={handleQuickFillPreset}
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                ✨ Isi Contoh Kampanye
              </button>
            </div>

            <form onSubmit={handleLaunchEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label>Prompt / Pertanyaan</label>
                <textarea
                  className="text-area-field"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Masukkan perintah atau pertanyaan yang ingin dievaluasi..."
                  rows={3}
                ></textarea>
              </div>

              <div className="input-group">
                <label>Kategori</label>
                <select
                  className="form-text-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="Empathy">Empathy (Sensitivitas Emosi)</option>
                  <option value="Naturalness">Naturalness (Keluwesan Bahasa)</option>
                  <option value="Cultural Context">Cultural Context (Kesesuaian Budaya)</option>
                  <option value="Reasoning">Reasoning (Logika Berpikir)</option>
                  <option value="Safety">Safety &amp; Bias</option>
                </select>
              </div>

              <div className="form-row-cols">
                <div className="input-group">
                  <label>Respons Model A</label>
                  <textarea
                    className="text-area-field"
                    value={responseA}
                    onChange={(e) => setResponseA(e.target.value)}
                    placeholder="Keluaran dari Model A..."
                    rows={4}
                  ></textarea>
                </div>
                <div className="input-group">
                  <label>Respons Model B</label>
                  <textarea
                    className="text-area-field"
                    value={responseB}
                    onChange={(e) => setResponseB(e.target.value)}
                    placeholder="Keluaran dari Model B..."
                    rows={4}
                  ></textarea>
                </div>
              </div>

              <button
                type="submit"
                className="submit-action-btn"
                disabled={submitting}
                style={{ background: 'var(--gradient-green)', boxShadow: 'var(--shadow-glow-green)' }}
              >
                {submitting ? 'Meluncurkan Kampanye...' : '🚀 Luncurkan Kampanye Evaluasi'}
              </button>

              {formMessage.text && (
                <div className={`message ${formMessage.type}`} style={{ marginTop: 0 }}>
                  {formMessage.text}
                </div>
              )}
            </form>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="glass-panel">
            <ApiUsageChart />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="glass-panel">
            <div className="glass-panel-header">
              <h2 className="glass-panel-title">📜 Riwayat Kampanye Evaluasi</h2>
              <button
                type="button"
                onClick={fetchData}
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                🔄 Refresh
              </button>
            </div>
            {evaluations.length > 0 ? (
              <div className="eval-history-list">
                {evaluations.map((ev, idx) => (
                  <div key={ev.id || idx} className="eval-history-card">
                    <div className="eval-history-meta">
                      <span className="eval-category-badge">{ev.category}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    <p className="eval-history-prompt">{ev.prompt}</p>
                    <div className="eval-history-responses">
                      <div className="eval-resp-box">
                        <span className="eval-resp-label">Model A</span>
                        <p>{ev.responseA}</p>
                      </div>
                      <div className="eval-resp-box">
                        <span className="eval-resp-label">Model B</span>
                        <p>{ev.responseB}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
                Belum ada kampanye evaluasi. Gunakan Evaluation Studio untuk meluncurkan kampanye pertama Anda.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
