'use client';
import { useState } from 'react';

export default function LoginPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: '✅ Login berhasil! Mengalihkan...', type: 'success' });
        if (data.token) {
          localStorage.setItem('restart_token', data.token);
        }
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        setMessage({ text: data.error || 'Email atau password salah.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Tidak dapat terhubung ke server.', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <>
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
          <h1 className="auth-title">Masuk ke RESTART AI</h1>
          <p className="auth-subtitle">
            Lanjutkan perjalanan karir Anda.
          </p>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-input"
                value={form.password}
                onChange={handleChange}
                placeholder="Masukkan password Anda"
                required
              />
            </div>

            <button type="submit" className="btn-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="auth-switch">
            Belum punya akun? <a href="/register">Daftar sekarang</a>
          </div>
        </div>
      </div>
    </>
  );
}
