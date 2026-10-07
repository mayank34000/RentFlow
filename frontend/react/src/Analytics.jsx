import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from './services/api';
import { adminApiErrorMessage } from './adminApiMessages';
import { useTheme } from './useNavbarBehavior';
import { AdminNavbar, DateRangePicker, DEFAULT_RANGE, getRange, rangeLabel, inRange } from './AdminDashboard';
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

const groupedCounts = (records, getKey, orderedKeys = []) => {
  if (!records.length) return [];
  const counts = records.reduce((result, record) => {
    const key = getKey(record);
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  const keys = [...orderedKeys, ...Object.keys(counts).filter((key) => !orderedKeys.includes(key))];
  return keys.map((key) => ({ _id: key, count: counts[key] || 0 }));
};

const dailyCounts = (records) => {
  const counts = records.reduce((result, record) => {
    const date = new Date(record.createdAt);
    if (!Number.isFinite(date.getTime())) return result;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([_id, count]) => ({ _id, count }));
};

export default function Analytics() {
  useTheme();
  const [darkTheme, setDarkTheme] = useState(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') return true;
    if (storedTheme === 'light') return false;
    const rootTheme = document.documentElement.getAttribute('data-theme');
    if (rootTheme === 'dark') return true;
    if (rootTheme === 'light') return false;
    return !document.body.classList.contains('light-theme');
  });
  const [data, setData] = useState(null);
  const [users, setUsers] = useState(null);
  const [feedbackRecords, setFeedbackRecords] = useState(null);
  const [usersError, setUsersError] = useState(null);
  const [feedbackError, setFeedbackError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE);
  const [custom, setCustom] = useState({ from: '', to: '' });

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    setUsersError(null);
    setFeedbackError(null);
    const [overviewResult, usersResult, feedbackResult] = await Promise.allSettled([
      apiRequest('/api/admin/analytics/overview'),
      apiRequest('/api/admin/users'),
      apiRequest('/api/feedback')
    ]);

    if (overviewResult.status === 'fulfilled') {
      setData(overviewResult.value.data.data || {});
      setLastUpdated(new Date().toLocaleTimeString());
    } else {
      setError(adminApiErrorMessage(overviewResult.reason, 'load analytics'));
    }

    if (usersResult.status === 'fulfilled') {
      setUsers(Array.isArray(usersResult.value.data.users) ? usersResult.value.data.users : []);
    } else {
      setUsers(null);
      setUsersError(adminApiErrorMessage(usersResult.reason, 'load users for analytics'));
    }

    if (feedbackResult.status === 'fulfilled') {
      setFeedbackRecords(Array.isArray(feedbackResult.value.data.feedbacks) ? feedbackResult.value.data.feedbacks : []);
    } else {
      setFeedbackRecords(null);
      setFeedbackError(adminApiErrorMessage(feedbackResult.reason, 'load feedback for analytics'));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const storedTheme = localStorage.getItem('theme');
      const rootTheme = document.documentElement.getAttribute('data-theme');
      setDarkTheme(storedTheme === 'dark' || (storedTheme === 'system' && rootTheme === 'dark') || (!storedTheme && rootTheme !== 'light' && !document.body.classList.contains('light-theme')));
    };
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', syncTheme);
    syncTheme();
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  const chartTextColor = darkTheme ? '#c7d0db' : '#475569';
  const chartTickColor = darkTheme ? '#b8c2cf' : '#64748b';
  const chartGridColor = darkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: chartTextColor } },
      tooltip: { backgroundColor: darkTheme ? '#101e2d' : '#1f2937', titleColor: darkTheme ? '#f8fafc' : '#fff', bodyColor: darkTheme ? '#c7d0db' : '#fff' }
    },
    scales: {
      x: { ticks: { color: chartTickColor }, grid: { color: chartGridColor } },
      y: { ticks: { color: chartTickColor }, grid: { color: chartGridColor } }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: chartTextColor } },
      tooltip: { backgroundColor: darkTheme ? '#101e2d' : '#1f2937', titleColor: darkTheme ? '#f8fafc' : '#fff', bodyColor: darkTheme ? '#c7d0db' : '#fff' }
    }
  };

  // Safely extract nested data with defaults
  const userStats = data?.userStats ?? {};
  const feedbackStats = data?.feedbackStats ?? {};
  const asArray = (value) => Array.isArray(value) ? value : [];
  const allTimeRoleDistribution = asArray(userStats.roleDistribution);
  const allTimeKycDistribution = asArray(userStats.kycDistribution);
  const allTimeProUsers = Number.isFinite(userStats.proUsers) ? userStats.proUsers : null;
  const allTimeNonProUsers = Number.isFinite(userStats.nonProUsers) ? userStats.nonProUsers : null;
  const allTimeRegistrationTrend = asArray(userStats.registrationTrend);
  const allTimeRatingDistribution = asArray(feedbackStats.ratingDistribution).slice().sort((a, b) => Number(a._id) - Number(b._id));
  const allTimeFeedbackTrend = asArray(feedbackStats.feedbackTrend);
  const totalUsers = Number(userStats.totalUsers) || 0;
  const range = useMemo(() => getRange(rangeKey, custom), [rangeKey, custom]);
  const isAllDataRange = !range.start && !range.end;
  const selectedRangeLabel = rangeLabel(rangeKey, range);
  const filteredUsers = useMemo(() => users === null ? null : users.filter((user) => inRange(user, range)), [users, range]);
  const filteredFeedback = useMemo(() => feedbackRecords === null ? null : feedbackRecords.filter((feedback) => inRange(feedback, range)), [feedbackRecords, range]);
  const roleDistribution = useMemo(() => isAllDataRange
    ? allTimeRoleDistribution
    : filteredUsers === null ? [] : groupedCounts(filteredUsers, (user) => user.role || 'unknown', ['customer', 'seller', 'admin']),
  [isAllDataRange, allTimeRoleDistribution, filteredUsers]);
  const kycDistribution = useMemo(() => isAllDataRange
    ? allTimeKycDistribution
    : filteredUsers === null ? [] : groupedCounts(filteredUsers, (user) => user.kycStatus || 'none', ['approved', 'pending', 'rejected', 'none']),
  [isAllDataRange, allTimeKycDistribution, filteredUsers]);
  const proUsers = isAllDataRange
    ? allTimeProUsers
    : filteredUsers === null ? null : filteredUsers.filter((user) => user.isPro === true).length;
  const nonProUsers = isAllDataRange
    ? allTimeNonProUsers
    : filteredUsers === null ? null : filteredUsers.length - proUsers;
  const ratingDistribution = useMemo(() => {
    if (isAllDataRange) return allTimeRatingDistribution;
    return filteredFeedback === null ? [] : groupedCounts(filteredFeedback, (feedback) => String(Number(feedback.rating)), ['1', '2', '3', '4', '5']);
  }, [isAllDataRange, allTimeRatingDistribution, filteredFeedback]);
  const rangeRegistrationTrend = useMemo(() => isAllDataRange
    ? allTimeRegistrationTrend
    : filteredUsers === null ? [] : dailyCounts(filteredUsers),
  [isAllDataRange, allTimeRegistrationTrend, filteredUsers]);
  const rangeFeedbackTrend = useMemo(() => isAllDataRange
    ? allTimeFeedbackTrend
    : filteredFeedback === null ? [] : dailyCounts(filteredFeedback),
  [isAllDataRange, allTimeFeedbackTrend, filteredFeedback]);
  const rangeTotalUsers = isAllDataRange ? totalUsers : filteredUsers === null ? null : filteredUsers.length;
  const rangeTotalFeedback = isAllDataRange
    ? Number(feedbackStats.totalFeedback) || 0
    : filteredFeedback === null ? null : filteredFeedback.length;
  const averageRating = isAllDataRange
    ? (rangeTotalFeedback ? feedbackStats.averageRating ?? '—' : '—')
    : filteredFeedback === null || !filteredFeedback.length
      ? '—'
      : Math.round((filteredFeedback.reduce((sum, feedback) => sum + (Number(feedback.rating) || 0), 0) / filteredFeedback.length) * 100) / 100;
  const userChartUnavailable = !isAllDataRange && filteredUsers === null;
  const feedbackChartUnavailable = !isAllDataRange && filteredFeedback === null;
  const userDistributionTotal = isAllDataRange ? totalUsers : filteredUsers?.length || 0;
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
            <DateRangePicker
              rangeKey={rangeKey}
              custom={custom}
              label={selectedRangeLabel}
              onPick={setRangeKey}
              onCustom={setCustom}
            />
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
        {userChartUnavailable && (
          <div className="error-card" role="alert"><p>{usersError || 'User data could not be loaded for this date range.'}</p><button onClick={fetchAnalytics} disabled={loading}>Retry</button></div>
        )}
        {feedbackChartUnavailable && (
          <div className="error-card" role="alert"><p>{feedbackError || 'Feedback data could not be loaded for this date range.'}</p><button onClick={fetchAnalytics} disabled={loading}>Retry</button></div>
        )}

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading analytics...</div>
        ) : data ? (
          <>
            <div className="kpi-grid">
              <div className="kpi-card analytics-admin-kpi analytics-users-kpi">
                <span className="analytics-kpi-icon" aria-hidden="true">♟</span>
                <h3>Total Users</h3>
                <div className="value">{rangeTotalUsers ?? '—'}</div>
                <small>— from previous period</small>
              </div>
              <div className="kpi-card analytics-admin-kpi analytics-feedback-kpi">
                <span className="analytics-kpi-icon" aria-hidden="true">▤</span>
                <h3>Total Feedback</h3>
                <div className="value">{rangeTotalFeedback ?? '—'}</div>
                <small>— from previous period</small>
              </div>
              <div className="kpi-card analytics-admin-kpi analytics-rating-kpi">
                <span className="analytics-kpi-icon" aria-hidden="true">★</span>
                <h3>Average Rating</h3>
                <div className="value">{averageRating}</div>
                <small>— from previous period</small>
              </div>
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Users by Role</h3>
                <div className="analytics-chart-container">
                {userChartUnavailable ? (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>User data unavailable</div>
                ) : roleDistribution.length > 0 ? (
                  <Pie 
                    options={pieOptions}
                    data={{
                      labels: roleDistribution.map((r) => distributionLabel(r, userDistributionTotal)),
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
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>KYC Status</h3>
                <div className="analytics-chart-container">
                {userChartUnavailable ? (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>User data unavailable</div>
                ) : kycDistribution.length > 0 ? (
                  <Pie 
                    options={pieOptions}
                    data={{
                      labels: kycDistribution.map((k) => distributionLabel(k, userDistributionTotal)),
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
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Pro vs Standard</h3>
                <div className="analytics-chart-container">
                {userChartUnavailable ? (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>User data unavailable</div>
                ) : (proUsers > 0 || nonProUsers > 0) ? (
                  <Pie 
                    options={pieOptions}
                    data={{
                      labels: [
                        distributionLabel({ _id: 'Pro', count: proUsers }, userDistributionTotal),
                        distributionLabel({ _id: 'Standard', count: nonProUsers }, userDistributionTotal)
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
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Registration Trend</h3>
                <div className="analytics-chart-container">
                {userChartUnavailable ? (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>User data unavailable</div>
                ) : rangeRegistrationTrend.length > 0 ? (
                  <Line 
                    options={chartOptions}
                    data={{
                      labels: rangeRegistrationTrend.map(t => t._id),
                      datasets: [{
                        label: 'New Users',
                        data: rangeRegistrationTrend.map(t => t.count),
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
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Rating Distribution</h3>
                <div className="analytics-chart-container">
                {feedbackChartUnavailable ? (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>Feedback data unavailable</div>
                ) : ratingDistribution.length > 0 ? (
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
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Rating Breakdown</h3>
                <div className="analytics-chart-container">
                {feedbackChartUnavailable ? (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>Feedback data unavailable</div>
                ) : ratingDistribution.length > 0 ? (
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
              </div>

              <div className="chart-card glass-card" style={{ padding: '20px', borderRadius: '8px', height: '300px', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>Feedback Trend</h3>
                <div className="analytics-chart-container">
                {feedbackChartUnavailable ? (
                  <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>Feedback data unavailable</div>
                ) : rangeFeedbackTrend.length > 0 ? (
                  <Line 
                    options={chartOptions}
                    data={{
                      labels: rangeFeedbackTrend.map(t => t._id),
                      datasets: [{
                        label: 'New Feedback',
                        data: rangeFeedbackTrend.map(t => t.count),
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

