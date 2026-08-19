import React from 'react';

export default function AdminPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>RESTART AI — Admin Dashboard</h1>
      <p style={{ color: '#94a3b8' }}>Selamat datang di panel admin RESTART AI.</p>
    </div>
  );
}
