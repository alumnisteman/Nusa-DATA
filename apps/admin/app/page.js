'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ACCOUNT_LABELS = {
  PLATFORM_REVENUE: { label: 'Pendapatan Platform', color: '#22c55e' },
  PLATFORM_FEE:     { label: 'Fee Platform',        color: '#a78bfa' },
  WORKER_WALLET:    { label: 'Dompet Worker',        color: '#38bdf8' },
  CUSTOMER_PAYMENT: { label: 'Pembayaran Customer',  color: '#fb923c' },
  REFUND_LIABILITY: { label: 'Kewajiban Refund',     color: '#f87171' },
  TAX_LIABILITY:    { label: 'Kewajiban Pajak',      color: '#fbbf24' },
};

function formatIDR(cents) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(cents / 100);
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('monetization');
  const [stats, setStats]         = useState({ totalRevenue: 0, paidInvoicesCount: 0 });
  const [invoices, setInvoices]   = useState([]);
  const [ledger, setLedger]       = useState({ entries: [], summary: {} });
  const [auditLogs, setAuditLogs] = useState([]);
  const [monetization, setMonetization] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [reportRes, ledgerRes, auditRes, invoicesRes, chartRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/admin/revenue`),
          axios.get(`${API_URL}/api/admin/ledger`),
          axios.get(`${API_URL}/api/admin/audit-logs`),
          axios.get(`${API_URL}/api/admin/invoices`),
          axios.get(`${API_URL}/api/admin/revenue/chart`)
        ]);
        if (reportRes.status === 'fulfilled') {
          const r = reportRes.value.data.report;
          setStats({ totalRevenue: r.totalNetRevenueCents, paidInvoicesCount: 0 });
          setMonetization(r);
        }
        if (ledgerRes.status === 'fulfilled') setLedger(ledgerRes.value.data);
        if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value.data);
        if (invoicesRes.status === 'fulfilled') setInvoices(invoicesRes.value.data);
        if (chartRes.status === 'fulfilled') setChartData(chartRes.value.data);
      } catch (e) {
        console.error('Admin fetch error', e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Render chart when data is ready
  useEffect(() => {
    if (!chartData) return;
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    if (!ctx) return;
    // Destroy previous chart if exists
    const existingChart = Chart.getChart('revenueChart');
    if (existingChart) existingChart.destroy();
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.map(d => d.month),
        datasets: [
          {
            label: 'MRR',
            data: chartData.map(d => d.mrrCents / 100),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.2)',
            tension: 0.3,
          },
          {
            label: 'Komisi Platform',
            data: chartData.map(d => d.commissionCents / 100),
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(168,139,250,0.2)',
            tension: 0.3,
          },
          {
            label: 'Payout Worker',
            data: chartData.map(d => d.workerPayoutCents / 100),
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56,189,248,0.2)',
            tension: 0.3,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top', labels: { color: '#f8fafc' } }, tooltip: { mode: 'index', intersect: false } },
        scales: { x: { ticks: { color: '#f8fafc' } }, y: { ticks: { color: '#f8fafc' }, beginAtZero: true } }
      }
    });
  }, [chartData]);

  const tab = (id, label) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '10px 22px', border: 'none', cursor: 'pointer', fontWeight: 600,
        borderRadius: '8px 8px 0 0', fontSize: '0.9rem',
        background: activeTab === id ? '#1e293b' : 'transparent',
        color: activeTab === id ? '#f8fafc' : '#64748b',
        borderBottom: activeTab === id ? '2px solid #6366f1' : '2px solid transparent',
      }}
    >{label}</button>
  );

  return (
    <div style={{ padding: '40px', minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>🛡️ RESTART AI — Admin Center</h1>
        <p style={{ color: '#64748b', margin: '6px 0 0' }}>Semua data berasal dari transaksi riil. Tidak ada data dummy.</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px', padding: '20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Pendapatan</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', marginTop: '6px' }}>{formatIDR(stats.totalRevenue)}</div>
        </div>
        <div style={{ flex: 1, minWidth: '180px', padding: '20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice Lunas</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '6px' }}>{stats.paidInvoicesCount}</div>
        </div>
        <div style={{ flex: 1, minWidth: '180px', padding: '20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Invoice</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '6px' }}>{invoices.length}</div>
        </div>
        <div style={{ flex: 1, minWidth: '180px', padding: '20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jurnal Ledger</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '6px' }}>{ledger.entries.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #334155', marginBottom: '24px', display: 'flex', gap: '4px', overflowX: 'auto' }}>
        {tab('monetization', '💎 Monetization & Revenue')}
        {tab('revenue', '🧾 Invoices')}
        {tab('ledger',  '📒 Ledger / Cashflow')}
        {tab('compliance', '🛡️ Compliance & Audit')}
      </div>

      {loading ? <p style={{ color: '#64748b' }}>Memuat data...</p> : (
        <>
          {/* Tab: Monetization */}
          {activeTab === 'monetization' && monetization && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '20px' }}>6 Streams of Revenue Analytics</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>Total Net Revenue</h3>
                    <span style={{ fontSize: '1.5rem' }}>💎</span>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#22c55e', margin: '12px 0' }}>
                    {formatIDR(monetization.totalNetRevenueCents)}
                  </div>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Total pendapatan bersih platform (MRR + Komisi)</p>
                </div>

                <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>Monthly Recurring (MRR)</h3>
                    <span style={{ fontSize: '1.5rem' }}>🔄</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', margin: '12px 0' }}>
                    {formatIDR(monetization.mrrCents)}
                  </div>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Dari B2C Premium & B2B Enterprise</p>
                </div>

                <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>Platform Commission</h3>
                    <span style={{ fontSize: '1.5rem' }}>🤝</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a78bfa', margin: '12px 0' }}>
                    {formatIDR(monetization.commissionCents)}
                  </div>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Dari Marketplace, AI Task Margin & Knowledge Legacy</p>
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Distribusi ke Ekosistem (Payout)</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#64748b' }}>Pekerja / Freelancer (Worker Wallet)</span>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>{formatIDR(monetization.workerPayoutCents)}</span>
                    </div>
                    <div style={{ height: '12px', background: '#334155', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: monetization.workerPayoutCents > 0 ? '70%' : '0%', background: '#f59e0b', borderRadius: '100px' }}></div>
                    </div>
                  </div>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '16px' }}>Total uang yang telah dicairkan atau dikreditkan ke dompet pekerja ekosistem NUSA-DATA.</p>
              </div>
            </div>
          )}

          {/* Tab: Invoice & Revenue */}
          {activeTab === 'revenue' && (
            <>
              {invoices.length === 0 ? (
                <p style={{ color: '#475569' }}>Belum ada invoice terdaftar.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      {['Invoice #', 'Status', 'Total', 'Dibuat'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #334155' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{inv.invoiceNumber}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                            background: inv.status === 'PAID' ? '#14532d' : inv.status === 'OPEN' ? '#1e3a5f' : '#1e293b',
                            color: inv.status === 'PAID' ? '#4ade80' : inv.status === 'OPEN' ? '#60a5fa' : '#94a3b8',
                          }}>{inv.status}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{formatIDR(inv.totalCents)}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.85rem' }}>
                          {new Date(inv.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* Tab: Ledger / Cashflow */}
          {activeTab === 'ledger' && (
            <>
              {/* Account Summary */}
              {Object.keys(ledger.summary).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
                  {Object.entries(ledger.summary).map(([acc, bal]) => {
                    const meta = ACCOUNT_LABELS[acc] || { label: acc, color: '#94a3b8' };
                    return (
                      <div key={acc} style={{ padding: '16px 20px', background: '#1e293b', borderRadius: '10px', borderLeft: `4px solid ${meta.color}`, minWidth: '200px' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{meta.label}</div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem', marginTop: '4px', color: bal.net >= 0 ? '#4ade80' : '#f87171' }}>
                          {formatIDR(Math.abs(bal.net))} {bal.net >= 0 ? '▲' : '▼'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>
                          D: {formatIDR(bal.DEBIT || 0)} · C: {formatIDR(bal.CREDIT || 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ledger Entries */}
              {ledger.entries.length === 0 ? (
                <p style={{ color: '#475569' }}>Belum ada entri jurnal. Proses pembayaran untuk mengisi ledger secara otomatis.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {['Tanggal', 'Akun', 'Tipe', 'Jumlah', 'Keterangan'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #334155' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.entries.map(e => {
                      const meta = ACCOUNT_LABELS[e.account] || { label: e.account, color: '#94a3b8' };
                      return (
                        <tr key={e.id} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {new Date(e.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ color: e.type === 'CREDIT' ? '#4ade80' : '#f87171', fontWeight: 700 }}>{e.type}</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700 }}>{formatIDR(e.amountCents)}</td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.description}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* Tab: Compliance & Audit */}
          {activeTab === 'compliance' && (
            <>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Jejak Audit Otomatis (Immutable)</h2>
              {auditLogs.length === 0 ? (
                <p style={{ color: '#475569' }}>Belum ada log aktivitas yang terekam.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #334155' }}>Waktu</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #334155' }}>User / IP</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #334155' }}>Aksi</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #334155' }}>Entitas / Endpoint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>
                          {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {log.userId ? (
                            <span style={{ fontWeight: 600, color: '#38bdf8' }}>{log.user?.email || log.userId}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>System / {log.details?.ip || 'Unknown'}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                            background: log.action === 'CREATE' ? '#14532d' : log.action === 'DELETE' ? '#7f1d1d' : '#1e3a5f',
                            color: log.action === 'CREATE' ? '#4ade80' : log.action === 'DELETE' ? '#fca5a5' : '#60a5fa',
                          }}>{log.action}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {log.entityId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

