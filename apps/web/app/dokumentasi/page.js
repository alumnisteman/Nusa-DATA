'use client';
import { useState } from 'react';

export default function DokumentasiPage() {
  const [search, setSearch] = useState('');
  const docs = [
    { title: 'API Authentication', content: 'Endpoint POST /api/auth/login, POST /api/auth/register, POST /api/auth/reset-password. Kirim JSON dengan email & password.' },
    { title: 'Endpoint Evaluasi', content: 'GET /api/buyer/evaluations, POST /api/buyer/evaluations untuk membuat evaluasi baru. Lihat dokumentasi Swagger di /api-docs jika ada.' },
    { title: 'Penggunaan RabbitMQ', content: 'Queue task.submitted digunakan untuk mengirim hasil evaluasi ke worker.' },
    { title: 'Prisma Schema', content: 'Model utama: User, AIWorkTask, Response, Contributor, Opportunity, dll. Lihat file prisma/schema.prisma.' }
  ];

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.content.toLowerCase().includes(search.toLowerCase())
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
          <a href="/bantuan" className="nav-link">Bantuan</a>
          <a href="/dokumentasi" className="nav-link active">Dokumentasi</a>
        </nav>
      </header>

      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Dokumentasi API & Sistem</h1>
          <p className="auth-subtitle">Cari topik dokumentasi yang Anda butuhkan.</p>
          <input
            type="text"
            placeholder="Cari dokumentasi..."
            className="form-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="doc-list">
            {filtered.map((doc, i) => (
              <div key={i} className="doc-item">
                <h3 className="doc-title">{doc.title}</h3>
                <p className="doc-content">{doc.content}</p>
              </div>
            ))}
            {filtered.length === 0 && <p>Tidak ada hasil.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
