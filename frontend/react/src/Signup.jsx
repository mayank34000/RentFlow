import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { apiRequest } from './services/api';
import "./styles/auth.css";

/* Put your video in /public/videos/ (or change these paths) */
const HERO_VIDEO = '/videos/signup-hero.mp4';
const HERO_POSTER = '/videos/signup-hero.jpg'; // optional still frame

/* ---------- Small inline icons ---------- */
const HomeLogo = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 21V14H15V21" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
);

const UserIcon = () => (
    <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 20C5.8 16.7 8.1 15 12 15C15.9 15 18.2 16.7 19 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

const MailIcon = () => (
    <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 7L12 13L21 7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
);

const LockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none">
        <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V10" stroke="currentColor" strokeWidth="1.8" />
    </svg>
);

const EyeIcon = ({ off }) => (
    <svg viewBox="0 0 24 24" fill="none">
        <path d="M2 12C4.5 7.5 8 5.5 12 5.5C16 5.5 19.5 7.5 22 12C19.5 16.5 16 18.5 12 18.5C8 18.5 4.5 16.5 2 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        {off && <path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
);

const GoogleIcon = () => (
    <svg viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
        <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
);

const FacebookIcon = () => (
    <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path fill="#fff" d="M13.4 19.5v-6.4h2.1l.4-2.6h-2.5V8.9c0-.7.3-1.3 1.4-1.3h1.2V5.4c-.2 0-1-.1-1.9-.1-2 0-3.3 1.2-3.3 3.4v1.8H8.7v2.6h2.1v6.4h2.6z" />
    </svg>
);

const PeopleIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="8" cy="8" r="3.2" />
        <circle cx="16.5" cy="8.5" r="2.8" />
        <path d="M2 19C2 15.7 4.7 13.5 8 13.5C11.3 13.5 14 15.7 14 19V20H2V19Z" />
        <path d="M15 14C18.3 13.8 21 15.6 22 19V20H16V19C16 17 15.7 15.3 15 14Z" />
    </svg>
);

const HouseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#fff" />
        <path d="M6.5 12L12 7L17.5 12V17.5H6.5V12Z" stroke="#ff762f" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10.2 17.5V14H13.8V17.5" stroke="#ff762f" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
);

