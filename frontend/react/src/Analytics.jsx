import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, clearAuthSession } from './services/api';
import { useTheme } from './useNavbarBehavior';
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
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

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
  const roleDistribution = userStats.roleDistribution ?? [];
  const kycDistribution = userStats.kycDistribution ?? [];
  const proUsers = userStats.proUsers ?? 0;
  const nonProUsers = userStats.nonProUsers ?? 0;
  const registrationTrend = userStats.registrationTrend ?? [];
  const ratingDistribution = feedbackStats.ratingDistribution ?? [];
  const feedbackTrend = feedbackStats.feedbackTrend ?? [];

  return (
    <div className="admin-page">
      {/* Admin Portal Navbar */}
      <nav className="navbar" id="site-header">
        <Link to="/admin-dashboard" className="navbar-brand">
          <span className="brand-rent">Rent</span><span className="brand-flow">Flow</span>
        </Link>
        <button className={`menu-toggle${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
        <ul className={`navbar-links${menuOpen ? ' open' : ''}`}>
          <li><Link to="/admin-dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link></li>
          <li><Link to="/analytics" className="active" onClick={() => setMenuOpen(false)}>Analytics</Link></li>
          <li><Link to="/feedback" onClick={() => setMenuOpen(false)}>Feedback</Link></li>
          <li><a href="#" className="logout-link" onClick={(e) => { e.preventDefault(); setMenuOpen(false); handleLogout(); }}>Logout</a></li>
        </ul>
      </nav>

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
                <div className="value">{userStats.totalUsers ?? 0}</div>
              </div>
              <div className="kpi-card">
                <h3>Total Feedback</h3>
                <div className="value">{feedbackStats.totalFeedback ?? 0}</div>
              </div>
              <div className="kpi-card">
                <h3>Average Rating</h3>
                <div className="value">{feedbackStats.averageRating ?? 0}</div>
              </div>
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Users by Role</h3>
                {roleDistribution.length > 0 ? (
                  <Pie 
                    options={pieOptions}
                    data={{
                      labels: roleDistribution.map(r => r._id || 'customer'),
                      datasets: [{
                        data: roleDistribution.map(r => r.count),
                        backgroundColor: ['var(--primary-orange)', '#10b981', '#f59e0b'],
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
                      labels: kycDistribution.map(k => k._id || 'none'),
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
                      labels: ['Pro', 'Standard'],
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
                        borderColor: 'var(--primary-orange)',
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
                        backgroundColor: ['#10b981', 'var(--primary-orange)', '#f59e0b', '#ef4444', '#6b7280'],
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
        ) : null}
      </div>
    </div>
  );
}

