'use client';

import Link from 'next/link';
export default function Home() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Golden Rule flow items sesuai README.md bagian 45
  const goldenFlow = [
    'Real People', 'Real Experience', 'Real Evidence', 'Real Skills',
    'Real Opportunities', 'Real Work', 'Real Transactions',
    'Real Reputation', 'Real Human Intelligence'
  ];

  // Feature cards sesuai arsitektur README.md
  const features = [
    {
      icon: '🔴',
      title: 'PHK Recovery',
      desc: 'Analisis profil korban PHK, rencana pemulihan karir, dan rekomendasi pelatihan berbasis AI untuk transisi cepat ke peluang baru.',
      tags: ['Profil PHK', 'Recovery Plan', 'Skill Gap', 'Retraining'],
      color: 'red',
      slug: 'phk-recovery'
    },
    {
      icon: '🟣',
      title: 'Retirement Engine',
      desc: 'Retirement countdown, ekstraksi pengalaman, penemuan karir kedua, mentoring, knowledge legacy, dan perencanaan pendapatan.',
      tags: ['Countdown', 'Second Career', 'Mentoring', 'Income Planning'],
      color: 'purple',
      slug: 'retirement-engine'
    },
    {
      icon: '🔵',
      title: 'Work DNA',
      desc: 'AI interview mendalam yang menganalisis career history, problem solving, leadership, communication, tools, achievements, dan domain knowledge.',
      tags: ['AI Interview', 'Skill Candidates', 'AI_ASSISTED'],
      color: 'blue',
      slug: 'work-dna'
    },
    {
      icon: '🟢',
      title: 'Experience Bank',
      desc: 'Simpan dan verifikasi pengalaman kerja nyata dengan Problem-Action-Result framework, evidence, dan verification status.',
      tags: ['PAR Framework', 'Evidence', 'Verified'],
      color: 'green',
      slug: 'experience-bank'
    },
    {
      icon: '🟡',
      title: 'Opportunity Engine',
      desc: 'Penemuan peluang nyata: Job, Freelance, Business, Consulting, Mentoring, AI Work, dan Digital Product — semua dengan source tracking.',
      tags: ['Job', 'Business', 'AI Work', 'Source Tracking'],
      color: 'amber',
      slug: 'opportunity-engine'
    },
    {
      icon: '🔷',
      title: 'NUSA Integration',
      desc: 'Kualifikasi → Training → Simulasi → Sertifikasi → Task Marketplace → Human Evaluation → Quality Control → Payment.',
      tags: ['Training', 'Certification', 'QA', 'Payout'],
      color: 'teal',
      slug: 'nusa-integration'
    }
  ];

  // Data pipeline sesuai README.md bagian 18
  const pipeline = [
    { icon: '📡', label: 'External\nSource' },
    { icon: '💾', label: 'Raw\nStorage' },
    { icon: '✅', label: 'Validation' },
    { icon: '🔧', label: 'Normalization' },
    { icon: '📊', label: 'Quality\nCheck' },
    { icon: '👤', label: 'Human\nReview' },
    { icon: '🏛️', label: 'Production\nDataset' }
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
          <a href="/" className="nav-link active">Beranda</a>
          <a href="#fitur" className="nav-link">Fitur</a>
          <a href="/bantuan" className="nav-link">Bantuan</a>
          <a href="/dokumentasi" className="nav-link">Dokumentasi</a>
          <a href="#arsitektur" className="nav-link">Arsitektur</a>
          <a href="#data" className="nav-link">Data Pipeline</a>
          <a href="/register" className="nav-cta">Mulai Sekarang →</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-glow" />
        <div className="hero-badge">
          🚀 Platform Pemulihan & Akselerasi Karir Indonesia
        </div>
        <h1 className="hero-title">
          Bangkit Kembali dengan<br />
          <span className="hero-title-gradient">RESTART AI</span>
        </h1>
        <p className="hero-subtitle">
          Platform berbasis AI untuk membantu korban PHK, pensiunan, dan calon pensiunan 
          membangun karir baru. Dari Work DNA hingga Opportunity Engine — 
          semua berdasarkan data nyata, pengalaman nyata, dan peluang nyata.
        </p>
        <div className="hero-actions">
          <a href="/register" className="btn-primary">
            Daftar Gratis →
          </a>
          <a href="#fitur" className="btn-secondary">
            Pelajari Fitur
          </a>
        </div>
      </section>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-number">6</div>
          <div className="stat-label">Modul Utama</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">3</div>
          <div className="stat-label">Sumber Data Resmi</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">7</div>
          <div className="stat-label">Tipe Peluang</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">9</div>
          <div className="stat-label">Phase Roadmap</div>
        </div>
      </div>

      {/* Features */}
      <section id="fitur" className="section">
        <div className="section-header">
          <div className="section-badge">Modul Inti</div>
          <h2 className="section-title">Ekosistem Lengkap untuk Karir Baru</h2>
          <p className="section-desc">
            Setiap modul dirancang untuk mengubah pengalaman dan keahlian Anda 
            menjadi peluang nyata — tanpa data palsu, tanpa janji kosong.
          </p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <Link key={i} href={`/fitur/${f.slug}`} className="feature-card-link">
              <div className={`feature-card ${f.color}`}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                <div className="feature-tags">
                  {f.tags.map((tag, j) => (
                    <span key={j} className="feature-tag">{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section id="arsitektur" className="section">
        <div className="section-header">
          <div className="section-badge">Arsitektur</div>
          <h2 className="section-title">Human Capital Graph</h2>
          <p className="section-desc">
            Arsitektur RESTART AI menghubungkan setiap lapisan dari identitas pengguna 
            hingga peluang kerja dan human intelligence.
          </p>
        </div>
        <div className="arch-flow">
          <div className="arch-node">🌐 Internet → Cloudflare → Nginx</div>
          <div className="arch-arrow">↓</div>
          <div className="arch-branch">
            <div className="arch-node">🖥️ RESTART Web</div>
            <div className="arch-node">⚙️ Admin Web</div>
          </div>
          <div className="arch-arrow">↓</div>
          <div className="arch-node">🔌 API Gateway</div>
          <div className="arch-arrow">↓</div>
          <div className="arch-branch">
            <div className="arch-node">🔐 Auth</div>
            <div className="arch-node">📡 Core API</div>
            <div className="arch-node">🤖 AI</div>
          </div>
          <div className="arch-arrow">↓</div>
          <div className="arch-node">🧬 Human Capital Graph</div>
          <div className="arch-arrow">↓</div>
          <div className="arch-branch">
            <div className="arch-node">🔴 PHK</div>
            <div className="arch-node">🟣 Pensiun</div>
            <div className="arch-node">🟡 Calon Pensiun</div>
          </div>
          <div className="arch-arrow">↓</div>
          <div className="arch-node">💼 Opportunity Engine</div>
          <div className="arch-arrow">↓</div>
          <div className="arch-branch">
            <div className="arch-node">💼 Job</div>
            <div className="arch-node">🏢 Business</div>
            <div className="arch-node">🤖 AI Work</div>
          </div>
          <div className="arch-arrow">↓</div>
          <div className="arch-node">🇮🇩 NUSA → Human Intelligence → AI Companies</div>
        </div>
      </section>

      {/* Data Pipeline */}
      <section id="data" className="section">
        <div className="section-header">
          <div className="section-badge">Real Data Policy</div>
          <h2 className="section-title">External Data Pipeline</h2>
          <p className="section-desc">
            Semua data berasal dari sumber resmi (BPS, Kemnaker, BKN). 
            Tidak ada dummy data. Tidak ada data individual tanpa dasar hukum.
          </p>
        </div>
        <div className="pipeline-flow">
          {pipeline.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div className="pipeline-step">
                <div className="pipeline-icon">{step.icon}</div>
                <div className="pipeline-label">{step.label}</div>
              </div>
              {i < pipeline.length - 1 && (
                <div className="pipeline-arrow">→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Golden Rule */}
      <section className="section">
        <div className="golden-rule">
          <h2 className="section-title" style={{ marginBottom: '8px' }}>🏆 Golden Rule</h2>
          <p className="section-desc" style={{ marginBottom: '0' }}>
            AI digunakan untuk membantu memahami dan mengubah data, bukan untuk membuat data palsu.
          </p>
          <div className="golden-flow">
            {goldenFlow.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="golden-step">{step}</span>
                {i < goldenFlow.length - 1 && (
                  <span className="golden-arrow">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-glow" />
        <h2 className="cta-title">Siap Memulai Perjalanan Baru?</h2>
        <p className="cta-desc">
          Daftarkan diri Anda sekarang. Bangun Work DNA, simpan pengalaman nyata, 
          dan temukan peluang yang sesuai dengan keahlian Anda.
        </p>
        <div className="hero-actions" style={{ justifyContent: 'center' }}>
          <a href="/register" className="btn-primary">
            Daftar Sekarang →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p className="footer-text">
          © 2026 RESTART AI — Platform Pemulihan & Akselerasi Karir Indonesia
        </p>
        <div className="footer-links">
          <a href="#" className="footer-link">Kebijakan Privasi</a>
          <a href="#" className="footer-link">Ketentuan Layanan</a>
          <a href="/bantuan" className="footer-link">Bantuan</a>
          <a href="#" className="footer-link">Kontak</a>
        </div>
      </footer>
    </>
  );
}
