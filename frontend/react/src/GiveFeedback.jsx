import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiRequest, getAuthUser } from './services/api';
import { useTheme } from './useNavbarBehavior';
import { AdminNavbar } from './AdminDashboard';
import './styles/give-feedback.css';

function getSessionUser() {
  try {
    return getAuthUser() || JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
}

export default function GiveFeedback() {
  useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const sessionUser = getSessionUser();

  if (sessionUser?.role === 'admin') {
    return <Navigate to="/feedback" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccess('');
    setError('');

    if (!rating) {
      setError('Please select a rating from 1 to 5 stars.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/api/feedback', {
        method: 'POST',
        body: { rating, comment }
      });
      setSuccess(response.data.message || 'Feedback submitted successfully.');
      setRating(0);
      setComment('');
    } catch (requestError) {
      if (requestError.status === 401) {
        setError('Please log in to submit feedback.');
      } else if (requestError.status === 400 || requestError.status === 422) {
        setError(requestError.message || 'Please check your rating and try again.');
      } else if (requestError.status >= 500) {
        setError('The server could not submit your feedback. Please try again later.');
      } else if (requestError.status) {
        setError(requestError.message || 'Feedback could not be submitted.');
      } else {
        setError('Could not connect to RentFlow. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ad-page give-feedback-page">
      <AdminNavbar activePage="feedback" />
      <main className="ad-container give-feedback-container">
        <header className="give-feedback-header">
          <h1>Give <span>Feedback</span></h1>
          <p>Tell us about your experience with RentFlow.</p>
        </header>

        <section className="give-feedback-card">
          <form onSubmit={handleSubmit}>
            <fieldset className="give-feedback-rating" disabled={loading}>
              <legend>Your rating</legend>
              <div className="give-feedback-stars" role="group" aria-label="Choose a rating from 1 to 5 stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={star <= rating ? 'is-selected' : ''}
                    aria-label={`${star} star${star === 1 ? '' : 's'}`}
                    aria-pressed={rating === star}
                    onClick={() => setRating(star)}
                  >★</button>
                ))}
                <span>{rating ? `${rating} of 5` : 'Select a rating'}</span>
              </div>
            </fieldset>

            <label className="give-feedback-comment" htmlFor="give-feedback-comment">
              Comment <span>(optional)</span>
              <textarea
                id="give-feedback-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={1000}
                rows={6}
                placeholder="Share what went well or what we could improve…"
                disabled={loading}
              />
              <small>{comment.length}/1000 characters</small>
            </label>

            {error && <p className="give-feedback-message is-error" role="alert">{error}</p>}
            {success && <p className="give-feedback-message is-success" role="status">{success}</p>}

            <button className="give-feedback-submit" type="submit" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit Feedback'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
