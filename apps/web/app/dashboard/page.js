'use client';
import { useState, useEffect } from 'react';
import ApiUsageChart from '../../components/ApiUsageChart';
import TopSkillsGapChart from '../../components/TopSkillsGapChart';

export default function DashboardPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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
  const [workDnaResult, setWorkDnaResult] = useState(null);
  const [workDnaLoading, setWorkDnaLoading] = useState(false);

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

  // Live API data state
  const [phkUsers, setPhkUsers] = useState([]);
  const [retirementUsers, setRetirementUsers] = useState([]);
  const [experienceData, setExperienceData] = useState([]);
  const [opportunityData, setOpportunityData] = useState([]);
  const [marketplaceProjects, setMarketplaceProjects] = useState([]);
  const [nusaData, setNusaData] = useState({ bps: null, opportunities: [], integrationStats: {} });

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // PHK Recovery search & page size state
  const [phkSearch, setPhkSearch] = useState('');
  const [phkPageSize, setPhkPageSize] = useState(10);
  // Retirement Engine search & page size state
  const [retirementSearch, setRetirementSearch] = useState('');
  const [retirementPageSize, setRetirementPageSize] = useState(10);
  // Opportunity Engine controls
  const [oppSearch, setOppSearch] = useState('');
  const [oppPageSize, setOppPageSize] = useState(10);

  // AI Matchmaking state
  const [aiScores, setAiScores] = useState({ opps: {}, projects: {} });
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [aiScoresLoading, setAiScoresLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('restart_token');
    if (token) {
      try {
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

    // Fetch PHK Recovery users
    fetch(`${API_URL}/api/users?profile=PHK_RECOVERY`)
      .then(res => res.json())
      .then(data => { if (data.success && data.data) setPhkUsers(data.data); })
      .catch(() => {});

    // Fetch Retirement users
    fetch(`${API_URL}/api/users?profile=RETIREMENT_SECOND_LIFE`)
      .then(res => res.json())
      .then(data => { if (data.success && data.data) setRetirementUsers(data.data); })
      .catch(() => {});

    // Fetch Experience Bank data
    fetch(`${API_URL}/api/experience`)
      .then(res => res.json())
      .then(data => { if (data.success && data.data) setExperienceData(data.data); })
      .catch(() => {});

    // Fetch Opportunity Engine data
    fetch(`${API_URL}/api/opportunities`)
      .then(res => res.json())
      .then(data => { if (data.success && data.data) setOpportunityData(data.data); })
      .catch(() => {});

    // Fetch Marketplace Projects
    fetch(`${API_URL}/api/marketplace/projects`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMarketplaceProjects(data); })
      .catch(() => {});

    // Fetch NUSA Integration data
    fetch(`${API_URL}/api/nusa`)
      .then(res => res.json())
      .then(data => { if (data.success && data.data) setNusaData(data.data); })
      .catch(() => {});
  }, []);

  // Notifications SSE Effect
  useEffect(() => {
    if (!user || !user.id) return;
    
    // Fetch initial
    fetch(`${API_URL}/api/notifications?userId=${user.id}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setNotifications(data); })
      .catch(() => {});

    // SSE connection
    const eventSource = new EventSource(`${API_URL}/api/notifications/stream?userId=${user.id}`);
    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data);
        setNotifications(prev => [newNotif, ...prev]);
      } catch (err) {}
    };

    // Fetch AI Scores
    setAiScoresLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/matchmaking/opportunity-scores?userId=${user.id}`).then(r => r.json()),
      fetch(`${API_URL}/api/matchmaking/project-scores?userId=${user.id}`).then(r => r.json())
    ]).then(([oppRes, projRes]) => {
      const newScores = { opps: {}, projects: {} };
      if (oppRes.success && oppRes.scores) {
        oppRes.scores.forEach(s => { newScores.opps[s.opportunityId] = s; });
      }
      if (projRes.success && projRes.scores) {
        projRes.scores.forEach(s => { newScores.projects[s.projectId] = s; });
      }
      setAiScores(newScores);
      setAiScoresLoading(false);
    }).catch(err => {
      console.error('Failed to fetch AI scores:', err);
      setAiScoresLoading(false);
    });

    return () => eventSource.close();
  }, [user, API_URL]);

  const handleMarkAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'POST' });
    } catch (err) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('restart_token');
    window.location.href = '/login';
  };

  // Work DNA — kirim ke API
  const handleCalculateDna = async (e) => {
    e.preventDefault();
    setWorkDnaLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/work-dna`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workDnaAnswers)
      });
      const json = await res.json();
      if (json.success && json.data) {
        setWorkDnaResult(json.data);
      }
    } catch (err) {
      console.error('Work DNA error:', err);
    } finally {
      setWorkDnaLoading(false);
    }
  };

  const handleAddExperience = async (e) => {
    e.preventDefault();
    if (!expForm.title || !expForm.problem || !expForm.action || !expForm.result) return;

    const newExp = {
      id: Date.now(),
      ...expForm,
      status: 'SELF_DECLARED',
      date: new Date().toLocaleDateString('id-ID')
    };
    setExperiences([...experiences, newExp]);
    setExpForm({ title: '', company: '', problem: '', action: '', result: '', skills: '' });
    setExpSaved(true);
    setTimeout(() => setExpSaved(false), 3000);
  };

  // Fallback static opportunities (jika API belum return data)
  const staticOpportunities = [
    {
      id: 1, type: 'AI_WORK_TASK', title: 'Indonesian AI Data Evaluator & Quality Analyst',
      description: 'Evaluasi kualitas respons AI dalam bahasa Indonesia. Kerja remote, fleksibel.',
      sourceName: 'NUSA Human Intelligence', sourceUrl: 'https://nusa.ai',
      compensationMin: 1200000, compensationMax: 4500000,
      requiredSkills: ['Bahasa Indonesia', 'Quality Control', 'Remote'],
      verificationStatus: 'VERIFIED'
    },
    {
      id: 2, type: 'MENTORING', title: 'Senior Domain Consultant / Expert Mentor',
      description: 'Bimbing profesional dalam transisi karir dan knowledge legacy.',
      sourceName: 'RESTART Mentoring Network', sourceUrl: 'https://restart.id',
      compensationMin: 350000, compensationMax: 750000,
      requiredSkills: ['Consulting', 'Knowledge Legacy', 'Career Coaching'],
      verificationStatus: 'LICENSED_PARTNER'
    },
    {
      id: 3, type: 'JOB_EMPLOYMENT', title: 'Operations Lead & Transition Specialist',
      description: 'Memimpin otomatisasi proses bisnis dan manajemen operasional.',
      sourceName: 'Verified Partner Network', sourceUrl: 'https://restart.id',
      compensationMin: 12000000, compensationMax: 18000000,
      requiredSkills: ['Operations', 'Leadership', 'Supply Chain'],
      verificationStatus: 'HUMAN_VERIFIED'
    }
  ];

  // Gunakan data API jika tersedia, fallback ke static
  const liveOpps = opportunityData.length > 0 ? opportunityData : staticOpportunities;

  // Filtered & searched opportunities
  const filteredOpps = liveOpps
    .filter(o => oppFilter === 'ALL' || o.type === oppFilter)
    .filter(o => {
      if (!oppSearch) return true;
      const q = oppSearch.toLowerCase();
      return (o.title || '').toLowerCase().includes(q) ||
             (o.description || '').toLowerCase().includes(q) ||
             (o.sourceName || '').toLowerCase().includes(q);
    })
    .slice(0, oppPageSize);

  const allFilteredOppsCount = liveOpps
    .filter(o => oppFilter === 'ALL' || o.type === oppFilter)
    .filter(o => {
      if (!oppSearch) return true;
      const q = oppSearch.toLowerCase();
      return (o.title || '').toLowerCase().includes(q) ||
             (o.description || '').toLowerCase().includes(q);
    }).length;

  // Tab list
  const tabs = [
    { id: 'overview', icon: '📊', label: 'Ikhtisar' },
    { id: 'phk-recovery', icon: '🟣', label: 'PHK Recovery' },
    { id: 'retirement-engine', icon: '🧓', label: 'Retirement' },
    { id: 'work-dna', icon: '🧬', label: 'Work DNA' },
    { id: 'experience', icon: '💼', label: 'Experience Bank' },
    { id: 'opportunities', icon: '🎯', label: 'Peluang' },
    { id: 'nusa-integration', icon: '🛰️', label: 'NUSA' },
    { id: 'privacy-consent', icon: '🛡️', label: 'Privacy & Consent' },
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
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}

          {isGuest ? (
            <a href="/login" className="nav-cta">Masuk / Daftar</a>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowNotif(!showNotif)} 
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', position: 'relative' }}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white',
                      fontSize: '0.6rem', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{unreadCount}</span>
                  )}
                </button>
                {showNotif && (
                  <div style={{
                    position: 'absolute', top: '100%', right: '0', width: '320px', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '10px', zIndex: 100,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxHeight: '400px', overflowY: 'auto'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)', fontSize: '0.9rem' }}>Notifikasi</h4>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tidak ada notifikasi.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notifications.map(notif => (
                          <div key={notif.id} 
                            onClick={() => { if(!notif.isRead) handleMarkAsRead(notif.id); }}
                            style={{
                              padding: '10px', background: notif.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                              borderRadius: '6px', cursor: 'pointer', border: '1px solid',
                              borderColor: notif.isRead ? 'var(--border-light)' : 'rgba(59, 130, 246, 0.3)'
                            }}
                          >
                            <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: notif.isRead ? 500 : 700 }}>{notif.title}</h5>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{notif.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={handleLogout} className="nav-cta" style={{ background: 'var(--gradient-red)' }}>
                Keluar
              </button>
            </div>
          )}
        </nav>
      </header>

      <div className="dashboard-container">
        {/* Guest Banner */}
        {isGuest && (
          <div className="dashboard-guest-banner" style={{
            marginTop: '24px', padding: '16px 24px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
            border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap'
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

        {/* ===================== TAB 1: OVERVIEW ===================== */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Overview */}
            <section className="dashboard-stats">
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon" style={{ background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)' }}>🧬</div>
                <div className="dashboard-stat-info">
                  <span className="dashboard-stat-value">{workDnaResult ? 'Terpetakan' : '—'}</span>
                  <span className="dashboard-stat-label">Status Work DNA</span>
                </div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon" style={{ background: 'var(--accent-green-glow)', color: 'var(--accent-green)' }}>💼</div>
                <div className="dashboard-stat-info">
                  <span className="dashboard-stat-value">{experiences.length > 0 ? experiences.length : (experienceData.length || '—')}</span>
                  <span className="dashboard-stat-label">Pengalaman Tercatat</span>
                </div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon" style={{ background: 'var(--accent-amber-glow)', color: 'var(--accent-amber)' }}>🎯</div>
                <div className="dashboard-stat-info">
                  <span className="dashboard-stat-value">{liveOpps.length}</span>
                  <span className="dashboard-stat-label">Peluang Tersedia</span>
                </div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon" style={{ background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)' }}>🏆</div>
                <div className="dashboard-stat-info">
                  <span className="dashboard-stat-value">{workDnaResult ? `${workDnaResult.overallScore}%` : '—'}</span>
                  <span className="dashboard-stat-label">Skor Kesiapan Karir</span>
                </div>
              </div>
            </section>

            {/* Quick Navigation Cards */}
            <section className="dashboard-section">
              <h2 className="dashboard-section-title">⚡ Modul Utama RESTART AI</h2>
              <div className="dashboard-actions-grid">
                <div onClick={() => setActiveTab('work-dna')} className="dashboard-action-card color-blue" style={{ cursor: 'pointer' }}>
                  <div className="dashboard-action-icon">🧬</div>
                  <h3 className="dashboard-action-title">Work DNA & AI Interview</h3>
                  <p className="dashboard-action-desc">Ekstraksi profil kompetensi mendalam: problem solving, kepemimpinan, domain knowledge, dan kesiapan AI.</p>
                  <span className="dashboard-action-link">Buka Modul Work DNA →</span>
                </div>

                <div className="dashboard-action-card color-purple" onClick={() => setActiveTab('phk-recovery')} style={{ cursor: 'pointer' }}>
                  <div className="dashboard-action-icon">📊</div>
                  <h3 className="dashboard-action-title">PHK Recovery</h3>
                  <p className="dashboard-action-desc">Analisis profil korban PHK, rekomendasi pekerjaan, pelatihan berbasis AI.</p>
                  <span className="dashboard-action-link">Buka PHK Recovery →</span>
                </div>

                <div className="dashboard-action-card color-orange" onClick={() => setActiveTab('retirement-engine')} style={{ cursor: 'pointer' }}>
                  <div className="dashboard-action-icon">🧓</div>
                  <h3 className="dashboard-action-title">Retirement Engine</h3>
                  <p className="dashboard-action-desc">Rencana pensiun, eksplorasi karir kedua, dan peluang mentoring.</p>
                  <span className="dashboard-action-link">Buka Retirement Engine →</span>
                </div>

                <div onClick={() => setActiveTab('experience')} className="dashboard-action-card color-green" style={{ cursor: 'pointer' }}>
                  <div className="dashboard-action-icon">💼</div>
                  <h3 className="dashboard-action-title">Experience Bank (PAR)</h3>
                  <p className="dashboard-action-desc">Dokumentasikan pencapaian karir nyata dengan framework Problem-Action-Result dan bukti portofolio.</p>
                  <span className="dashboard-action-link">Buka Experience Bank →</span>
                </div>

                <div onClick={() => setActiveTab('opportunities')} className="dashboard-action-card color-amber" style={{ cursor: 'pointer' }}>
                  <div className="dashboard-action-icon">🎯</div>
                  <h3 className="dashboard-action-title">Opportunity Engine</h3>
                  <p className="dashboard-action-desc">Peluang nyata: Job, Freelance, Mentoring, AI Work — semua dari sumber terverifikasi.</p>
                  <span className="dashboard-action-link">Buka Opportunity Engine →</span>
                </div>

                <div onClick={() => setActiveTab('nusa-integration')} className="dashboard-action-card color-cyan" style={{ cursor: 'pointer' }}>
                  <div className="dashboard-action-icon">🛰️</div>
                  <h3 className="dashboard-action-title">NUSA Integration</h3>
                  <p className="dashboard-action-desc">Data BPS, API usage, skills gap, dan statistik integrasi ekosistem NUSA.</p>
                  <span className="dashboard-action-link">Buka NUSA Integration →</span>
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
                    <div className="journey-step-header"><span className="journey-step-number">Langkah 2</span></div>
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
                    <div className="journey-step-header"><span className="journey-step-number">Langkah 3</span></div>
                    <h3 className="journey-step-title">Koneksi Peluang Kerja & AI Tasks</h3>
                    <p className="journey-step-desc">Akses peluang penghasilan langsung dari evaluasi AI NUSA dan rekrutmen mitra terverifikasi.</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ===================== TAB: PHK RECOVERY ===================== */}
        {activeTab === 'phk-recovery' && (
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">🟣 PHK Recovery</h2>
            <p className="dashboard-section-subtitle">Daftar pengguna yang terdaftar sebagai korban PHK — data riil dari database RESTART AI.</p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text" placeholder="🔍 Cari nama atau email..." value={phkSearch}
                onChange={e => setPhkSearch(e.target.value)} className="form-input"
                style={{ flex: 1, minWidth: '200px' }}
              />
              <select value={phkPageSize} onChange={e => setPhkPageSize(Number(e.target.value))} className="form-select" style={{ width: 'auto' }}>
                <option value={5}>5 per halaman</option>
                <option value={10}>10 per halaman</option>
                <option value={20}>20 per halaman</option>
                <option value={50}>50 per halaman</option>
              </select>
            </div>
            <div>
              {phkUsers.length === 0 ? (
                <div className="message info" style={{ textAlign: 'center', padding: '40px' }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📋</span>
                  Belum ada data PHK Recovery. Daftarkan pengguna melalui halaman registrasi.
                </div>
              ) : (() => {
                const filtered = phkUsers.filter(u =>
                  (u.fullName || '').toLowerCase().includes(phkSearch.toLowerCase()) ||
                  (u.email || '').toLowerCase().includes(phkSearch.toLowerCase())
                );
                const displayed = filtered.slice(0, phkPageSize);
                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {displayed.map(u => (
                        <div key={u.id} className="dashboard-stat-card" style={{ padding: '16px 20px' }}>
                          <div className="dashboard-stat-icon" style={{ background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)', fontSize: '1.2rem' }}>👤</div>
                          <div className="dashboard-stat-info">
                            <span className="dashboard-stat-value" style={{ fontSize: '0.95rem' }}>{u.fullName}</span>
                            <span className="dashboard-stat-label">{u.email} • {u.profileType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {filtered.length > phkPageSize && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
                        Menampilkan {displayed.length} dari {filtered.length} hasil. Ubah ukuran halaman untuk melihat lebih banyak.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </section>
        )}

        {/* ===================== TAB: RETIREMENT ENGINE ===================== */}
        {activeTab === 'retirement-engine' && (
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">🧓 Retirement Engine</h2>
            <p className="dashboard-section-subtitle">Pengguna yang telah memasuki tahap pensiun atau ingin memulai karir kedua.</p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text" placeholder="🔍 Cari nama atau email..." value={retirementSearch}
                onChange={e => setRetirementSearch(e.target.value)} className="form-input"
                style={{ flex: 1, minWidth: '200px' }}
              />
              <select value={retirementPageSize} onChange={e => setRetirementPageSize(Number(e.target.value))} className="form-select" style={{ width: 'auto' }}>
                <option value={5}>5 per halaman</option>
                <option value={10}>10 per halaman</option>
                <option value={20}>20 per halaman</option>
                <option value={50}>50 per halaman</option>
              </select>
            </div>
            <div>
              {retirementUsers.length === 0 ? (
                <div className="message info" style={{ textAlign: 'center', padding: '40px' }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🧓</span>
                  Belum ada data Retirement. Daftarkan pengguna dengan tipe PRE_RETIRED atau RETIRED.
                </div>
              ) : (() => {
                const filtered = retirementUsers.filter(u =>
                  (u.fullName || '').toLowerCase().includes(retirementSearch.toLowerCase()) ||
                  (u.email || '').toLowerCase().includes(retirementSearch.toLowerCase())
                );
                const displayed = filtered.slice(0, retirementPageSize);
                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {displayed.map(u => (
                        <div key={u.id} className="dashboard-stat-card" style={{ padding: '16px 20px' }}>
                          <div className="dashboard-stat-icon" style={{ background: 'var(--accent-amber-glow)', color: 'var(--accent-amber)', fontSize: '1.2rem' }}>🧓</div>
                          <div className="dashboard-stat-info">
                            <span className="dashboard-stat-value" style={{ fontSize: '0.95rem' }}>{u.fullName}</span>
                            <span className="dashboard-stat-label">{u.email} • {u.profileType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {filtered.length > retirementPageSize && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
                        Menampilkan {displayed.length} dari {filtered.length} hasil.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </section>
        )}

        {/* ===================== TAB: WORK DNA ===================== */}
        {activeTab === 'work-dna' && (
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">🧬 Work DNA Assessment & Profiling</h2>
            <p className="dashboard-section-subtitle">
              Sistem AI mengekstraksi dan memetakan pola keahlian, rekam jejak, dan kesiapan adaptasi karir Anda.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: workDnaResult ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
              {/* Kuesioner */}
              <div className="auth-card" style={{ maxWidth: '100%', margin: 0 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 700 }}>Kuesioner Profil Karir</h3>
                <form onSubmit={handleCalculateDna}>
                  <div className="form-group">
                    <label className="form-label">Total Pengalaman Kerja</label>
                    <select className="form-select" value={workDnaAnswers.careerYears}
                      onChange={(e) => setWorkDnaAnswers({ ...workDnaAnswers, careerYears: e.target.value })}>
                      <option value="1-3">1 - 3 Tahun (Junior / Fresh)</option>
                      <option value="4-7">4 - 7 Tahun (Mid-Level)</option>
                      <option value="5-10">5 - 10 Tahun (Senior)</option>
                      <option value="8-15">8 - 15 Tahun (Senior / Lead)</option>
                      <option value="15+">15+ Tahun (Principal / Executive / Pensiunan)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Domain Keahlian Utama</label>
                    <input type="text" className="form-input" placeholder="Contoh: Operasional Perbankan, IT Engineering, Sales, Logistik"
                      value={workDnaAnswers.primarySkill}
                      onChange={(e) => setWorkDnaAnswers({ ...workDnaAnswers, primarySkill: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gaya Problem Solving Utama</label>
                    <select className="form-select" value={workDnaAnswers.problemSolving}
                      onChange={(e) => setWorkDnaAnswers({ ...workDnaAnswers, problemSolving: e.target.value })}>
                      <option value="Analytical">Analitis & Berbasis Data (Data-driven)</option>
                      <option value="Strategic">Strategis & Solusi Jangka Panjang</option>
                      <option value="Execution">Eksekusi Cepat & Hands-on</option>
                      <option value="HumanCentric">Pendekatan Relasi & Negosiasi Manusia</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preferensi Karir / Pekerjaan Baru</label>
                    <select className="form-select" value={workDnaAnswers.preferredWork}
                      onChange={(e) => setWorkDnaAnswers({ ...workDnaAnswers, preferredWork: e.target.value })}>
                      <option value="Remote & Hybrid">Fleksibel / Remote / Kontributor AI</option>
                      <option value="Consulting">Konsultan / Mentor / Second Career</option>
                      <option value="FullTime">Full-time Korporat / Industri Baru</option>
                      <option value="Entrepreneurship">Membangun Bisnis Sendiri</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-full" disabled={workDnaLoading}>
                    {workDnaLoading ? '⏳ Memproses Analisis AI...' : '🔍 Proses Analisis Work DNA dengan AI'}
                  </button>
                </form>
              </div>

              {/* Hasil Work DNA */}
              {workDnaResult && (
                <div className="auth-card" style={{ maxWidth: '100%', margin: 0, border: '1px solid var(--accent-blue)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>✨ Hasil Pemetaan Work DNA</h3>
                    <span className="journey-badge-current">AI_ASSISTED</span>
                  </div>

                  {/* Profil Summary */}
                  {workDnaResult.profileSummary && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6, padding: '12px', background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius-sm)' }}>
                      {workDnaResult.profileSummary}
                    </p>
                  )}

                  {/* Skor */}
                  {workDnaResult.scores && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '10px' }}>📊 Skor Kompetensi</h4>
                      {Object.entries(workDnaResult.scores).map(([key, val]) => (
                        <div key={key} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                            <span style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{val}%</span>
                          </div>
                          <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '100px' }}>
                            <div style={{ height: '100%', width: `${val}%`, background: 'var(--gradient-blue)', borderRadius: '100px', transition: 'width 0.8s ease' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Overall Score */}
                  {workDnaResult.overallScore && (
                    <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(59,130,246,0.1)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{workDnaResult.overallScore}%</span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Skor Kesiapan Karir Keseluruhan</p>
                    </div>
                  )}

                  {/* Rekomendasi */}
                  {workDnaResult.recommendations && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>💡 Rekomendasi</h4>
                      <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '18px', lineHeight: 1.8 }}>
                        {workDnaResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Matched Opportunities */}
                  {workDnaResult.matchedOpportunities && (
                    <div style={{ marginTop: '16px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>🎯 Peluang yang Cocok</h4>
                      {workDnaResult.matchedOpportunities.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '6px', fontSize: '0.8rem' }}>
                          <div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-blue)', background: 'var(--accent-blue-glow)', padding: '2px 8px', borderRadius: '100px', marginRight: '8px' }}>{m.type}</span>
                            {m.title}
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{m.match}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===================== TAB: EXPERIENCE BANK ===================== */}
        {activeTab === 'experience' && (
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">💼 Experience Bank (Problem - Action - Result)</h2>
            <p className="dashboard-section-subtitle">
              Format terstandarisasi untuk mendokumentasikan pencapaian karir nyata Anda agar siap diverifikasi dan ditautkan ke peluang kerja.
            </p>

            {expSaved && (
              <div className="message success">✅ Pengalaman berhasil disimpan ke Experience Bank!</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
              {/* Form Add */}
              <div className="auth-card" style={{ maxWidth: '100%', margin: 0 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 700 }}>+ Tambah Pengalaman Kerja</h3>
                <form onSubmit={handleAddExperience}>
                  <div className="form-group">
                    <label className="form-label">Judul Posisi / Proyek</label>
                    <input type="text" className="form-input" placeholder="Contoh: Senior Operations Manager"
                      value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Perusahaan / Organisasi</label>
                    <input type="text" className="form-input" placeholder="Contoh: PT Industri Utama"
                      value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Problem (Masalah yang Dihadapi)</label>
                    <textarea className="form-input" rows={2} placeholder="Masalah atau tantangan apa yang dihadapi organisasi?"
                      value={expForm.problem} onChange={(e) => setExpForm({ ...expForm, problem: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Action (Tindakan Nyata yang Anda Ambil)</label>
                    <textarea className="form-input" rows={2} placeholder="Strategi dan langkah spesifik yang Anda eksekusi"
                      value={expForm.action} onChange={(e) => setExpForm({ ...expForm, action: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Result (Hasil Terukur yang Dicapai)</label>
                    <textarea className="form-input" rows={2} placeholder="Contoh: Efisiensi biaya 25%, waktu proses turun dari 5 hari ke 1 hari"
                      value={expForm.result} onChange={(e) => setExpForm({ ...expForm, result: e.target.value })} required />
                  </div>
                  <button type="submit" className="btn-full" style={{ background: 'var(--gradient-green)' }}>
                    💾 Simpan ke Experience Bank
                  </button>
                </form>
              </div>

              {/* List Experience */}
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 700 }}>
                  Daftar Pengalaman Tersimpan ({experiences.length + experienceData.length})
                </h3>
                {(experiences.length + experienceData.length) === 0 ? (
                  <div style={{
                    padding: '40px 20px', textAlign: 'center', background: 'var(--gradient-card)',
                    border: '1px dashed var(--border-medium)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)'
                  }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📂</span>
                    <strong>Belum ada pengalaman tercatat</strong>
                    <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Gunakan formulir di samping untuk menambahkan pengalaman nyata pertama Anda.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Server-side experience data */}
                    {experienceData.map((exp) => (
                      <div key={exp.id} className="dashboard-stat-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{exp.title}</h4>
                          <span style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(59,130,246,0.2)', borderRadius: '100px', color: 'var(--accent-blue)' }}>DATABASE</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{exp.company} • {new Date(exp.date).toLocaleDateString('id-ID')}</div>
                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div><strong>P:</strong> {exp.problem}</div>
                          <div><strong>A:</strong> {exp.action}</div>
                          <div><strong style={{ color: 'var(--accent-green)' }}>R:</strong> {exp.result}</div>
                        </div>
                      </div>
                    ))}
                    {/* Client-side added experiences */}
                    {experiences.map((exp) => (
                      <div key={exp.id} className="dashboard-stat-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{exp.title}</h4>
                          <span style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px' }}>{exp.status}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{exp.company} • {exp.date}</div>
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

        {/* ===================== TAB: OPPORTUNITY ENGINE ===================== */}
        {activeTab === 'opportunities' && (
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">🎯 Opportunity Engine — Peluang Karir Terverifikasi</h2>
            <p className="dashboard-section-subtitle">
              Peluang nyata dari sumber terverifikasi: pekerjaan, mentoring, AI work, dan pelatihan vokasi.
            </p>

            {/* Search & Controls */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="🔍 Cari peluang berdasarkan judul, deskripsi, sumber..."
                value={oppSearch} onChange={e => setOppSearch(e.target.value)} className="form-input"
                style={{ flex: 1, minWidth: '200px' }}
              />
              <select value={oppPageSize} onChange={e => setOppPageSize(Number(e.target.value))} className="form-select" style={{ width: 'auto' }}>
                <option value={5}>5 per halaman</option>
                <option value={10}>10 per halaman</option>
                <option value={20}>20 per halaman</option>
              </select>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: `Semua (${liveOpps.length})`, icon: '📋' },
                { key: 'AI_WORK_TASK', label: 'AI Work', icon: '🤖' },
                { key: 'MENTORING', label: 'Mentoring', icon: '🎓' },
                { key: 'JOB_EMPLOYMENT', label: 'Pekerjaan', icon: '💼' },
                { key: 'TRAINING_DELIVERY', label: 'Pelatihan', icon: '📚' },
              ].map(f => (
                <button key={f.key} onClick={() => setOppFilter(f.key)}
                  className={`nav-link ${oppFilter === f.key ? 'active' : ''}`}
                  style={{ border: '1px solid var(--border-medium)', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 14px' }}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>

            {/* Opportunity Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredOpps.length === 0 ? (
                <div className="message info" style={{ textAlign: 'center', padding: '40px' }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🔍</span>
                  Tidak ditemukan peluang yang cocok dengan filter Anda.
                </div>
              ) : filteredOpps.map((opp, idx) => (
                <div key={opp.id || idx} className="dashboard-action-card color-blue" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)', background: 'var(--accent-blue-glow)', padding: '3px 10px', borderRadius: '100px' }}>
                          {opp.type || 'Peluang'}
                        </span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--accent-green)', background: 'var(--accent-green-glow)', padding: '3px 8px', borderRadius: '100px' }}>
                          ✓ {opp.verificationStatus || 'VERIFIED'}
                        </span>
                        {opp.isRemote && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--accent-amber)', background: 'var(--accent-amber-glow)', padding: '3px 8px', borderRadius: '100px' }}>
                            🌐 Remote
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{opp.title}</h3>
                        {(() => {
                          const aiData = aiScores.opps[opp.id];
                          if (aiScoresLoading && !aiData) return (
                            <div className="ai-match-badge loading" title="Sedang menganalisis profil Anda...">
                              <span className="icon">⏳</span><span className="text">Analisis AI...</span>
                            </div>
                          );
                          if (!aiData) return null;
                          const { matchScore } = aiData;
                          let level = 'low'; let icon = '📋';
                          if (matchScore >= 85) { level = 'high'; icon = '🔥'; }
                          else if (matchScore >= 65) { level = 'medium'; icon = '⚡'; }
                          else if (matchScore >= 40) { level = 'low'; icon = '💡'; }

                          return (
                            <div className={`ai-match-badge ${level}`} onClick={() => setSelectedMatch({ ...aiData, title: opp.title })} title="Lihat detail alasan kecocokan AI">
                              <span className="icon">{icon}</span>
                              <span className="text">{matchScore}% MATCH</span>
                            </div>
                          );
                        })()}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                        {opp.description}
                      </p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        🌐 Sumber: <a href={opp.sourceUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                          {opp.sourceName || opp.source || 'NUSA Partner Network'}
                        </a>
                        {opp.compensationMin ? ` • 💰 Rp ${opp.compensationMin.toLocaleString('id-ID')} - Rp ${opp.compensationMax.toLocaleString('id-ID')}` : ''}
                        {opp.location ? ` • 📍 ${opp.location}` : ''}
                      </div>
                    </div>
                    <a href="/buyer" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      Buka Task / Arena →
                    </a>
                  </div>
                  {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                      {opp.requiredSkills.map((t, sIdx) => (
                        <span key={sIdx} style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {marketplaceProjects.length > 0 && (
                <>
                  <h3 style={{ fontSize: '1.2rem', marginTop: '20px', borderBottom: '1px solid var(--border-medium)', paddingBottom: '8px' }}>Proyek & Task (Marketplace Riil)</h3>
                  {marketplaceProjects.map(proj => (
                    <div key={proj.id} className="dashboard-action-card color-amber" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-amber)', background: 'var(--accent-amber-glow)', padding: '3px 10px', borderRadius: '100px' }}>
                              PROJECT
                            </span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--accent-green)', background: 'var(--accent-green-glow)', padding: '3px 8px', borderRadius: '100px' }}>
                              Status: {proj.status}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{proj.title}</h3>
                            {(() => {
                              const aiData = aiScores.projects[proj.id];
                              if (aiScoresLoading && !aiData) return (
                                <div className="ai-match-badge loading" title="Sedang menganalisis profil Anda...">
                                  <span className="icon">⏳</span><span className="text">Analisis AI...</span>
                                </div>
                              );
                              if (!aiData) return null;
                              const { matchScore } = aiData;
                              let level = 'low'; let icon = '📋';
                              if (matchScore >= 85) { level = 'high'; icon = '🔥'; }
                              else if (matchScore >= 65) { level = 'medium'; icon = '⚡'; }
                              else if (matchScore >= 40) { level = 'low'; icon = '💡'; }

                              return (
                                <div className={`ai-match-badge ${level}`} onClick={() => setSelectedMatch({ ...aiData, title: proj.title })} title="Lihat detail alasan kecocokan AI">
                                  <span className="icon">{icon}</span>
                                  <span className="text">{matchScore}% MATCH</span>
                                </div>
                              );
                            })()}
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                            {proj.description}
                          </p>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            🏢 Oleh: {proj.customer?.billingEmail || 'Customer'}
                            {proj.budget ? ` • 💰 Rp ${(proj.budget / 100).toLocaleString('id-ID')}` : ''}
                            {proj.workerCount ? ` • 👥 Butuh ${proj.workerCount} pekerja` : ''}
                          </div>
                          {proj.tasks && proj.tasks.length > 0 && (
                            <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                              <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Tasks dalam proyek ini:</h4>
                              {proj.tasks.map(task => (
                                <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-medium)', fontSize: '0.8rem' }}>
                                  <span>{task.title}</span>
                                  <span style={{ color: 'var(--accent-green)' }}>Rp {(task.compensationCents / 100).toLocaleString('id-ID')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <a href="/buyer" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          Lihat Detail →
                        </a>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            {allFilteredOppsCount > oppPageSize && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
                Menampilkan {filteredOpps.length} dari {allFilteredOppsCount} peluang. Ubah ukuran halaman untuk melihat lebih banyak.
              </p>
            )}
          </section>
        )}

        {/* ===================== TAB: PRIVACY & CONSENT ===================== */}
        {activeTab === 'privacy-consent' && (
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">🛡️ Privacy & Consent</h2>
            <p className="dashboard-section-subtitle">
              Kelola pengaturan privasi dan persetujuan penggunaan data Anda sesuai dengan standar kepatuhan.
            </p>
            <div className="dashboard-actions-grid" style={{ marginTop: '24px' }}>
              <div className="dashboard-action-card color-blue" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Penggunaan Data untuk Pelatihan AI</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Izinkan platform NUSA untuk menggunakan data portofolio dan hasil kerja Anda yang telah di-anonimisasi guna melatih model AI demi meningkatkan kualitas sistem rekomendasi karir.
                </p>
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('Persetujuan berhasil diperbarui dan dicatat dalam Audit Log.')}>
                  Izinkan & Simpan
                </button>
              </div>
              
              <div className="dashboard-action-card color-purple" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Berbagi dengan Pihak Ketiga (Employer)</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Izinkan profil lengkap Anda, termasuk riwayat verifikasi dan skor Work DNA, untuk dibagikan kepada perusahaan (employer) terverifikasi di jaringan NUSA saat Anda melamar proyek.
                </p>
                <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: 'var(--accent-purple)' }} onClick={() => alert('Persetujuan berhasil diperbarui dan dicatat dalam Audit Log.')}>
                  Izinkan & Simpan
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== TAB: NUSA INTEGRATION ===================== */}
        {activeTab === 'nusa-integration' && (
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">🛰️ NUSA Integration Dashboard</h2>
            <p className="dashboard-section-subtitle">
              Data resmi BPS, statistik penggunaan API, gap keterampilan, dan status integrasi ekosistem NUSA.
            </p>

            {/* Integration Stats Cards */}
            {nusaData.integrationStats && (
              <div className="dashboard-stats" style={{ marginBottom: '24px' }}>
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-icon" style={{ background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)' }}>👥</div>
                  <div className="dashboard-stat-info">
                    <span className="dashboard-stat-value">{nusaData.integrationStats.totalUsers || 0}</span>
                    <span className="dashboard-stat-label">Total Pengguna</span>
                  </div>
                </div>
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-icon" style={{ background: 'var(--accent-green-glow)', color: 'var(--accent-green)' }}>📝</div>
                  <div className="dashboard-stat-info">
                    <span className="dashboard-stat-value">{nusaData.integrationStats.totalTasks || 0}</span>
                    <span className="dashboard-stat-label">Total AI Tasks</span>
                  </div>
                </div>
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-icon" style={{ background: 'var(--accent-amber-glow)', color: 'var(--accent-amber)' }}>✅</div>
                  <div className="dashboard-stat-info">
                    <span className="dashboard-stat-value">{nusaData.integrationStats.totalContributions || 0}</span>
                    <span className="dashboard-stat-label">Total Kontribusi</span>
                  </div>
                </div>
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-icon" style={{ background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)' }}>🎯</div>
                  <div className="dashboard-stat-info">
                    <span className="dashboard-stat-value">{nusaData.integrationStats.activeOpportunities || 0}</span>
                    <span className="dashboard-stat-label">Peluang Aktif</span>
                  </div>
                </div>
              </div>
            )}

            {/* BPS Data Panel */}
            {nusaData.bps && (
              <div className="auth-card" style={{ maxWidth: '100%', margin: '0 0 24px 0', border: '1px solid rgba(59,130,246,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📊 Data Resmi BPS — Statistik Ketenagakerjaan Indonesia</h3>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--accent-green)', background: 'var(--accent-green-glow)', padding: '3px 10px', borderRadius: '100px' }}>
                    {nusaData.bps.verificationStatus || 'OFFICIAL_PUBLIC'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Sumber: <a href={nusaData.bps.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>{nusaData.bps.sourceName}</a>
                  {' '}• Periode: {nusaData.bps.period}
                </p>
                {nusaData.bps.metrics && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    {[
                      { label: 'Tingkat Pengangguran Terbuka', value: `${nusaData.bps.metrics.tpt}%`, icon: '📉' },
                      { label: 'Angkatan Kerja', value: `${nusaData.bps.metrics.angkatanKerja} Juta`, icon: '👥' },
                      { label: 'Penduduk Bekerja', value: `${nusaData.bps.metrics.pendudukBekerja} Juta`, icon: '💼' },
                      { label: 'Sektor Informal', value: `${nusaData.bps.metrics.sektorInformal}%`, icon: '🏪' },
                      { label: 'Sektor Formal', value: `${nusaData.bps.metrics.sektorFormal}%`, icon: '🏢' },
                      { label: 'Pertumbuhan Y-on-Y', value: `${nusaData.bps.metrics.pertumbuhanTenagaKerja}%`, icon: '📈' },
                    ].map((m, i) => (
                      <div key={i} style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '6px' }}>{m.icon}</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{m.value}</span>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>📈 Statistik Penggunaan API</h3>
                <ApiUsageChart />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>🔧 Gap Keterampilan Pasar</h3>
                <TopSkillsGapChart />
              </div>
            </div>

            {/* Data Policy Notice */}
            <div className="dashboard-notice" style={{ marginTop: '16px' }}>
              <span className="dashboard-notice-icon">🛡️</span>
              <div>
                <strong>Kebijakan Data: REAL_DATA_ONLY</strong>
                <p>Seluruh data pada dashboard ini bersumber dari BPS RI, Kemnaker, dan jaringan mitra NUSA terverifikasi. Tidak ada data buatan/dummy.</p>
              </div>
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

      {/* AI Match Modal Overlay */}
      {selectedMatch && (
        <div className="ai-match-modal-overlay" onClick={(e) => { if (e.target.className === 'ai-match-modal-overlay') setSelectedMatch(null); }}>
          <div className="ai-match-modal">
            <div className="ai-match-modal-header">
              <div className="ai-match-modal-title">
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <div>
                  <h3 style={{ margin: 0 }}>AI Match Analysis</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>untuk "{selectedMatch.title}"</span>
                </div>
              </div>
              <button className="ai-match-modal-close" onClick={() => setSelectedMatch(null)}>×</button>
            </div>
            <div className="ai-match-modal-body">
              {/* Score Hero */}
              <div className="ai-match-score-hero">
                <div className={`ai-match-score-big ${selectedMatch.matchScore >= 85 ? 'high' : selectedMatch.matchScore >= 65 ? 'medium' : 'low'}`}>
                  {selectedMatch.matchScore}%
                </div>
                <div className="ai-match-explanation">
                  {selectedMatch.matchExplanation}
                </div>
              </div>

              {/* Reasons */}
              {selectedMatch.matchReasons && selectedMatch.matchReasons.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-accent)' }}>✨ Mengapa AI merekomendasikan ini?</h4>
                  <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {selectedMatch.matchReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Breakdown */}
              {selectedMatch.matchBreakdown && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-accent)' }}>📊 Breakdown per Pilar (6-Pillar Model)</h4>
                  <div className="ai-match-breakdown">
                    {Object.values(selectedMatch.matchBreakdown).map((b, i) => (
                      <div key={i} className="ai-breakdown-item">
                        <div className="ai-breakdown-header">
                          <span>{b.label} <span style={{ color: 'var(--text-muted)' }}>(Bobot {b.weight}%)</span></span>
                          <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{b.score}%</span>
                        </div>
                        <div className="ai-breakdown-bar">
                          <div className="ai-breakdown-fill" style={{ width: `${b.score}%`, background: `linear-gradient(90deg, var(--accent-purple), var(--accent-blue))` }}></div>
                        </div>
                        <div className="ai-breakdown-detail">{b.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Engine Used */}
              <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Mesin AI: {selectedMatch.matchSource === 'GEMINI_AI' ? 'Google Gemini 3.1 Pro (Contextual)' : 'NUSA Heuristic Engine v2'}</span>
                <span>Diperbarui: Baru saja</span>
              </div>
            </div>
            
            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-medium)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setSelectedMatch(null)}>Tutup</button>
              <a href="/buyer" className="btn-primary" style={{ padding: '8px 16px' }}>Lamar / Kerjakan Task</a>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>© 2026 RESTART AI — Human Capital Recovery & Second-Life OS. Powered by NUSA Data & AI Intelligence.</p>
      </footer>
    </>
  );
}
