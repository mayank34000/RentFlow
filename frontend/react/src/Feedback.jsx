import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiRequest, getAuthUser } from './services/api';
import { adminApiErrorMessage } from './adminApiMessages';
import { useTheme } from './useNavbarBehavior';
import { AdminNavbar, DateRangePicker, DEFAULT_RANGE, getRange, rangeLabel, inRange } from './AdminDashboard';
import './styles/admin-feedback.css';

const FILTERS = ['all', '5', '4', '3', '2', '1'];
const userName = (feedback) => feedback.user?.name || 'Unknown user';
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
const dateLabel = (date) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const storedSessionUser = () => {
  try {
    return getAuthUser() || JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
};

export default function Feedback() {
  useTheme();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE);
  const [custom, setCustom] = useState({ from: '', to: '' });
  const sessionUser = storedSessionUser();

  const fetchFeedback = async () => {
    const sessionUser = storedSessionUser();
    if (sessionUser?.role !== 'admin') {
      setError('Access denied. This page requires an admin account.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await apiRequest('/api/feedback');
      setFeedbacks(Array.isArray(res.data.feedbacks) ? res.data.feedbacks : []);
    } catch (err) {
      setError(adminApiErrorMessage(err, 'load feedback'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionUser?.role === 'admin') fetchFeedback();
  }, []);

  const range = useMemo(() => getRange(rangeKey, custom), [rangeKey, custom]);
  const selectedRangeLabel = rangeLabel(rangeKey, range);
  const rangeFeedbacks = useMemo(() => feedbacks.filter((feedback) => inRange(feedback, range)), [feedbacks, range]);

  const filteredFeedback = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rangeFeedbacks.filter((feedback) => {
      if (activeFilter !== 'all' && String(feedback.rating) !== activeFilter) return false;
      if (!search) return true;
      return [userName(feedback), feedback.user?.email, feedback.comment]
        .some((value) => String(value || '').toLowerCase().includes(search));
    });
  }, [rangeFeedbacks, activeFilter, query]);

  const average = rangeFeedbacks.length
    ? (rangeFeedbacks.reduce((sum, feedback) => sum + (Number(feedback.rating) || 0), 0) / rangeFeedbacks.length).toFixed(1)
    : '—';
  const positive = rangeFeedbacks.filter((feedback) => Number(feedback.rating) >= 4).length;
  const negative = rangeFeedbacks.filter((feedback) => Number(feedback.rating) <= 2).length;

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    setError(null);
    setSuccessMessage(null);
    setDeletingId(id);
    try {
      const response = await apiRequest(`/api/feedback/${id}`, { method: 'DELETE' });
      setFeedbacks((current) => current.filter((feedback) => feedback._id !== id));
      if (selectedFeedback?._id === id) setSelectedFeedback(null);
      setSuccessMessage(response.data.message || 'Feedback deleted successfully.');
    } catch (err) {
      setError(adminApiErrorMessage(err, 'delete feedback'));
    } finally {
      setDeletingId(null);
    }
  };

  if (sessionUser?.role !== 'admin') {
    return <Navigate to="/give-feedback" replace />;
  }

  return (
    <div className="ad-page feedback-admin-page">
      <AdminNavbar activePage="feedback" />
      <main className="ad-container feedback-admin-container">
        <header className="feedback-admin-header">
          <div>
            <h1>User <span>Feedback</span></h1>
            <p>View and manage all user feedback and ratings</p>
          </div>
          <div className="feedback-header-actions">
            <DateRangePicker
              rangeKey={rangeKey}
              custom={custom}
              label={selectedRangeLabel}
              onPick={setRangeKey}
              onCustom={setCustom}
            />
            <button className="ad-refresh" type="button" onClick={fetchFeedback} disabled={loading}>↻ <span>Refresh</span></button>
          </div>
        </header>

        <section className="feedback-kpis" aria-label="Feedback summary">
          <article className="feedback-kpi feedback-kpi-orange"><span className="feedback-kpi-icon">▤</span><div><span>Total Feedback</span><strong>{rangeFeedbacks.length}</strong></div></article>
          <article className="feedback-kpi feedback-kpi-amber"><span className="feedback-kpi-icon">★</span><div><span>Average Rating</span><strong>{average}</strong></div></article>
          <article className="feedback-kpi feedback-kpi-green"><span className="feedback-kpi-icon">↑</span><div><span>Positive Reviews</span><strong>{positive}</strong></div></article>
          <article className="feedback-kpi feedback-kpi-red"><span className="feedback-kpi-icon">↓</span><div><span>Negative Reviews</span><strong>{negative}</strong></div></article>
        </section>

        <div className="feedback-toolbar">
          <div className="feedback-filters" role="group" aria-label="Filter by rating">
            {FILTERS.map((filter) => {
              const count = filter === 'all' ? rangeFeedbacks.length : rangeFeedbacks.filter((feedback) => String(feedback.rating) === filter).length;
              const label = filter === 'all' ? 'All' : `${filter} Star${filter === '1' ? '' : 's'}`;
              return <button key={filter} type="button" className={`feedback-filter${activeFilter === filter ? ' is-active' : ''}`} onClick={() => setActiveFilter(filter)}>{label} ({count})</button>;
            })}
          </div>
          <label className="feedback-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search feedback by name, email or comment..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        </div>

        {successMessage && <div className="feedback-success" role="status">{successMessage}</div>}
        {error && <div className="feedback-error" role="alert"><span>{error}</span><button type="button" onClick={fetchFeedback} disabled={loading}>Retry</button></div>}

        <section className="feedback-table-card">
          <div className="feedback-table-heading"><h2>{activeFilter === 'all' ? 'All Feedback' : `${activeFilter} Star Feedback`} ({filteredFeedback.length})</h2><p>User feedback, ratings, and comments</p></div>
          <div className="feedback-table-scroll">
            <table className="feedback-table">
              <thead><tr><th className="feedback-check-col"><input type="checkbox" disabled aria-label="Select all feedback (not available)" /></th><th>User</th><th>Rating</th><th>Comment</th><th>Listing / Type</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="8" className="feedback-empty">Loading feedback…</td></tr>
                  : filteredFeedback.length === 0 ? <tr><td colSpan="8" className="feedback-empty">No feedback found.</td></tr>
                    : filteredFeedback.map((feedback) => {
                      const name = userName(feedback);
                      const rating = Math.max(0, Math.min(5, Number(feedback.rating) || 0));
                      return <tr key={feedback._id}>
                        <td className="feedback-check-col"><input type="checkbox" disabled aria-label="Feedback selection is not available" /></td>
                        <td><div className="feedback-user"><span className="feedback-avatar">{feedback.user?.avatar ? <img src={feedback.user.avatar} alt="" /> : initials(name)}</span><span><strong>{name}</strong><small>{feedback.user?.email || 'Email unavailable'}</small></span></div></td>
                        <td><span className="feedback-rating-stars" aria-label={`${rating} out of 5`}>{'★'.repeat(rating)}<span>{'★'.repeat(5 - rating)}</span></span><small className="feedback-rating-number">{rating.toFixed(1)}</small></td>
                        <td className="feedback-comment" title={feedback.comment || ''}>{feedback.comment || 'No comment provided'}</td>
                        <td><span className="feedback-unavailable">Not provided</span></td>
                        <td className="feedback-date">{dateLabel(feedback.createdAt)}</td>
                        <td><span className="feedback-unavailable">Not tracked</span></td>
                        <td><div className="feedback-actions"><button type="button" className="feedback-view" onClick={() => setSelectedFeedback(feedback)}>◉ <span>View</span></button><button type="button" className="feedback-delete" disabled={deletingId === feedback._id} onClick={() => handleDelete(feedback._id)}>▤ <span>{deletingId === feedback._id ? 'Deleting…' : 'Delete'}</span></button></div></td>
                      </tr>;
                    })}
              </tbody>
            </table>
          </div>
          <footer className="feedback-table-footer">Showing {filteredFeedback.length} of {rangeFeedbacks.length} feedback</footer>
        </section>
      </main>

      {selectedFeedback && <div className="feedback-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedFeedback(null); }}><section className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title"><button type="button" className="feedback-modal-close" aria-label="Close" onClick={() => setSelectedFeedback(null)}>×</button><h2 id="feedback-modal-title">Feedback details</h2><div className="feedback-modal-identity">{selectedFeedback.user?.avatar && <img src={selectedFeedback.user.avatar} alt="" />}<div><strong>{userName(selectedFeedback)}</strong><small>{selectedFeedback.user?.email || 'Email unavailable'}</small><small>{dateLabel(selectedFeedback.createdAt)}</small></div></div><p className="feedback-modal-stars">{'★'.repeat(Math.max(0, Math.min(5, Number(selectedFeedback.rating) || 0)))} <span>{selectedFeedback.rating}/5</span></p><p className="feedback-modal-comment">{selectedFeedback.comment || 'No comment provided.'}</p></section></div>}
    </div>
  );
}
