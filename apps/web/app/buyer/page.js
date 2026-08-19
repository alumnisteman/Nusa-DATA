'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export default function BuyerDashboard() {
  const [stats, setStats] = useState({
    activeEvaluations: 0,
    samples: 0,
    qualityScore: 94.7,
    budgetUsed: 'Rp 0',
    avgTurnaround: '4h 12m'
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // New evaluation form fields
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Empathy');
  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ text: '', type: '' });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get dashboard stats
      const statsRes = await axios.get(`${API_URL}/api/buyer/stats`);
      setStats(statsRes.data);

      // Get model arena leaderboard
      const leaderboardRes = await axios.get(`${API_URL}/api/buyer/leaderboard`);
      setLeaderboard(leaderboardRes.data);
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
      
      // Reset form
      setPrompt('');
      setResponseA('');
      setResponseB('');

      // Refresh stats & leaderboard
      fetchData();
    } catch (error) {
      setFormMessage({ text: 'Gagal membuat evaluasi. Silakan periksa koneksi server API.', type: 'error' });
    }
    setSubmitting(false);
  };

  return (
    <div className="buyer-layout">
      {/* 🚀 Header */}
      <div style={{ marginBottom: '8px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 850 }}>
          🛡️ <span className="gradient-text" style={{ background: 'var(--gradient-blue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Buyer Command Center</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Kelola kampanye evaluasi model LLM Anda, pantau metrik kualitas, dan analisis model arena secara real-time.
        </p>
      </div>

      {/* 📊 KPI Row */}
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
              {parseFloat(stats.budgetUsed || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).replace("Rp", "Rp ")}
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

      {/* 📊 Split Layout: Leaderboard vs Creator Studio */}
      <div className="dashboard-grid">
        {/* Kiri: Leaderboard Model Arena */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel-header">
            <h2 className="glass-panel-title">🏆 NUSA Model Arena Leaderboard</h2>
          </div>

          {loading ? (
            <div className="loading-skeleton">
              <div className="skeleton-pulse" />
              <p className="loading-text">Memuat peringkat model LLM...</p>
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
                        <span className={`rank-badge rank-${idx + 1}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{model.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{model.provider}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{model.scoreGlobal.toFixed(1)}</span>
                        <div className="mini-score-bar-outer">
                          <div className="mini-score-bar-fill" style={{ width: `${model.scoreGlobal}%`, background: 'var(--gradient-blue)' }} />
                        </div>
                      </td>
                      <td>
                        <span>{model.scoreNatural.toFixed(1)}</span>
                        <div className="mini-score-bar-outer">
                          <div className="mini-score-bar-fill" style={{ width: `${model.scoreNatural}%`, background: 'var(--accent-blue)' }} />
                        </div>
                      </td>
                      <td>
                        <span>{model.scoreCulture.toFixed(1)}</span>
                        <div className="mini-score-bar-outer">
                          <div className="mini-score-bar-fill" style={{ width: `${model.scoreCulture}%`, background: 'var(--accent-purple)' }} />
                        </div>
                      </td>
                      <td>
                        <span>{model.scoreEmpathy.toFixed(1)}</span>
                        <div className="mini-score-bar-outer">
                          <div className="mini-score-bar-fill" style={{ width: `${model.scoreEmpathy}%`, background: 'var(--accent-green)' }} />
                        </div>
                      </td>
                      <td>
                        <span>{model.scoreRegional.toFixed(1)}</span>
                        <div className="mini-score-bar-outer">
                          <div className="mini-score-bar-fill" style={{ width: `${model.scoreRegional}%`, background: 'var(--accent-amber)' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>
              Belum ada model terdaftar. Silakan jalankan seeder untuk mengisi data model.
            </p>
          )}
        </div>

        {/* Kanan: Creator Studio */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel-header">
            <h2 className="glass-panel-title">🛠️ Evaluation Studio</h2>
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
              />
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
                <option value="Safety">Safety & Bias</option>
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
                />
              </div>

              <div className="input-group">
                <label>Respons Model B</label>
                <textarea
                  className="text-area-field"
                  value={responseB}
                  onChange={(e) => setResponseB(e.target.value)}
                  placeholder="Keluaran dari Model B..."
                  rows={4}
                />
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
      </div>
    </div>
  );
}
