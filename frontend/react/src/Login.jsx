import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from './services/api';
import { GoogleLogin } from '@react-oauth/google'
import "./styles/auth.css";

/* Put your video in /public/videos/ (or change these paths) */
const HERO_VIDEO = './assets/auth.mp4';
const HERO_POSTER = '';

/* Google's real button renders at 400 x 40. We keep it invisible and stretch it
   over our own full-width button so the credential flow stays the same. */
const GOOGLE_BTN_WIDTH = 400;
const GOOGLE_BTN_HEIGHT = 40;
const CUSTOM_BTN_HEIGHT = 46;

const OTP_LENGTH = 6;          // login OTP
const RESET_OTP_LENGTH = 4;    // forgot-password OTP
const RESEND_SECONDS = 45;
const MIN_PASSWORD_LENGTH = 8;

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
        <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg viewBox="0 0 24 24" fill="none">
        <path d="M19 12H5M11 6L5 12L11 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5L10 17.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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

    /*
     * Which screen is showing:
     * 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-reset' | 'forgot-done'
     */
    const [view, setView] = useState('login');
    const isForgot = view !== 'login';

    /* 'password' | 'otp'  (login screen tabs) */
    const [mode, setMode] = useState('password');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    /* OTP login state */
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const otpRefs = useRef([]);

    /* Forgot password state */
    const [resetOtp, setResetOtp] = useState(Array(RESET_OTP_LENGTH).fill(''));
    const [resetSeconds, setResetSeconds] = useState(0);
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const resetRefs = useRef([]);

    /* Measure the Google row so the invisible button can be stretched to fit.
       Re-runs when switching between login and forgot-password screens,
       because the Google button unmounts/remounts with them. */
    const socialRowRef = useRef(null);
    const [rowWidth, setRowWidth] = useState(GOOGLE_BTN_WIDTH);

    useEffect(() => {
        const el = socialRowRef.current;
        if (!el) return undefined;

        const updateWidth = () => setRowWidth(Math.max(1, Math.floor(el.clientWidth)));
        updateWidth();

        if (typeof ResizeObserver === 'undefined') return undefined;

        const observer = new ResizeObserver(updateWidth);
        observer.observe(el);

        return () => observer.disconnect();
    }, [isForgot, mode]);

    /* Login OTP resend countdown */
    useEffect(() => {
        if (secondsLeft <= 0) return undefined;

        const timer = setInterval(() => {
            setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [secondsLeft]);

    /* Forgot-password OTP resend countdown */
    useEffect(() => {
        if (resetSeconds <= 0) return undefined;

        const timer = setInterval(() => {
            setResetSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [resetSeconds]);

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

    /* ---------- Forgot password ---------- */
    const openForgotPassword = () => {
        setError('');
        setResetOtp(Array(RESET_OTP_LENGTH).fill(''));
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
        setView('forgot-email');
    };

    const backToLogin = () => {
        setError('');
        setResetOtp(Array(RESET_OTP_LENGTH).fill(''));
        setResetSeconds(0);
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setView('login');
        setMode('password');
    };

    const backToEmail = () => {
        setError('');
        setResetOtp(Array(RESET_OTP_LENGTH).fill(''));
        setResetSeconds(0);
        setView('forgot-email');
    };

    /* Step 1 (and "Resend"): send reset OTP */
    const handleSendResetOtp = async (event) => {
        if (event?.preventDefault) event.preventDefault();

        if (!formData.email) {
            setError('Please enter your email address.');
            return;
        }

        setError('');
        setSendingOtp(true);

        try {
            // TODO: adjust the endpoint to match your backend
            await apiRequest('/api/auth/forgot-password/send-otp', {
                method: 'POST',
                body: { email: formData.email },
            });

            setResetOtp(Array(RESET_OTP_LENGTH).fill(''));
            setResetSeconds(RESEND_SECONDS);
            setView('forgot-otp');

            setTimeout(() => resetRefs.current[0]?.focus(), 0);
        } catch (err) {
            setError(err.message || 'Could not send OTP. Please try again.');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleResetOtpChange = (index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);

        setResetOtp((prev) => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });

        if (error) setError('');

        if (digit && index < RESET_OTP_LENGTH - 1) {
            resetRefs.current[index + 1]?.focus();
        }
    };

    const handleResetOtpKeyDown = (index, event) => {
        if (event.key === 'Backspace' && !resetOtp[index] && index > 0) {
            resetRefs.current[index - 1]?.focus();
        }
        if (event.key === 'ArrowLeft' && index > 0) {
            resetRefs.current[index - 1]?.focus();
        }
        if (event.key === 'ArrowRight' && index < RESET_OTP_LENGTH - 1) {
            resetRefs.current[index + 1]?.focus();
        }
    };

    const handleResetOtpPaste = (event) => {
        const pasted = event.clipboardData
            .getData('text')
            .replace(/\D/g, '')
            .slice(0, RESET_OTP_LENGTH);

        if (!pasted) return;

        event.preventDefault();

        const next = Array(RESET_OTP_LENGTH).fill('');
        pasted.split('').forEach((char, i) => {
            next[i] = char;
        });
        setResetOtp(next);

        resetRefs.current[Math.min(pasted.length, RESET_OTP_LENGTH - 1)]?.focus();
    };

    /* Step 2: verify reset OTP */
    const handleVerifyResetOtp = async (event) => {
        event.preventDefault();

        const code = resetOtp.join('');

        if (code.length !== RESET_OTP_LENGTH) {
            setError(`Please enter the ${RESET_OTP_LENGTH}-digit code.`);
            return;
        }

        setError('');
        setLoading(true);

        try {
            // TODO: adjust the endpoint to match your backend
            const response = await apiRequest('/api/auth/forgot-password/verify-otp', {
                method: 'POST',
                body: {
                    email: formData.email,
                    otp: code,
                },
            });

            // If your backend returns a short-lived reset token, keep it
            setResetToken(response?.data?.resetToken || '');
            setView('forgot-reset');
        } catch (err) {
            setError(err.message || 'Invalid or expired OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /* Step 3: set the new password */
    const handleResetPassword = async (event) => {
        event.preventDefault();

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            // TODO: adjust the endpoint to match your backend
            await apiRequest('/api/auth/forgot-password/reset', {
                method: 'POST',
                body: {
                    email: formData.email,
                    otp: resetOtp.join(''),
                    resetToken,
                    newPassword,
                },
            });

            setNewPassword('');
            setConfirmPassword('');
            setView('forgot-done');
        } catch (err) {
            setError(err.message || 'Could not reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const socialButtons = (
        <div className="social-row">
            <div
                className={`google-custom${loading ? ' is-disabled' : ''}`}
                ref={socialRowRef}
                style={{ height: CUSTOM_BTN_HEIGHT }}
            >
                {/* What the user sees */}
                <div className="google-custom-visual" aria-hidden="true">
                    <span className="google-custom-icon"><GoogleIcon /></span>
                    <span>Sign in with Google</span>
                </div>

                {/* The real Google button: invisible, scaled to cover ours */}
                <div
                    className="google-custom-hit"
                    style={{
                        width: GOOGLE_BTN_WIDTH,
                        height: GOOGLE_BTN_HEIGHT,
                        transform: `scale(${rowWidth / GOOGLE_BTN_WIDTH}, ${CUSTOM_BTN_HEIGHT / GOOGLE_BTN_HEIGHT})`,
                    }}
                >
                    <GoogleLogin
                        text="signin_with"
                        size="large"
                        width={GOOGLE_BTN_WIDTH}
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
                </div>
            </div>
        </div>
    );

    /* ---------- Forgot password screens ---------- */
    const renderForgotPassword = () => {
        /* STEP 1 — email */
        if (view === 'forgot-email') {
            return (
                <form className="auth-form fp-screen" onSubmit={handleSendResetOtp}>
                    <h1>Forgot Password?</h1>
                    <p className="auth-subtitle">
                        No worries! Enter your email address and we'll send you a
                        {' '}{RESET_OTP_LENGTH}-digit OTP to reset your password.
                    </p>

                    <div className="field-box">
                        <span className="field-box-icon"><MailIcon /></span>
                        <div className="field-box-body">
                            <label htmlFor="fp-email">Email address</label>
                            <input
                                id="fp-email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                autoComplete="email"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button
                        type="submit"
                        className="primary-auth-button"
                        disabled={sendingOtp}
                    >
                        {sendingOtp ? 'Sending...' : 'Send OTP'}
                    </button>

                    <button
                        type="button"
                        className="fp-link-button"
                        onClick={backToLogin}
                    >
                        <span className="fp-link-icon"><ArrowLeftIcon /></span>
                        Back to Login
                    </button>
                </form>
            );
        }

        /* STEP 2 — OTP */
        if (view === 'forgot-otp') {
            return (
                <form className="auth-form fp-screen" onSubmit={handleVerifyResetOtp}>
                    <h1>Enter OTP</h1>
                    <p className="auth-subtitle fp-subtitle-tight">
                        We've sent a {RESET_OTP_LENGTH}-digit OTP to your email address
                    </p>
                    <p className="fp-email-strong">{formData.email}</p>

                    <div className="fp-otp-inputs" onPaste={handleResetOtpPaste}>
                        {resetOtp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (resetRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleResetOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleResetOtpKeyDown(index, e)}
                                aria-label={`OTP digit ${index + 1}`}
                            />
                        ))}
                    </div>

                    <p className="fp-resend">
                        Didn't receive the OTP?{' '}
                        {resetSeconds > 0 ? (
                            <span className="resend-timer">
                                Resend in {formatTimer(resetSeconds)}
                            </span>
                        ) : (
                            <button
                                type="button"
                                className="forgot-button"
                                onClick={handleSendResetOtp}
                                disabled={sendingOtp}
                            >
                                {sendingOtp ? 'Sending...' : 'Resend OTP'}
                            </button>
                        )}
                    </p>

                    {error && <div className="auth-error">{error}</div>}

                    <button
                        type="submit"
                        className="primary-auth-button"
                        disabled={loading}
                    >
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>

                    <button
                        type="button"
                        className="fp-link-button"
                        onClick={backToEmail}
                    >
                        <span className="fp-link-icon"><ArrowLeftIcon /></span>
                        Back to Email
                    </button>
                </form>
            );
        }

        /* STEP 3 — new password */
        if (view === 'forgot-reset') {
            return (
                <form className="auth-form fp-screen" onSubmit={handleResetPassword}>
                    <h1>Set a New Password</h1>
                    <p className="auth-subtitle">
                        Your OTP has been verified. Please set a new password for
                        your account.
                    </p>

                    <div className="field-box">
                        <span className="field-box-icon"><LockIcon /></span>
                        <div className="field-box-body">
                            <label htmlFor="new-password">New Password</label>
                            <input
                                id="new-password"
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder="Enter your new password"
                                autoComplete="new-password"
                                autoFocus
                                required
                            />
                        </div>
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                            <EyeIcon off={!showNewPassword} />
                        </button>
                    </div>

                    <div className="field-box">
                        <span className="field-box-icon"><LockIcon /></span>
                        <div className="field-box-body">
                            <label htmlFor="confirm-password">Confirm New Password</label>
                            <input
                                id="confirm-password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder="Confirm your new password"
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                            <EyeIcon off={!showConfirmPassword} />
                        </button>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button
                        type="submit"
                        className="primary-auth-button"
                        disabled={loading}
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            );
        }

        /* STEP 4 — success */
        return (
            <div className="fp-screen fp-success">
                <div className="fp-success-ring">
                    <div className="fp-success-icon"><CheckIcon /></div>
                </div>

                <h1>Password Reset Successful!</h1>
                <p className="auth-subtitle">
                    Your password has been updated successfully.
                    <br />
                    You can now log in to your account.
                </p>

                <button
                    type="button"
                    className="primary-auth-button"
                    onClick={backToLogin}
                >
                    Go to Login
                </button>
            </div>
        );
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

                    {isForgot ? (
                        <button
                            type="button"
                            className="header-back"
                            onClick={backToLogin}
                        >
                            <span className="header-back-icon"><ArrowLeftIcon /></span>
                            Back to Login
                        </button>
                    ) : (
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
                    )}
                </header>

                {/* ================= MAIN ================= */}
                <div className="auth-content">

                    {/* ================= FORM SECTION ================= */}
                    <section className="auth-form-section">
                        <div className="auth-form-wrapper">

                            {isForgot ? (
                                renderForgotPassword()
                            ) : (
                                <>
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

                                                <button
                                                    type="button"
                                                    className="forgot-button"
                                                    onClick={openForgotPassword}
                                                >
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
                                </>
                            )}

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

                            {/* Feature list is hidden on the forgot-password screens */}
                            {!isForgot && (
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
                            )}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default Login;