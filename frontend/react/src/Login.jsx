import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from './services/api';
import { GoogleLogin } from '@react-oauth/google'
import "./styles/auth.css";

/* Put your video in /public/videos/ (or change these paths) */
const HERO_VIDEO = '/videos/login-hero.mp4';
const HERO_POSTER = '/videos/login-hero.jpg'; // optional still frame

const OTP_LENGTH = 6;
const RESEND_SECONDS = 45;

/* ---------- Small inline icons ---------- */
const HomeLogo = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 21V14H15V21" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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
        <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
        <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
);

const FacebookIcon = () => (
    <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path fill="#fff" d="M13.4 19.500v-6.400h2.100l.4-2.600h-2.500V8.900c0-.7.300-1.300 1.400-1.300h1.200V5.400c-.2 0-1-.1-1.900-.1-2 0-3.300 1.200-3.300 3.400v1.800H8.700v2.600h2.100v6.400h2.600z" />
    </svg>
);

/* Solid white icons for the orange feature tiles */
const BuildingIcon = () => (
    <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z" fill="currentColor" />
        <path d="M9.5 21V14.5H14.5V21" fill="#ff762f" />
    </svg>
);

const PinIcon = () => (
    <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 22C12 22 5 15 5 9.5C5 5.6 8.1 2.5 12 2.5C15.9 2.5 19 5.6 19 9.5C19 15 12 22 12 22Z" fill="currentColor" />
        <circle cx="12" cy="9.5" r="2.7" fill="#ff762f" />
    </svg>
);

const ShieldIcon = () => (
    <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 2.5L20 5.5V12C20 16.6 16.8 20.1 12 21.5C7.2 20.1 4 16.6 4 12V5.5L12 2.5Z" fill="currentColor" />
        <path d="M8.5 12L11 14.5L15.5 9.5" stroke="#ff762f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const formatTimer = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
};

