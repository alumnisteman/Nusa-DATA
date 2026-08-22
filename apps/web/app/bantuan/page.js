'use client';
import { useState } from 'react';

export default function BantuanPage() {
  const [search, setSearch] = useState('');
  const faq = [
    { q: 'Bagaimana cara mendaftar?', a: 'Klik tombol "Daftar Gratis" pada halaman beranda, isi formulir, dan konfirmasi email.' },
    { q: 'Bagaimana cara reset password?', a: 'Gunakan tautan "Lupa password?" di halaman login, masukkan email, lalu atur password baru.' },
    { q: 'Apakah data saya aman?', a: 'Semua data disimpan di server yang dilindungi SSL, dan hanya Anda yang dapat mengaksesnya setelah login.' },
    { q: 'Bagaimana cara menghubungi tim support?', a: 'Gunakan menu Kontak di footer atau kirim email ke support@restart.ai.' }
  ];

  const filtered = faq.filter(item =>
    item.q.toLowerCase().includes(search.toLowerCase()) ||
    item.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <header className="nav-bar">
        <div className="nav-logo">
          <span className="nav-logo-icon">🇮🇩</span>
          <span>RESTART <span className="nav-logo-badge">AI</span></span>
        </div>
        <nav className="nav-links">
          <a href="/" className="nav-link">Beranda</a>
          <a href="#fitur" className="nav-link">Fitur</a>
          <a href="/bantuan" className="nav-link active">Bantuan</a>
        </nav>
      </header>

      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Pusat Bantuan</h1>
          <p className="auth-subtitle">Temukan jawaban atas pertanyaan umum Anda.</p>

          <input
            type="text"
            placeholder="Cari pertanyaan..."
            className="form-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="faq-list">
            {filtered.map((item, i) => (
              <div key={i} className="faq-item">
                <h3 className="faq-question">{item.q}</h3>
                <p className="faq-answer">{item.a}</p>
              </div>
            ))}
            {filtered.length === 0 && <p>Tidak ada hasil pencarian.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
