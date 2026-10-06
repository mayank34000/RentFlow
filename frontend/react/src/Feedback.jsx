import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, clearAuthSession } from './services/api';
import { useTheme } from './useNavbarBehavior';
import './styles/admin-dashboard.css';
import './styles/feedback.css';

export default function Feedback() {
  useTheme();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/feedback');
      setFeedbacks(res.data.feedbacks || []);
    } catch (err) {
      setError(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await apiRequest(`/api/feedback/${id}`, { method: 'DELETE' });
      setFeedbacks(feedbacks.filter(f => f._id !== id));
    } catch (err) {
      alert('Error deleting feedback: ' + err.message);
    }
  };

  const getStars = (rating) => {
    return '~?' .repeat(rating) + '~+' .repeat(5 - rating);
  };

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
          <li><Link to="/analytics" onClick={() => setMenuOpen(false)}>Analytics</Link></li>
          <li><Link to="/feedback" className="active" onClick={() => setMenuOpen(false)}>Feedback</Link></li>
          <li><a href="#" className="logout-link" onClick={(e) => { e.preventDefault(); setMenuOpen(false); handleLogout(); }}>Logout</a></li>
        </ul>
      </nav>

      <div className="admin-container">
        <header className="admin-header">
          <h1>Feedback Management</h1>
          <p>View and manage all user feedback and ratings</p>
        </header>

        {/* KPI Cards */}
        {(() => {
          const total = feedbacks.length;
          const avg = total > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1) : 0;
          const positive = feedbacks.filter(f => f.rating >= 4).length;
          const negative = feedbacks.filter(f => f.rating <= 2).length;
          return (
            <div className="kpi-grid">
              <div className="kpi-card glass-card">
                <div className="kpi-icon">~M</div>
                <div className="kpi-value">{total}</div>
                <div className="kpi-label">Total Feedback</div>
              </div>
              <div className="kpi-card glass-card">
                <div className="kpi-icon">~S</div>
                <div className="kpi-value">{avg}</div>
                <div className="kpi-label">Average Rating</div>
              </div>
              <div className="kpi-card glass-card">
                <div className="kpi-icon" style={{color: '#10b981', background: 'rgba(16,185,129,0.1)'}}>~^</div>
                <div className="kpi-value">{positive}</div>
                <div className="kpi-label">Positive Reviews</div>
              </div>
              <div className="kpi-card glass-card">
                <div className="kpi-icon" style={{color: '#f87171', background: 'rgba(248,113,113,0.1)'}}>~v</div>
                <div className="kpi-value">{negative}</div>
                <div className="kpi-label">Negative Reviews</div>
              </div>
            </div>
          );
        })()}
        
        {/* Filter Tabs */}
        <div className="kyc-tabs" id="kycFilterTabs">
          {['all', '5', '4', '3', '2', '1'].map(filter => (
            <button 
              key={filter}
              className="kyc-tab" 
              style={{ 
                background: activeFilter === filter ? 'rgba(249, 115, 22, 0.15)' : 'rgba(0,0,0,0.05)', 
                color: activeFilter === filter ? '#ea580c' : '#475569',
                borderColor: activeFilter === filter ? '#ea580c' : 'transparent'
              }}
              onClick={() => setActiveFilter(filter)}
            >
              {filter === 'all' ? 'All' : `${filter} Stars`}
            </button>
          ))}
          <button onClick={fetchFeedback} className="refresh-btn" style={{ marginLeft: 'auto' }}>S» Refresh</button>
        </div>

        {error && (
          <div className="error-card">
            <p>{error}</p>
            <button onClick={fetchFeedback}>Retry</button>
          </div>
        )}

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{textAlign: 'center', color: '#64748b'}}>Loading feedback...</td></tr>
              ) : feedbacks.filter(f => activeFilter === 'all' || f.rating.toString() === activeFilter).length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center', color: '#64748b'}}>No feedback found.</td></tr>
              ) : (
                feedbacks.filter(f => activeFilter === 'all' || f.rating.toString() === activeFilter).map(f => (
                  <tr key={f._id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{f.user?.name || 'Unknown'}</strong>
                    </td>
                    <td style={{ color: '#f59e0b', fontSize: '18px' }}>{getStars(f.rating)} <span style={{fontSize:'14px', color:'#64748b'}}>({f.rating}/5)</span></td>
                    <td style={{ maxWidth: '300px', color: '#475569' }}>{f.comment}</td>
                    <td style={{ color: '#64748b' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="action-btn" style={{ color: '#dc2626' }} onClick={() => handleDelete(f._id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