const Login = () => {
    const navigate = useNavigate();

    /* 'password' | 'otp' */
    const [mode, setMode] = useState('password');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    /* OTP state */
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const otpRefs = useRef([]);

    /* Resend countdown */
    useEffect(() => {
        if (secondsLeft <= 0) return undefined;

        const timer = setInterval(() => {
            setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [secondsLeft]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (error) {
            setError('');
        }
    };

    const switchMode = (nextMode) => {
        if (nextMode === mode) return;
        setMode(nextMode);
        setError('');
    };

    const saveSession = (response) => {
        const { token, user } = response.data;

        if (!token) {
            throw new Error(
                'Login succeeded but no authentication token was returned.'
            );
        }

        // Store JWT
        localStorage.setItem('token', token);

        // Store basic user information
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        }

        // Remember-me is UI-level until a cookie/session strategy is introduced.
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
        } else {
            localStorage.removeItem('rememberMe');
        }

        navigate('/');
    };

    /* ---------- Password login ---------- */
    const handleSubmit = async (event) => {
        event.preventDefault();

        setError('');
        setLoading(true);

        try {
            const response = await apiRequest('/api/auth/login', {
                method: 'POST',
                body: {
                    email: formData.email,
                    password: formData.password,
                },
            });

            saveSession(response);
        } catch (err) {
            setError(
                err.message ||
                'Login failed. Please check your email and password.'
            );
        } finally {
            setLoading(false);
        }
    };

    /* ---------- OTP login ---------- */
    const handleGenerateOtp = async () => {
        if (!formData.email) {
            setError('Please enter your email address.');
            return;
        }

        setError('');
        setSendingOtp(true);

        try {
            // TODO: adjust the endpoint to match your backend
            await apiRequest('/api/auth/send-otp', {
                method: 'POST',
                body: { email: formData.email },
            });

            setOtpSent(true);
            setOtp(Array(OTP_LENGTH).fill(''));
            setSecondsLeft(RESEND_SECONDS);

            setTimeout(() => otpRefs.current[0]?.focus(), 0);
        } catch (err) {
            setError(err.message || 'Could not send OTP. Please try again.');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleOtpChange = (index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);

        setOtp((prev) => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });

        if (error) setError('');

        if (digit && index < OTP_LENGTH - 1) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, event) => {
        if (event.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
        if (event.key === 'ArrowLeft' && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
        if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpPaste = (event) => {
        const pasted = event.clipboardData
            .getData('text')
            .replace(/\D/g, '')
            .slice(0, OTP_LENGTH);

        if (!pasted) return;

        event.preventDefault();

        const next = Array(OTP_LENGTH).fill('');
        pasted.split('').forEach((char, i) => {
            next[i] = char;
        });
        setOtp(next);

        otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    };

    const handleOtpLogin = async (event) => {
        event.preventDefault();

        const code = otp.join('');

        if (code.length !== OTP_LENGTH) {
            setError(`Please enter the ${OTP_LENGTH}-digit code.`);
            return;
        }

        setError('');
        setLoading(true);

        try {
            // TODO: adjust the endpoint to match your backend
            const response = await apiRequest('/api/auth/verify-otp', {
                method: 'POST',
                body: {
                    email: formData.email,
                    otp: code,
                },
            });

            saveSession(response);
        } catch (err) {
            setError(err.message || 'Invalid or expired OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const socialButtons = (
        <div className={`social-row ${mode === 'otp' ? 'social-row--two' : ''}`}>
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

            saveSession(response);
        } catch (err) {
            console.error('Google login error:', err);

            setError(
                err.message ||
                'Google login failed. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }}
    onError={() => {
        setError('Google login failed. Please try again.');
    }}
/>

            {/* <button type="button" className="social-button">
                <span className="social-icon"><FacebookIcon /></span>
                <span>Continue with Facebook</span>
            </button> */}
        </div>
    );

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
                        <span>Don't have an account?</span>
                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                            className="outline-small-button"
                        >
                            Sign Up
                        </button>
                    </div>
                </header>

                {/* ================= MAIN ================= */}
                <div className="auth-content">

                    {/* ================= LOGIN FORM ================= */}
                    <section className="auth-form-section">
                        <div className="auth-form-wrapper">

                            <h1>Welcome Back</h1>
                            <p className="auth-subtitle">
                                Login to find your next perfect rental space.
                            </p>

                            {/* MODE TABS */}
                            <div className="auth-tabs" role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === 'password'}
                                    className={`auth-tab ${mode === 'password' ? 'active' : ''}`}
                                    onClick={() => switchMode('password')}
                                >
                                    <span className="auth-tab-icon"><LockIcon /></span>
                                    Login with Password
                                </button>

                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === 'otp'}
                                    className={`auth-tab ${mode === 'otp' ? 'active' : ''}`}
                                    onClick={() => switchMode('otp')}
                                >
                                    <span className="auth-tab-icon"><MailIcon /></span>
                                    Login with OTP
                                </button>
                            </div>

                            {/* ============ PASSWORD MODE ============ */}
                            {mode === 'password' && (
                                <form className="auth-form" onSubmit={handleSubmit}>

                                    {/* EMAIL */}
                                    <div className="field-box">
                                        <span className="field-box-icon"><MailIcon /></span>
                                        <div className="field-box-body">
                                            <label htmlFor="email">Email address</label>
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

                                    {/* PASSWORD */}
                                    <div className="field-box">
                                        <span className="field-box-icon"><LockIcon /></span>
                                        <div className="field-box-body">
                                            <label htmlFor="password">Password</label>
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="Enter your password"
                                                autoComplete="current-password"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            <EyeIcon off={!showPassword} />
                                        </button>
                                    </div>

                                    {/* REMEMBER / FORGOT */}
                                    <div className="form-options">
                                        <label className="remember-label">
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                            <span>Remember me</span>
                                        </label>

                                        <button type="button" className="forgot-button">
                                            Forgot password?
                                        </button>
                                    </div>

                                    {/* ERROR */}
                                    {error && <div className="auth-error">{error}</div>}

                                    {/* LOGIN */}
                                    <button
                                        type="submit"
                                        className="primary-auth-button"
                                        disabled={loading}
                                    >
                                        {loading ? 'Logging in...' : 'Login'}
                                    </button>
                                </form>
                            )}

                            {/* ============ OTP MODE ============ */}
                            {mode === 'otp' && (
                                <form className="auth-form otp-panel" onSubmit={handleOtpLogin}>

                                    {/* STEP 1 */}
                                    <div className="otp-step">
                                        <span className="step-badge">1</span>
                                        <div className="otp-step-body">
                                            <h3>Enter your email address</h3>
                                            <p>We'll send a one-time password to your email.</p>

                                            <div className="field-box">
                                                <span className="field-box-icon"><MailIcon /></span>
                                                <div className="field-box-body">
                                                    <label htmlFor="otp-email">Email address</label>
                                                    <input
                                                        id="otp-email"
                                                        name="email"
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        placeholder="you@example.com"
                                                        autoComplete="email"
                                                    />
                                                </div>
                                            </div>

                                            {error && !otpSent && (
                                                <div className="auth-error">{error}</div>
                                            )}

                                            <button
                                                type="button"
                                                className="primary-auth-button"
                                                onClick={handleGenerateOtp}
                                                disabled={sendingOtp || (otpSent && secondsLeft > 0)}
                                            >
                                                {sendingOtp ? 'Sending...' : 'Generate OTP'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* STEP 2 — appears only after OTP is generated */}
                                    {otpSent && (
                                    <div className="otp-reveal">
                                    <div className="otp-step-divider" />

                                    <div className="otp-step">
                                        <span className="step-badge">2</span>
                                        <div className="otp-step-body">
                                            <div className="otp-step-heading">
                                                <h3>Enter the OTP</h3>

                                                {otpSent && (
                                                    secondsLeft > 0 ? (
                                                        <span className="resend-timer">
                                                            Resend OTP in {formatTimer(secondsLeft)}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="forgot-button"
                                                            onClick={handleGenerateOtp}
                                                        >
                                                            Resend OTP
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                            <p>We've sent a {OTP_LENGTH}-digit code to your email.</p>

                                            <div className="otp-inputs" onPaste={handleOtpPaste}>
                                                {otp.map((digit, index) => (
                                                    <input
                                                        key={index}
                                                        ref={(el) => (otpRefs.current[index] = el)}
                                                        type="text"
                                                        inputMode="numeric"
                                                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                                        maxLength={1}
                                                        value={digit}
                                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                        disabled={!otpSent}
                                                        aria-label={`OTP digit ${index + 1}`}
                                                    />
                                                ))}
                                            </div>

                                            {/* ERROR */}
                                            {error && <div className="auth-error">{error}</div>}

                                            <button
                                                type="submit"
                                                className="primary-auth-button"
                                                disabled={loading || !otpSent}
                                            >
                                                {loading ? 'Logging in...' : 'Login with OTP'}
                                            </button>
                                        </div>
                                    </div>
                                    </div>
                                    )}
                                </form>
                            )}

                            {/* OR */}
                            <div className="divider">
                                <span></span>
                                <p>OR</p>
                                <span></span>
                            </div>

                            {/* SOCIAL */}
                            {socialButtons}

                        </div>
                    </section>

                    {/* ================= HERO (VIDEO) ================= */}
                    <section className="auth-hero">

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
                                Find Your
                                <br />
                                Perfect <span className="hero-accent">Home</span>
                            </h2>

                            <p>
                                Explore verified listings, connect with owners,
                                and make renting simple with RentFlow.
                            </p>

                            <div className="hero-features hero-features--list">
                                <div className="hero-feature">
                                    <div className="feature-icon"><BuildingIcon /></div>
                                    <div>
                                        <strong>Verified Listings</strong>
                                        <span>Trusted and verified properties</span>
                                    </div>
                                </div>

                                <div className="hero-feature">
                                    <div className="feature-icon"><PinIcon /></div>
                                    <div>
                                        <strong>Great Locations</strong>
                                        <span>Find homes in your preferred area</span>
                                    </div>
                                </div>

                                <div className="hero-feature">
                                    <div className="feature-icon"><ShieldIcon /></div>
                                    <div>
                                        <strong>Secure &amp; Easy</strong>
                                        <span>Safe and hassle-free renting</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default Login;