import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function TopSkillsGapChart() {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/buyer/skills-gap`);
        setGaps(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error('Error fetching skills‑gap data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-spinner" style={{ margin: '20px auto' }}></div>;
  }

  if (!gaps.length) {
    return <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Tidak ada data gap keterampilan.</p>;
  }

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <h2 className="glass-panel-title" style={{ marginBottom: '12px' }}>🔧 Top Skills Gap</h2>
      <table className="skills-gap-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px' }}>Skill</th>
            <th style={{ textAlign: 'right', padding: '8px' }}>Gap Score</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid var(--border-muted)' }}>
              <td style={{ padding: '8px' }}>{item.skill}</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>{(item.gapScore * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
