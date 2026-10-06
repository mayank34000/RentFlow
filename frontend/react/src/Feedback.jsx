import React, { useState, useEffect } from 'react';
import { apiRequest } from './services/api';
import { useTheme } from './useNavbarBehavior';
import './styles/feedback.css';

export default function Feedback() {
  useTheme();
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/feedback');
      setFeedbackList(res.data.data || []);
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
      setFeedbackList(feedbackList.filter(f => f._id !== id));
    } catch (err) {
      alert('Error deleting feedback: ' + err.message);
    }
  };

  const getStars = (rating) => {
    return '~?' .repeat(rating) + '~+' .repeat(5 - rating);
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <h1>Feedback Management</h1>
          <p>Review user feedback</p>
        </header>

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
                <tr><td colSpan="5" style={{textAlign: 'center'}}>Loading feedback...</td></tr>
              ) : feedbackList.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center'}}>No feedback found.</td></tr>
              ) : (
                feedbackList.map(f => (
                  <tr key={f._id}>
                    <td>
                      <strong>{f.user?.name || 'Unknown'}</strong>
                      <br/>
                      <small style={{ color: '#9ca3af' }}>{f.user?.email}</small>
                    </td>
                    <td style={{ color: '#fbbf24' }}>{getStars(f.rating)} ({f.rating}/5)</td>
                    <td style={{ maxWidth: '300px' }}>{f.comment}</td>
                    <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="action-btn" style={{ color: '#f87171' }} onClick={() => handleDelete(f._id)}>Delete</button>
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
