'use client';
import { useState } from 'react';

export default function RegisterPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'PHK'
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (form.password !== form.confirmPassword) {
      setMessage({ text: 'Password dan konfirmasi password tidak cocok.', type: 'error' });
      return;
    }

    if (form.password.length < 8) {
      setMessage({ text: 'Password minimal 8 karakter.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          userType: form.userType
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: '✅ Registrasi berhasil! Silakan login untuk melanjutkan.', type: 'success' });
        setForm({ fullName: '', email: '', password: '', confirmPassword: '', userType: 'PHK' });
        setTimeout(() => { window.location.href = '/login'; }, 2000);
      } else {
        setMessage({ text: data.error || 'Registrasi gagal. Coba lagi.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Tidak dapat terhubung ke server. Pastikan API sudah berjalan.', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <>
      {/* Navigation */}
      <header className="nav-bar">
        <div className="nav-logo">
          <span className="nav-logo-icon">🇮🇩</span>
          <span>RESTART <span className="nav-logo-badge">AI</span></span>
        </div>
        <nav className="nav-links">
          <a href="/" className="nav-link">← Kembali ke Beranda</a>
        </nav>
      </header>

      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Buat Akun RESTART AI</h1>
          <p className="auth-subtitle">
            Mulai perjalanan pemulihan karir Anda. Daftar dengan akun nyata — 
            tidak ada data palsu.
          </p>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Nama Lengkap</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="form-input"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Nama lengkap sesuai identitas"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="userType">Kategori</label>
              <select
                id="userType"
                name="userType"
                className="form-select"
                value={form.userType}
                onChange={handleChange}
              >
                <option value="PHK">Korban PHK</option>
                <option value="RETIRED">Pensiunan</option>
                <option value="PRE_RETIRED">Calon Pensiunan</option>
                <option value="GENERAL">Umum</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-input"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimal 8 karakter"
                required
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Konfirmasi Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="form-input"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Ulangi password"
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn-full" disabled={loading}>
              {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="auth-switch">
            Sudah punya akun? <a href="/login">Masuk di sini</a>
          </div>
        </div>
      </div>
    </>
  );
}
