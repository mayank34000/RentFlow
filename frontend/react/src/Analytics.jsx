import React, { useState, useEffect } from 'react';
import { apiRequest } from './services/api';
import { useTheme } from './useNavbarBehavior';
import './styles/analytics.css';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/admin/analytics/overview');
      setData(res.data.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#e5e7eb' } }
    },
    scales: {
      x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } },
      y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: '#e5e7eb' } }
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Analytics Dashboard</h1>
            <p>System metrics and insights</p>
          </div>
          <div>
            {lastUpdated && <span style={{ marginRight: '15px', color: '#9ca3af' }}>Last updated: {lastUpdated}</span>}
            <button onClick={fetchAnalytics} className="refresh-btn">Refresh Data</button>
          </div>
        </header>

        {error && (
          <div className="error-card">
            <p>{error}</p>
            <button onClick={fetchAnalytics}>Retry</button>
          </div>
        )}

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading analytics...</div>
        ) : data ? (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <h3>Total Users</h3>
                <div className="value">{data.users.total}</div>
              </div>
              <div className="kpi-card">
                <h3>Total Feedback</h3>
                <div className="value">{data.feedback.total}</div>
              </div>
              <div className="kpi-card">
                <h3>Average Rating</h3>
                <div className="value">{data.feedback.averageRating}</div>
              </div>
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
              <div className="chart-card" style={{ background: '#1f2937', padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px' }}>Users by Role</h3>
                <Pie 
                  options={pieOptions}
                  data={{
                    labels: data.users.byRole.map(r => r._id || 'customer'),
                    datasets: [{
                      data: data.users.byRole.map(r => r.count),
                      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
                      borderColor: '#1f2937'
                    }]
                  }}
                />
              </div>

              <div className="chart-card" style={{ background: '#1f2937', padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px' }}>KYC Status</h3>
                <Pie 
                  options={pieOptions}
                  data={{
                    labels: data.users.byKyc.map(k => k._id || 'none'),
                    datasets: [{
                      data: data.users.byKyc.map(k => k.count),
                      backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#6b7280'],
                      borderColor: '#1f2937'
                    }]
                  }}
                />
              </div>

              <div className="chart-card" style={{ background: '#1f2937', padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px' }}>Pro vs Standard</h3>
                <Pie 
                  options={pieOptions}
                  data={{
                    labels: ['Pro', 'Standard'],
                    datasets: [{
                      data: [
                        data.users.byPro.find(p => p._id === true)?.count || 0,
                        data.users.byPro.find(p => p._id === false)?.count || 0
                      ],
                      backgroundColor: ['#8b5cf6', '#6b7280'],
                      borderColor: '#1f2937'
                    }]
                  }}
                />
              </div>

              <div className="chart-card" style={{ background: '#1f2937', padding: '20px', borderRadius: '8px', height: '300px', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '15px' }}>Registration Trend</h3>
                <Line 
                  options={chartOptions}
                  data={{
                    labels: data.users.registrationTrend.map(t => `${t._id.year}-${t._id.month}-${t._id.day}`),
                    datasets: [{
                      label: 'New Users',
                      data: data.users.registrationTrend.map(t => t.count),
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      fill: true,
                      tension: 0.4
                    }]
                  }}
                />
              </div>

              <div className="chart-card" style={{ background: '#1f2937', padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px' }}>Rating Distribution</h3>
                <Bar 
                  options={chartOptions}
                  data={{
                    labels: data.feedback.ratingDistribution.map(r => `${r._id} Stars`),
                    datasets: [{
                      label: 'Count',
                      data: data.feedback.ratingDistribution.map(r => r.count),
                      backgroundColor: '#f59e0b'
                    }]
                  }}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
