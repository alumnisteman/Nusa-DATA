'use client';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('restart_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      const decoded = JSON.parse(atob(token));
      setUser(decoded);
    } catch {
      localStorage.removeItem('restart_token');
      window.location.href = '/login';
      return;
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('restart_token');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <>
        <header className="nav-bar">
          <div className="nav-logo">
            <span className="nav-logo-icon">🇮🇩</span>
            <span>RESTART <span className="nav-logo-badge">AI</span></span>
          </div>
        </header>
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Memuat dashboard...</p>
        </div>
      </>
    );
  }

  const quickActions = [
    { icon: '🧬', title: 'Work DNA', desc: 'Mulai AI Interview untuk analisis profil karir Anda', href: '#', color: 'blue' },
    { icon: '💼', title: 'Experience Bank', desc: 'Simpan dan verifikasi pengalaman kerja nyata', href: '#', color: 'green' },
    { icon: '🎯', title: 'Opportunity Engine', desc: 'Temukan peluang kerja, bisnis, dan AI Work', href: '#', color: 'amber' },
    { icon: '📚', title: 'Knowledge Legacy', desc: 'Bagikan pengetahuan dan pengalaman Anda', href: '#', color: 'purple' },
  ];

  const journeySteps = [
    { step: 1, title: 'Profil Lengkap', desc: 'Lengkapi data profil Anda', status: 'current', icon: '👤' },
    { step: 2, title: 'Work DNA Interview', desc: 'AI menganalisis profil karir Anda', status: 'locked', icon: '🧬' },
    { step: 3, title: 'Skill Assessment', desc: 'Pemetaan skill dan kompetensi', status: 'locked', icon: '📊' },
    { step: 4, title: 'Opportunity Match', desc: 'Rekomendasi peluang yang cocok', status: 'locked', icon: '🎯' },
    { step: 5, title: 'Action Plan', desc: 'Rencana aksi pemulihan karir', status: 'locked', icon: '🚀' },
  ];

  return (
    <>
      {/* Navigation */}
      <header className="nav-bar">
        <div className="nav-logo">
          <span className="nav-logo-icon">🇮🇩</span>
          <span>RESTART <span className="nav-logo-badge">AI</span></span>
        </div>
        <nav className="nav-links">
          <a href="/dashboard" className="nav-link active">Dashboard</a>
          <a href="/" className="nav-link">Beranda</a>
          <button onClick={handleLogout} className="nav-cta" style={{ background: 'var(--gradient-red)' }}>
            Keluar
          </button>
        </nav>
      </header>

      <div className="dashboard-container">
        {/* Welcome Section */}
        <section className="dashboard-welcome">
          <div className="dashboard-welcome-glow"></div>
          <div className="dashboard-welcome-content">
            <h1 className="dashboard-welcome-title">
              Selamat Datang, <span className="hero-title-gradient">{user?.fullName || user?.email || 'Pengguna'}</span>
            </h1>
            <p className="dashboard-welcome-subtitle">
              Mulai perjalanan pemulihan dan akselerasi karir Anda dengan RESTART AI.
            </p>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="dashboard-stats">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon" style={{ background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)' }}>📊</div>
            <div className="dashboard-stat-info">
              <span className="dashboard-stat-value">—</span>
              <span className="dashboard-stat-label">Skill Teridentifikasi</span>
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon" style={{ background: 'var(--accent-green-glow)', color: 'var(--accent-green)' }}>💼</div>
            <div className="dashboard-stat-info">
              <span className="dashboard-stat-value">—</span>
              <span className="dashboard-stat-label">Pengalaman Tercatat</span>
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon" style={{ background: 'var(--accent-amber-glow)', color: 'var(--accent-amber)' }}>🎯</div>
            <div className="dashboard-stat-info">
              <span className="dashboard-stat-value">—</span>
              <span className="dashboard-stat-label">Peluang Tersedia</span>
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon" style={{ background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)' }}>🏆</div>
            <div className="dashboard-stat-info">
              <span className="dashboard-stat-value">—</span>
              <span className="dashboard-stat-label">Skor Kesiapan</span>
            </div>
          </div>
        </section>

        {/* Journey Progress */}
        <section className="dashboard-section">
          <h2 className="dashboard-section-title">🗺️ Perjalanan Pemulihan Karir</h2>
          <p className="dashboard-section-subtitle">Ikuti langkah-langkah berikut untuk memaksimalkan potensi Anda</p>
          <div className="journey-timeline">
            {journeySteps.map((item, i) => (
              <div key={i} className={`journey-step ${item.status}`}>
                <div className="journey-step-marker">
                  <span className="journey-step-icon">{item.icon}</span>
                  {i < journeySteps.length - 1 && <div className="journey-step-line"></div>}
                </div>
                <div className="journey-step-content">
                  <div className="journey-step-header">
                    <span className="journey-step-number">Langkah {item.step}</span>
                    {item.status === 'current' && <span className="journey-badge-current">Saat Ini</span>}
                    {item.status === 'locked' && <span className="journey-badge-locked">🔒</span>}
                  </div>
                  <h3 className="journey-step-title">{item.title}</h3>
                  <p className="journey-step-desc">{item.desc}</p>
                  {item.status === 'current' && (
                    <button className="btn-primary" style={{ marginTop: '12px', padding: '10px 20px', fontSize: '0.8rem' }}>
                      Mulai Sekarang →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="dashboard-section">
          <h2 className="dashboard-section-title">⚡ Aksi Cepat</h2>
          <div className="dashboard-actions-grid">
            {quickActions.map((action, i) => (
              <a key={i} href={action.href} className={`dashboard-action-card color-${action.color}`}>
                <div className="dashboard-action-icon">{action.icon}</div>
                <h3 className="dashboard-action-title">{action.title}</h3>
                <p className="dashboard-action-desc">{action.desc}</p>
                <span className="dashboard-action-link">Mulai →</span>
              </a>
            ))}
          </div>
        </section>

        {/* Info Notice */}
        <section className="dashboard-section">
          <div className="dashboard-notice">
            <span className="dashboard-notice-icon">ℹ️</span>
            <div>
              <strong>Data Riil — Tanpa Data Palsu</strong>
              <p>RESTART AI hanya menampilkan data nyata. Semua informasi yang Anda lihat berdasarkan data yang Anda masukkan dan sumber terverifikasi. Jika data belum tersedia, akan ditampilkan "Belum ada data".</p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>© 2026 RESTART AI — Human Capital Recovery & Second-Life OS</p>
      </footer>
    </>
  );
}
