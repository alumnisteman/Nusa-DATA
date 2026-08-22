'use client';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
  const [form, setForm] = useState({ email: '', newPassword: '' });
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
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: '✅ Password berhasil direset! Mengalihkan ke halaman login...', type: 'success' });
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setMessage({ text: data.error || 'Gagal mereset password.', type: 'error' });
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
          <a href="/login" className="nav-link">← Kembali ke Login</a>
        </nav>
      </header>

      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Buat password baru untuk akun Anda.
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
              <label className="form-label" htmlFor="newPassword">Password Baru</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                className="form-input"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="Masukkan password baru Anda"
                required
              />
            </div>

            <button type="submit" className="btn-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Reset Password'}
            </button>
          </form>

          <div className="auth-switch">
            Ingat password Anda? <a href="/login">Masuk di sini</a>
          </div>
        </div>
      </div>
    </>
  );
}
