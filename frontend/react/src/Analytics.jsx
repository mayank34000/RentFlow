import React, { useState, useEffect } from 'react';
import { apiRequest } from './services/api';
import { adminApiErrorMessage } from './adminApiMessages';
import { useTheme } from './useNavbarBehavior';
import { AdminNavbar } from './AdminDashboard';
import './styles/admin-dashboard.css';
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
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';

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
      setData(res.data.data || {});
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(adminApiErrorMessage(err, 'load analytics'));
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
      legend: { labels: { color: '#475569' } }
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(0,0,0,0.1)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(0,0,0,0.1)' } }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: '#475569' } }
    }
  };

  // Safely extract nested data with defaults
  const userStats = data?.userStats ?? {};
  const feedbackStats = data?.feedbackStats ?? {};
  const asArray = (value) => Array.isArray(value) ? value : [];
  const roleDistribution = asArray(userStats.roleDistribution);
  const kycDistribution = asArray(userStats.kycDistribution);
  const proUsers = Number.isFinite(userStats.proUsers) ? userStats.proUsers : null;
  const nonProUsers = Number.isFinite(userStats.nonProUsers) ? userStats.nonProUsers : null;
  const registrationTrend = asArray(userStats.registrationTrend);
  const ratingDistribution = asArray(feedbackStats.ratingDistribution).slice().sort((a, b) => Number(a._id) - Number(b._id));
  const feedbackTrend = asArray(feedbackStats.feedbackTrend);
  const totalUsers = Number(userStats.totalUsers) || 0;
  const distributionLabel = (entry, total) => {
    const name = entry._id || 'Unknown';
    const count = Number(entry.count) || 0;
    const percent = total ? Math.round((count / total) * 100) : 0;
    return `${name} ${count} (${percent}%)`;
  };

  return (
    <div className="ad-page analytics-admin-page">
      <AdminNavbar activePage="analytics" />

      <div className="ad-container analytics-admin-container">
        <header className="analytics-admin-header">
          <div>
            <h1>Analytics <span>Dashboard</span></h1>
            <p>System metrics and insights</p>
          </div>
          <div className="analytics-admin-actions">
            <span className="analytics-range-label">All available data</span>
            <button onClick={fetchAnalytics} className="ad-refresh" disabled={loading}><span aria-hidden="true">↻</span> Refresh Data</button>
            {lastUpdated && <small>Last updated: {lastUpdated}</small>}
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
              <div className="kpi-card analytics-admin-kpi analytics-users-kpi">
                <span className="analytics-kpi-icon" aria-hidden="true">♟</span>
                <h3>Total Users</h3>
                <div className="value">{userStats.totalUsers ?? '—'}</div>
                <small>— from previous period</small>
              </div>
              <div className="kpi-card analytics-admin-kpi analytics-feedback-kpi">
                <span className="analytics-kpi-icon" aria-hidden="true">▤</span>
                <h3>Total Feedback</h3>
                <div className="value">{feedbackStats.totalFeedback ?? '—'}</div>
                <small>— from previous period</small>
              </div>
              <div className="kpi-card analytics-admin-kpi analytics-rating-kpi">
                <span className="analytics-kpi-icon" aria-hidden="true">★</span>
                <h3>Average Rating</h3>
                <div className="value">{feedbackStats.totalFeedback ? feedbackStats.averageRating ?? '—' : '—'}</div>
                <small>— from previous period</small>
              </div>
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Users by Role</h3>
                {roleDistribution.length > 0 ? (
                  <Pie 
                    options={pieOptions}
                    data={{
                      labels: roleDistribution.map((r) => distributionLabel(r, totalUsers)),
                      datasets: [{
                        data: roleDistribution.map(r => r.count),
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
                        borderColor: '#ffffff'
                      }]
                    }}
                  />
                ) : (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>No data</div>
                )}
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>KYC Status</h3>
                {kycDistribution.length > 0 ? (
                  <Pie 
                    options={pieOptions}
                    data={{
                      labels: kycDistribution.map((k) => distributionLabel(k, totalUsers)),
                      datasets: [{
                        data: kycDistribution.map(k => k.count),
                        backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#6b7280'],
                        borderColor: '#ffffff'
                      }]
                    }}
                  />
                ) : (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>No data</div>
                )}
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Pro vs Standard</h3>
                {(proUsers > 0 || nonProUsers > 0) ? (
                  <Pie 
                    options={pieOptions}
                    data={{
                      labels: [
                        distributionLabel({ _id: 'Pro', count: proUsers }, totalUsers),
                        distributionLabel({ _id: 'Standard', count: nonProUsers }, totalUsers)
                      ],
                      datasets: [{
                        data: [proUsers, nonProUsers],
                        backgroundColor: ['#8b5cf6', '#6b7280'],
                        borderColor: '#ffffff'
                      }]
                    }}
                  />
                ) : (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>No data</div>
                )}
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Registration Trend</h3>
                {registrationTrend.length > 0 ? (
                  <Line 
                    options={chartOptions}
                    data={{
                      labels: registrationTrend.map(t => t._id),
                      datasets: [{
                        label: 'New Users',
                        data: registrationTrend.map(t => t.count),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                      }]
                    }}
                  />
                ) : (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>No data</div>
                )}
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Rating Distribution</h3>
                {ratingDistribution.length > 0 ? (
                  <Bar 
                    options={chartOptions}
                    data={{
                      labels: ratingDistribution.map(r => `${r._id} Stars`),
                      datasets: [{
                        label: 'Count',
                        data: ratingDistribution.map(r => r.count),
                        backgroundColor: '#f59e0b'
                      }]
                    }}
                  />
                ) : (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>No data</div>
                )}
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Rating Breakdown</h3>
                {ratingDistribution.length > 0 ? (
                  <Doughnut 
                    options={pieOptions}
                    data={{
                      labels: ratingDistribution.map(r => `${r._id} Stars`),
                      datasets: [{
                        data: ratingDistribution.map(r => r.count),
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'],
                        borderColor: '#ffffff'
                      }]
                    }}
                  />
                ) : (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>No data</div>
                )}
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Feedback Trend</h3>
                {feedbackTrend.length > 0 ? (
                  <Line 
                    options={chartOptions}
                    data={{
                      labels: feedbackTrend.map(t => t._id),
                      datasets: [{
                        label: 'New Feedback',
                        data: feedbackTrend.map(t => t.count),
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: true,
                        tension: 0.4
                      }]
                    }}
                  />
                ) : (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>No data</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <section className="analytics-empty-state" role="status">
            <h2>Analytics are unavailable</h2>
            <p>We couldn’t load the current metrics. Your page is still available; try refreshing the data.</p>
            <button type="button" className="ad-refresh" onClick={fetchAnalytics}>↻ Retry</button>
          </section>
        )}
      </div>
    </div>
  );
}

