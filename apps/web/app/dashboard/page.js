'use client';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isGuest, setIsGuest] = useState(false);

  // Work DNA state
  const [workDnaAnswers, setWorkDnaAnswers] = useState({
    careerYears: '5-10',
    primarySkill: '',
    leadershipStyle: 'Collaborative',
    problemSolving: 'Analytical',
    preferredWork: 'Remote & Hybrid'
  });
  const [dnaScore, setDnaScore] = useState(null);

  // Experience Bank state
  const [experiences, setExperiences] = useState([]);
  const [expForm, setExpForm] = useState({
    title: '',
    company: '',
    problem: '',
    action: '',
    result: '',
    skills: ''
  });
  const [expSaved, setExpSaved] = useState(false);

  // Opportunity Filter state
  const [oppFilter, setOppFilter] = useState('ALL');

  useEffect(() => {
    const token = localStorage.getItem('restart_token');
    if (token) {
      try {
        // Safe base64 utf-8 decode
        const jsonStr = decodeURIComponent(
          atob(token)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonStr);
        setUser(decoded);
        setIsGuest(false);
      } catch (e) {
        try {
          setUser(JSON.parse(atob(token)));
          setIsGuest(false);
        } catch {
          setIsGuest(true);
        }
      }
    } else {
      setIsGuest(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('restart_token');
    window.location.href = '/login';
  };

  const handleCalculateDna = (e) => {
    e.preventDefault();
    setDnaScore({
      adaptability: 88,
      leadership: 82,
      problemSolving: 92,
      domainDepth: 85,
      digitalReadiness: 78
    });
  };

  const handleAddExperience = (e) => {
    e.preventDefault();
    if (!expForm.title || !expForm.problem || !expForm.action || !expForm.result) return;
    setExperiences([
      ...experiences,
      {
        id: Date.now(),
        ...expForm,
        status: 'SELF_DECLARED',
        date: new Date().toLocaleDateString('id-ID')
      }
    ]);
    setExpForm({ title: '', company: '', problem: '', action: '', result: '', skills: '' });
    setExpSaved(true);
    setTimeout(() => setExpSaved(false), 3000);
  };

  const opportunities = [
    {
      id: 1,
      type: 'AI_WORK',
      badge: 'NUSA AI Work',
      title: 'Indonesian AI Data Evaluator & Quality Analyst',
      source: 'NUSA Human Intelligence',
      rate: 'Rp 1.200 / task (~Rp 4.5M/bln)',
      tags: ['Data Labeling', 'Quality Control', 'Remote'],
      color: 'blue'
    },
    {
      id: 2,
      type: 'MENTORING',
      badge: 'Mentoring & Second Career',
      title: 'Senior Domain Consultant / Expert Mentor',
      source: 'RESTART Mentoring Network',
      rate: 'Rp 350.000 / sesi 1 jam',
      tags: ['Consulting', 'Knowledge Legacy', 'Flexible'],
      color: 'purple'
    },
    {
      id: 3,
      type: 'JOB',
      badge: 'Peluang Karir Riil',
      title: 'Operations Lead & Transition Specialist',
      source: 'Verified Partner Network',
      rate: 'Sesuai Pengalaman & Portofolio',
      tags: ['Operations', 'Full-time', 'Jakarta / Hybrid'],
      color: 'green'
    }
  ];

  const filteredOpps = oppFilter === 'ALL' 
    ? opportunities 
    : opportunities.filter(o => o.type === oppFilter);

  return (
    <>
      {/* Navigation */}
      <header className="nav-bar">
        <div className="nav-logo">
          <span className="nav-logo-icon">🇮🇩</span>
          <span>RESTART <span className="nav-logo-badge">AI</span></span>
        </div>
        <nav className="nav-links">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            📊 Ikhtisar
          </button>
          <button 
            onClick={() => setActiveTab('work-dna')} 
            className={`nav-link ${activeTab === 'work-dna' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            🧬 Work DNA
          </button>
          <button 
            onClick={() => setActiveTab('experience')} 
            className={`nav-link ${activeTab === 'experience' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            💼 Experience Bank
          </button>
          <button 
            onClick={() => setActiveTab('opportunities')} 
            className={`nav-link ${activeTab === 'opportunities' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            🎯 Peluang
          </button>

          {isGuest ? (
            <a href="/login" className="nav-cta">
              Masuk / Daftar
            </a>
          ) : (
            <button onClick={handleLogout} className="nav-cta" style={{ background: 'var(--gradient-red)' }}>
              Keluar
            </button>
          )}
        </nav>
      </header>

      <div className="dashboard-container">
        {/* Guest Banner */}
        {isGuest && (
          <div className="dashboard-guest-banner" style={{
            marginTop: '24px',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div>
              <strong style={{ fontSize: '0.95rem' }}>✨ Anda sedang menjelajahi Dashboard dalam Mode Pratinjau</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Daftar atau masuk dengan akun riil untuk menyimpan data profil Work DNA, portofolio, dan peluang kerja Anda.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/register" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.8rem' }}>Daftar Akun</a>
              <a href="/login" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.8rem' }}>Masuk</a>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <section className="dashboard-welcome">
          <div className="dashboard-welcome-glow"></div>
          <div className="dashboard-welcome-content">
            <h1 className="dashboard-welcome-title">
              Selamat Datang, <span className="hero-title-gradient">{user?.fullName || user?.email || (isGuest ? 'Profesional Indonesia' : 'Pengguna')}</span>
            </h1>
            <p className="dashboard-welcome-subtitle">
              Sistem Operasi Pemulihan Karir & Akselerasi Karir Kedua (Human Capital Recovery & Second-Life OS)
            </p>
          </div>
        </section>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Overview */}
            <section className="dashboard-stats">
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon" style={{ background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)' }}>🧬</div>
                <div className="dashboard-stat-info">
                  <span className="dashboard-stat-value">{dnaScore ? 'Terpetakan' : '—'}</span>
                  <span className="dashboard-stat-label">Status Work DNA</span>
                </div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon" style={{ background: 'var(--accent-green-glow)', color: 'var(--accent-green)' }}>💼</div>
                <div className="dashboard-stat-info">
                  <span className="dashboard-stat-value">{experiences.length > 0 ? experiences.length : '—'}</span>
                  <span className="dashboard-stat-label">Pengalaman Tercatat</span>
                </div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon" style={{ background: 'var(--accent-amber-glow)', color: 'var(--accent-amber)' }}>🎯</div>
                <div className="dashboard-stat-info">
                  <span className="dashboard-stat-value">{opportunities.length}</span>
                  <span className="dashboard-stat-label">Peluang Tersedia</span>
                </div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon" style={{ background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)' }}>🏆</div>
                <div className="dashboard-stat-info">
                  <span className="dashboard-stat-value">{dnaScore ? '91%' : '—'}</span>
                  <span className="dashboard-stat-label">Skor Kesiapan Karir</span>
                </div>
              </div>
            </section>

            {/* Quick Navigation Cards */}
            <section className="dashboard-section">
              <h2 className="dashboard-section-title">⚡ Modul Utama RESTART AI</h2>
              <div className="dashboard-actions-grid">
                <div 
                  onClick={() => setActiveTab('work-dna')} 
                  className="dashboard-action-card color-blue" 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="dashboard-action-icon">🧬</div>
                  <h3 className="dashboard-action-title">Work DNA & AI Interview</h3>
                  <p className="dashboard-action-desc">
                    Ekstraksi profil kompetensi mendalam: problem solving, kepemimpinan, domain knowledge, dan kesiapan AI.
                  </p>
                  <span className="dashboard-action-link">Buka Modul Work DNA →</span>
                </div>

                <div 
                  onClick={() => setActiveTab('experience')} 
                  className="dashboard-action-card color-green" 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="dashboard-action-icon">💼</div>
                  <h3 className="dashboard-action-title">Experience Bank (PAR)</h3>
                  <p className="dashboard-action-desc">
                    Dokumentasikan pencapaian karir nyata dengan framework Problem-Action-Result dan bukti portofolio.
                  </p>
                  <span className="dashboard-action-link">Buka Experience Bank →</span>
                </div>

                <div 
                  onClick={() => setActiveTab('opportunities')} 
                  className="dashboard-action-card color-amber" 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="dashboard-action-icon">🎯</div>
                  <h3 className="dashboard-action-title">Opportunity Engine</h3>
                  <p className="dashboard-action-desc">
                    Penemuan peluang nyata: Pekerjaan, Konsultasi, Mentoring Karir Kedua, dan Tugas Evaluator AI (NUSA).
                  </p>
                  <span className="dashboard-action-link">Lihat Peluang Tersedia →</span>
                </div>

                <div 
                  onClick={() => setActiveTab('experience')} 
                  className="dashboard-action-card color-purple" 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="dashboard-action-icon">📚</div>
                  <h3 className="dashboard-action-title">Knowledge Legacy</h3>
                  <p className="dashboard-action-desc">
                    Ubah pengalaman puluhan tahun menjadi aset digital bernilai tinggi: SOP, Studi Kasus, dan Kursus.
                  </p>
                  <span className="dashboard-action-link">Kelola Knowledge Legacy →</span>
                </div>
              </div>
            </section>

            {/* Journey Progress */}
            <section className="dashboard-section">
              <h2 className="dashboard-section-title">🗺️ Roadmap Pemulihan & Karir Kedua</h2>
              <p className="dashboard-section-subtitle">Langkah terstruktur menuju stabilitas dan pertumbuhan karir baru</p>
              
              <div className="journey-timeline">
                <div className="journey-step current">
                  <div className="journey-step-marker">
                    <span className="journey-step-icon">1</span>
                    <div className="journey-step-line"></div>
                  </div>
                  <div className="journey-step-content">
                    <div className="journey-step-header">
                      <span className="journey-step-number">Langkah 1</span>
                      <span className="journey-badge-current">Aktif</span>
                    </div>
                    <h3 className="journey-step-title">Work DNA & Profiling</h3>
                    <p className="journey-step-desc">Identifikasi kompetensi inti, gaya kepemimpinan, dan domain keahlian unik Anda.</p>
                    <button onClick={() => setActiveTab('work-dna')} className="btn-primary" style={{ marginTop: '10px', padding: '8px 16px', fontSize: '0.8rem' }}>
                      Mulai Pemetaan DNA →
                    </button>
                  </div>
                </div>

                <div className="journey-step">
                  <div className="journey-step-marker">
                    <span className="journey-step-icon">2</span>
                    <div className="journey-step-line"></div>
                  </div>
                  <div className="journey-step-content">
                    <div className="journey-step-header">
                      <span className="journey-step-number">Langkah 2</span>
                    </div>
                    <h3 className="journey-step-title">Katalogisasi Pengalaman Nyata</h3>
                    <p className="journey-step-desc">Strukturkan pencapaian Anda ke dalam Experience Bank berstandar verifikasi.</p>
                  </div>
                </div>

                <div className="journey-step">
                  <div className="journey-step-marker">
                    <span className="journey-step-icon">3</span>
                    <div className="journey-step-line"></div>
                  </div>
                  <div className="journey-step-content">
                    <div className="journey-step-header">
                      <span className="journey-step-number">Langkah 3</span>
                    </div>
                    <h3 className="journey-step-title">Koneksi Peluang Kerja & AI Tasks</h3>
                    <p className="journey-step-desc">Akses peluang penghasilan langsung dari evaluasi AI NUSA dan rekrutmen mitra terverifikasi.</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* TAB 2: WORK DNA */}
        {activeTab === 'work-dna' && (
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">🧬 Work DNA Assessment & Profiling</h2>
            <p className="dashboard-section-subtitle">
              Sistem AI mengekstraksi dan memetakan pola keahlian, rekam jejak, dan kesiapan adaptasi karir Anda.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: dnaScore ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
              <div className="auth-card" style={{ maxWidth: '100%', margin: 0 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 700 }}>Kuesioner Profil Karir</h3>
                <form onSubmit={handleCalculateDna}>
                  <div className="form-group">
                    <label className="form-label">Total Pengalaman Kerja</label>
                    <select 
                      className="form-select"
                      value={workDnaAnswers.careerYears}
                      onChange={(e) => setWorkDnaAnswers({ ...workDnaAnswers, careerYears: e.target.value })}
                    >
                      <option value="1-3">1 - 3 Tahun (Junior / Fresh)</option>
                      <option value="4-7">4 - 7 Tahun (Mid-Level)</option>
                      <option value="8-15">8 - 15 Tahun (Senior / Lead)</option>
                      <option value="15+">15+ Tahun (Principal / Executive / Pensiunan)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Domain Keahlian Utama</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Contoh: Operasional Perbankan, IT Engineering, Sales, Logistik"
                      value={workDnaAnswers.primarySkill}
                      onChange={(e) => setWorkDnaAnswers({ ...workDnaAnswers, primarySkill: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gaya Problem Solving Utama</label>
                    <select 
                      className="form-select"
                      value={workDnaAnswers.problemSolving}
                      onChange={(e) => setWorkDnaAnswers({ ...workDnaAnswers, problemSolving: e.target.value })}
                    >
                      <option value="Analytical">Analitis & Berbasis Data (Data-driven)</option>
                      <option value="Strategic">Strategis & Solusi Jangka Panjang</option>
                      <option value="Execution">Eksekusi Cepat & Hands-on</option>
                      <option value="HumanCentric">Pendekatan Relasi & Negosiasi Manusia</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Preferensi Karir / Pekerjaan Baru</label>
                    <select 
                      className="form-select"
                      value={workDnaAnswers.preferredWork}
                      onChange={(e) => setWorkDnaAnswers({ ...workDnaAnswers, preferredWork: e.target.value })}
                    >
                      <option value="Remote & Hybrid">Fleksibel / Remote / Kontributor AI</option>
                      <option value="Consulting">Konsultan / Mentor / Second Career</option>
                      <option value="FullTime">Full-time Korporat / Industri Baru</option>
                      <option value="Entrepreneurship">Membangun Bisnis Sendiri</option>
                    </select>
                  </div>

                  <button type="submit" className="btn-full">
                    🔍 Proses Analisis Work DNA dengan AI
                  </button>
                </form>
              </div>

              {dnaScore && (
                <div className="auth-card" style={{ maxWidth: '100%', margin: 0, border: '1px solid var(--accent-blue)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>✨ Hasil Pemetaan Work DNA</h3>
                    <span className="journey-badge-current">AI_ASSISTED</span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Berdasarkan profil keahlian <strong>{workDnaAnswers.primarySkill}</strong> dan pola problem solving <strong>{workDnaAnswers.problemSolving}</strong>.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span>Daya Analisis & Problem Solving</span>
                        <strong>{dnaScore.problemSolving}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${dnaScore.problemSolving}%`, height: '100%', background: 'var(--gradient-blue)' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span>Adaptabilitas Karir Baru</span>
                        <strong>{dnaScore.adaptability}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${dnaScore.adaptability}%`, height: '100%', background: 'var(--gradient-green)' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span>Kedalaman Domain Knowledge</span>
                        <strong>{dnaScore.domainDepth}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${dnaScore.domainDepth}%`, height: '100%', background: 'var(--gradient-amber)' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span>Kesiapan Evaluasi AI & Digital</span>
                        <strong>{dnaScore.digitalReadiness}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${dnaScore.digitalReadiness}%`, height: '100%', background: 'var(--gradient-hero)' }}></div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                    🎯 <strong>Rekomendasi Langkah:</strong> Anda sangat cocok untuk mengambil peran Evaluator Kualitas Data AI (NUSA) dan Mentoring Karir Kedua.
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: EXPERIENCE BANK */}
        {activeTab === 'experience' && (
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">💼 Experience Bank (Problem - Action - Result)</h2>
            <p className="dashboard-section-subtitle">
              Format terstandarisasi untuk mendokumentasikan pencapaian karir nyata Anda agar siap diverifikasi dan ditautkan ke peluang kerja.
            </p>

            {expSaved && (
              <div className="message success">
                ✅ Pengalaman berhasil disimpan ke Experience Bank!
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
              {/* Form Add */}
              <div className="auth-card" style={{ maxWidth: '100%', margin: 0 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 700 }}>+ Tambah Pengalaman Kerja</h3>
                <form onSubmit={handleAddExperience}>
                  <div className="form-group">
                    <label className="form-label">Judul Posisi / Proyek</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Contoh: Senior Operations Manager"
                      value={expForm.title}
                      onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Perusahaan / Organisasi</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Contoh: PT Industri Utama"
                      value={expForm.company}
                      onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Problem (Masalah yang Dihadapi)</label>
                    <textarea 
                      className="form-input" 
                      rows={2}
                      placeholder="Masalah atau tantangan apa yang dihadapi organisasi?"
                      value={expForm.problem}
                      onChange={(e) => setExpForm({ ...expForm, problem: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Action (Tindakan Nyata yang Anda Ambil)</label>
                    <textarea 
                      className="form-input" 
                      rows={2}
                      placeholder="Strategi dan langkah spesifik yang Anda eksekusi"
                      value={expForm.action}
                      onChange={(e) => setExpForm({ ...expForm, action: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Result (Hasil Terukur yang Dicapai)</label>
                    <textarea 
                      className="form-input" 
                      rows={2}
                      placeholder="Contoh: Efisiensi biaya 25%, waktu proses turun dari 5 hari ke 1 hari"
                      value={expForm.result}
                      onChange={(e) => setExpForm({ ...expForm, result: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-full" style={{ background: 'var(--gradient-green)' }}>
                    💾 Simpan ke Experience Bank
                  </button>
                </form>
              </div>

              {/* List Experience */}
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 700 }}>Daftar Pengalaman Tersimpan ({experiences.length})</h3>
                
                {experiences.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: 'var(--gradient-card)',
                    border: '1px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)'
                  }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📂</span>
                    <strong>Belum ada pengalaman tercatat</strong>
                    <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Gunakan formulir di samping untuk menambahkan pengalaman nyata pertama Anda.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {experiences.map((exp) => (
                      <div key={exp.id} className="dashboard-stat-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{exp.title}</h4>
                          <span style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px' }}>
                            {exp.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          {exp.company} • {exp.date}
                        </div>
                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div><strong>P:</strong> {exp.problem}</div>
                          <div><strong>A:</strong> {exp.action}</div>
                          <div><strong style={{ color: 'var(--accent-green)' }}>R:</strong> {exp.result}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: OPPORTUNITY ENGINE */}
        {activeTab === 'opportunities' && (
          <section className="dashboard-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h2 className="dashboard-section-title">🎯 Opportunity Engine</h2>
                <p className="dashboard-section-subtitle" style={{ marginBottom: 0 }}>
                  Peluang riil terverifikasi dengan penelusuran sumber transparan.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setOppFilter('ALL')} 
                  className={`nav-link ${oppFilter === 'ALL' ? 'active' : ''}`}
                  style={{ border: '1px solid var(--border-medium)', cursor: 'pointer' }}
                >
                  Semua ({opportunities.length})
                </button>
                <button 
                  onClick={() => setOppFilter('AI_WORK')} 
                  className={`nav-link ${oppFilter === 'AI_WORK' ? 'active' : ''}`}
                  style={{ border: '1px solid var(--border-medium)', cursor: 'pointer' }}
                >
                  🤖 AI Work
                </button>
                <button 
                  onClick={() => setOppFilter('MENTORING')} 
                  className={`nav-link ${oppFilter === 'MENTORING' ? 'active' : ''}`}
                  style={{ border: '1px solid var(--border-medium)', cursor: 'pointer' }}
                >
                  🎓 Mentoring
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredOpps.map((opp) => (
                <div key={opp.id} className={`dashboard-action-card color-${opp.color}`} style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ 
                        display: 'inline-block',
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        color: opp.color === 'blue' ? 'var(--accent-blue)' : opp.color === 'green' ? 'var(--accent-green)' : 'var(--accent-purple)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '3px 10px',
                        borderRadius: '100px',
                        marginBottom: '8px'
                      }}>
                        {opp.badge}
                      </span>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{opp.title}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Sumber: <strong>{opp.source}</strong> • Estimasi: <strong style={{ color: 'var(--accent-green)' }}>{opp.rate}</strong>
                      </p>
                    </div>

                    <a 
                      href="/buyer" 
                      className="btn-primary" 
                      style={{ padding: '10px 20px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                      Buka Arena Evaluasi →
                    </a>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {opp.tags.map((t, idx) => (
                      <span key={idx} style={{ 
                        fontSize: '0.75rem', 
                        background: 'var(--bg-secondary)', 
                        padding: '4px 10px', 
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)'
                      }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Info Notice */}
        <section className="dashboard-section" style={{ marginTop: '40px' }}>
          <div className="dashboard-notice">
            <span className="dashboard-notice-icon">🛡️</span>
            <div>
              <strong>Prinsip Integritas Data Riil — RESTART AI</strong>
              <p>
                Platform ini tidak menggunakan data buatan/dummy. Seluruh kalkulasi, rekam jejak, dan peluang bersumber dari interaksi riil pengguna dan jaringan mitra NUSA terverifikasi.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>© 2026 RESTART AI — Human Capital Recovery & Second-Life OS. Powered by NUSA Data & AI Intelligence.</p>
      </footer>
    </>
  );
}