const ShieldIcon = () => (
    <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 2L21 5.5V12C21 17 17.4 20.8 12 22C6.6 20.8 3 17 3 12V5.5L12 2Z" fill="#fff" />
        <path d="M8 12L11 15L16.5 9" stroke="#ff762f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const Signup = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [agreeTerms, setAgreeTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setError('');
        setSuccess('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (!agreeTerms) {
            setError('Please agree to the Terms of Service and Privacy Policy.');
            return;
        }

        setLoading(true);

        try {
            await apiRequest('/api/auth/signup', {
                method: 'POST',
                body: {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                },
            });

            setSuccess('Account created successfully! Redirecting to login...');

            setTimeout(() => {
                navigate('/login');
            }, 1200);
        } catch (err) {
            setError(
                err.message ||
                'Unable to create your account. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">

                {/* ================= HEADER ================= */}
                <header className="auth-header">
                    <button
                        type="button"
                        className="brand"
                        onClick={() => navigate('/')}
                        aria-label="Go to RentFlow home"
                    >
                        <span className="brand-icon"><HomeLogo /></span>
                        <span className="brand-text">
                            Rent<span>Flow</span>
                        </span>
                    </button>

                    <div className="header-account">
                        <span>Already have an account?</span>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="outline-small-button"
                        >
                            Login
                        </button>
                    </div>
                </header>

                {/* ================= CONTENT ================= */}
                <div className="auth-content signup-content">

                    {/* ================= SIGNUP FORM ================= */}
                    <section className="auth-form-section signup-form-section">
                        <div className="auth-form-wrapper signup-form-wrapper">

                            <h1>Create Your Account</h1>
                            <p className="auth-subtitle">
                                Join RentFlow and start your rental journey today.
                            </p>

                            <form className="auth-form" onSubmit={handleSubmit}>

                                {/* NAME + EMAIL */}
                                <div className="signup-two-columns">
                                    <div className="form-group">
                                        <label htmlFor="name">Full Name</label>
                                        <div className="input-wrapper">
                                            <span className="input-icon"><UserIcon /></span>
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder="Enter your full name"
                                                autoComplete="name"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="email">Email address</label>
                                        <div className="input-wrapper">
                                            <span className="input-icon"><MailIcon /></span>
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="you@example.com"
                                                autoComplete="email"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* PASSWORD + CONFIRM PASSWORD */}
                                <div className="signup-two-columns">
                                    <div className="form-group">
                                        <label htmlFor="password">Password</label>
                                        <div className="input-wrapper">
                                            <span className="input-icon"><LockIcon /></span>
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="Create a password"
                                                autoComplete="new-password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() => setShowPassword((prev) => !prev)}
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                <EyeIcon off={!showPassword} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="confirmPassword">Confirm Password</label>
                                        <div className="input-wrapper">
                                            <span className="input-icon"><LockIcon /></span>
                                            <input
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="Confirm your password"
                                                autoComplete="new-password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                            >
                                                <EyeIcon off={!showConfirmPassword} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* TERMS */}
                                <label className="terms-label">
                                    <input
                                        type="checkbox"
                                        checked={agreeTerms}
                                        onChange={(e) => setAgreeTerms(e.target.checked)}
                                    />
                                    <span>
                                        I agree to the{' '}
                                        <button type="button" className="terms-link">
                                            Terms of Service
                                        </button>{' '}
                                        and{' '}
                                        <button type="button" className="terms-link">
                                            Privacy Policy
                                        </button>
                                    </span>
                                </label>

                                {/* ERROR */}
                                {error && <div className="auth-error">{error}</div>}

                                {/* SUCCESS */}
                                {success && <div className="auth-success">{success}</div>}

                                {/* CREATE ACCOUNT */}
                                <button
                                    type="submit"
                                    className="primary-auth-button signup-button"
                                    disabled={loading}
                                >
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </button>

                                {/* OR */}
                                <div className="divider">
                                    <span></span>
                                    <p>OR</p>
                                    <span></span>
                                </div>

                                {/* SOCIAL BUTTONS */}
                                <div className="signup-social-row">
                                    <GoogleLogin
    onSuccess={async (credentialResponse) => {
        try {
            setError('');
            setLoading(true);

            const response = await apiRequest('/api/auth/google', {
                method: 'POST',
                body: {
                    credential: credentialResponse.credential,
                },
            });

            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            navigate('/');
        } catch (err) {
            console.error('Google signup error:', err);

            setError(
                err.message ||
                'Google signup failed. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }}
    onError={() => {
        setError('Google signup failed. Please try again.');
    }}
/>

                                    {/* <button type="button" className="social-button">
                                        <span className="social-icon"><FacebookIcon /></span>
                                        <span>Sign up with Facebook</span>
                                    </button> */}
                                </div>

                            </form>
                        </div>
                    </section>

                    {/* ================= HERO (VIDEO) ================= */}
                    <section className="auth-hero signup-hero">

                        <video
                            className="hero-video"
                            src={HERO_VIDEO}
                            poster={HERO_POSTER}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="auto"
                            aria-hidden="true"
                        />

                        <div className="hero-overlay"></div>

                        <div className="hero-content">
                            <h2>
                                Join a Community
                                <br />
                                That Finds Better Homes
                            </h2>

                            <p>
                                Whether you're looking to rent or list a property,
                                RentFlow makes it easy, secure and reliable.
                            </p>

                            <div className="hero-features hero-features--row">
                                <div className="hero-feature">
                                    <div className="feature-icon"><PeopleIcon /></div>
                                    <strong>Easy Registration</strong>
                                    <span>Get started in minutes</span>
                                </div>

                                <div className="hero-feature">
                                    <div className="feature-icon"><HouseIcon /></div>
                                    <strong>Access to Listings</strong>
                                    <span>Find your perfect match</span>
                                </div>

                                <div className="hero-feature">
                                    <div className="feature-icon"><ShieldIcon /></div>
                                    <strong>Trusted Platform</strong>
                                    <span>Safe and transparent</span>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default Signup;