'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ApiUsageChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Karena Nginx mem-proxy /api ke backend, gunakan fallback localhost:3001 untuk dev lokal
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch(`${API_URL}/api/usage`);
        if (!res.ok) throw new Error('Failed to fetch usage data');
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel">
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <div className="loading-spinner" />
          <p>Memuat statistik penggunaan API…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <p style={{ color: 'var(--danger)' }}>Error: {error}</p>;
  }

  // Transform data for Chart.js – expect [{date: '2024-01-01', count: 120}, ...]
  const labels = data.map((d) => new Date(d.date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));
  const counts = data.map((d) => d.count);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'API Usage (requests)',
        data: counts,
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'var(--accent-blue)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Statistik Penggunaan API per Bulan' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="glass-panel">
      <Line data={chartData} options={options} />
    </div>
  );
}
