import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from './services/api';
import "./styles/profile.css";

/* ---------- Icons ---------- */
const Icon = ({ children }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {children}
    </svg>
);

const icons = {
    logo: <Icon><path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z" /><path d="M9 21V14H15V21" /></Icon>,
    dashboard: <Icon><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Icon>,
    listings: <Icon><path d="M4 6H20M4 12H20M4 18H14" /></Icon>,
    bookings: <Icon><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10H21M8 3V7M16 3V7" /></Icon>,
    messages: <Icon><path d="M21 12C21 16.4 16.97 20 12 20C10.8 20 9.6 19.8 8.6 19.4L3 21L4.6 16.6C3.6 15.3 3 13.7 3 12C3 7.6 7.03 4 12 4C16.97 4 21 7.6 21 12Z" /></Icon>,
    reviews: <Icon><path d="M12 3L14.8 8.7L21 9.6L16.5 14L17.6 20.2L12 17.2L6.4 20.2L7.5 14L3 9.6L9.2 8.7L12 3Z" /></Icon>,
    profile: <Icon><circle cx="12" cy="8" r="3.5" /><path d="M5 20C5.8 16.7 8.1 15 12 15C15.9 15 18.2 16.7 19 20" /></Icon>,
    logout: <Icon><path d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" /><path d="M16 17L21 12L16 7M21 12H9" /></Icon>,
    bell: <Icon><path d="M18 8C18 4.7 15.3 3 12 3C8.7 3 6 4.7 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" /><path d="M13.7 21C13.5 21.3 13.3 21.5 13 21.7C12.4 22.1 11.6 22.1 11 21.7C10.7 21.5 10.5 21.3 10.3 21" /></Icon>,
};

/* Sidebar items. Change the paths to match your router. */
const NAV_ITEMS = [
    { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { label: 'Listings', icon: 'listings', path: '/listings' },
    { label: 'Bookings', icon: 'bookings', path: '/bookings' },
    { label: 'Messages', icon: 'messages', path: '/messages' },
    { label: 'Reviews', icon: 'reviews', path: '/reviews' },
    { label: 'Profile', icon: 'profile', path: '/profile' },
];

const COUNTRIES = [
    'India',
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'United Arab Emirates',
];

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Chandigarh', 'Jammu and Kashmir', 'Ladakh',
];

const ACCOUNT_TYPES = ['user', 'owner', 'admin'];

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });
};

const toDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

/* Map the API user object to editable form values.
   Adjust the field names if your backend uses different ones. */
const toFormValues = (user) => ({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: toDateInput(user?.dateOfBirth),
    country: user?.country || 'India',
    state: user?.state || '',
    city: user?.city || '',
    address: user?.address || '',
});

const Profile = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [form, setForm] = useState(toFormValues(null));
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const loadProfile = async () => {
            const token = localStorage.getItem('token');

            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await apiRequest('/api/auth/me');
                const loaded = response.data.user;

                setUser(loaded);
                setForm(toFormValues(loaded));
            } catch (err) {
                console.error('Profile error:', err);

                if (err.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                    return;
                }

                setError(err.message || 'Unable to load profile.');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        navigate('/login');
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((prev) => {
            const next = { ...prev, [name]: value };

            // Reset state when the country changes
            if (name === 'country') {
                next.state = '';
            }

            return next;
        });

        if (message) setMessage('');
    };

    const handleEdit = () => {
        setMessage('');
        setEditing(true);
    };

    const handleCancel = () => {
        setForm(toFormValues(user));
        setEditing(false);
        setMessage('');
    };

    const handleSave = async (event) => {
        event.preventDefault();

        setSaving(true);
        setMessage('');

        try {
            // TODO: adjust the endpoint/method to match your backend
            const response = await apiRequest('/api/auth/me', {
                method: 'PUT',
                body: {
                    name: form.name,
                    phone: form.phone,
                    dateOfBirth: form.dateOfBirth || null,
                    country: form.country,
                    state: form.state,
                    city: form.city,
                    address: form.address,
                },
            });

            const updated = response.data.user || { ...user, ...form };

            setUser(updated);
            setForm(toFormValues(updated));
            localStorage.setItem('user', JSON.stringify(updated));

            setEditing(false);
            setMessage('Profile updated successfully.');
        } catch (err) {
            setMessage(err.message || 'Could not update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="rf-center">
                <p>Loading profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rf-center">
                <p className="rf-error">{error}</p>
            </div>
        );
    }

    const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';
    const role = user?.role || 'user';
    const isIndia = form.country === 'India';
    const messageIsError = message && !message.toLowerCase().includes('success');

    return (
        <div className="rf-shell">

            {/* ================= SIDEBAR ================= */}
            <aside className="rf-sidebar">
                <button
                    type="button"
                    className="rf-brand"
                    onClick={() => navigate('/')}
                    aria-label="Go to RentFlow home"
                >
                    {icons.logo}
                    <span className="rf-brand-text">Rent<span>Flow</span></span>
                </button>

                <nav className="rf-nav">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            className={`rf-nav-item${item.label === 'Profile' ? ' active' : ''}`}
                            onClick={() => navigate(item.path)}
                            aria-current={item.label === 'Profile' ? 'page' : undefined}
                        >
                            {icons[item.icon]}
                            {item.label}
                        </button>
                    ))}
                </nav>

                <button
                    type="button"
                    className="rf-nav-item rf-nav-logout"
                    onClick={handleLogout}
                >
                    {icons.logout}
                    Logout
                </button>
            </aside>

            {/* ================= MAIN ================= */}
            <main className="rf-main">

                {/* TOP BAR */}
                <div className="rf-topbar">
                    <button type="button" className="rf-bell" aria-label="Notifications">
                        {icons.bell}
                    </button>

                    <div className="rf-user-chip">
                        <div className="rf-avatar-sm">{initial}</div>
                        <div className="rf-user-chip-text">
                            <strong>{user?.name || 'User'}</strong>
                            <span>{role}</span>
                        </div>
                    </div>
                </div>

                {/* HEADING */}
                <div className="rf-heading">
                    <h1>My Profile</h1>
                    <p>View and manage your account information.</p>
                </div>

                {/* CONTENT */}
                <div className="rf-grid">

                    {/* SUMMARY */}
                    <section className="rf-card rf-summary">
                        <div className="rf-avatar-lg">{initial}</div>
                        <h2>{user?.name || 'User'}</h2>
                        <p className="rf-summary-email">{user?.email || '-'}</p>
                        <span className="rf-badge">{role}</span>

                        <button
                            type="button"
                            className="rf-logout-btn"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </section>

                    {/* FORM */}
                    <form className="rf-card rf-form-card" onSubmit={handleSave}>

                        {/* PERSONAL */}
                        <div className="rf-section-head">
                            <h2>Personal Information</h2>

                            {!editing && (
                                <button type="button" className="rf-edit-btn" onClick={handleEdit}>
                                    Edit
                                </button>
                            )}
                        </div>

                        <div className="rf-form-grid">
                            <div className="rf-field">
                                <label htmlFor="name">Full Name</label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={form.name}
                                    onChange={handleChange}
                                    disabled={!editing}
                                    required
                                />
                            </div>

                            <div className="rf-field">
                                <label htmlFor="email">Email Address</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    disabled
                                    readOnly
                                />
                            </div>

                            <div className="rf-field">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="Not provided"
                                    disabled={!editing}
                                />
                            </div>

                            <div className="rf-field">
                                <label htmlFor="dateOfBirth">Date of Birth</label>
                                <input
                                    id="dateOfBirth"
                                    name="dateOfBirth"
                                    type="date"
                                    value={form.dateOfBirth}
                                    onChange={handleChange}
                                    disabled={!editing}
                                />
                            </div>
                        </div>

                        {/* LOCATION */}
                        <h3 className="rf-subhead">Location Information</h3>

                        <div className="rf-form-grid rf-form-grid--3">
                            <div className="rf-field">
                                <label htmlFor="country">Country</label>
                                <select
                                    id="country"
                                    name="country"
                                    value={form.country}
                                    onChange={handleChange}
                                    disabled={!editing}
                                >
                                    {!COUNTRIES.includes(form.country) && form.country && (
                                        <option value={form.country}>{form.country}</option>
                                    )}
                                    {COUNTRIES.map((country) => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="rf-field">
                                <label htmlFor="state">State</label>
                                {isIndia ? (
                                    <select
                                        id="state"
                                        name="state"
                                        value={form.state}
                                        onChange={handleChange}
                                        disabled={!editing}
                                    >
                                        <option value="">Select state</option>
                                        {INDIAN_STATES.map((state) => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        id="state"
                                        name="state"
                                        type="text"
                                        value={form.state}
                                        onChange={handleChange}
                                        placeholder="State / Province"
                                        disabled={!editing}
                                    />
                                )}
                            </div>

                            <div className="rf-field">
                                <label htmlFor="city">City</label>
                                <input
                                    id="city"
                                    name="city"
                                    type="text"
                                    value={form.city}
                                    onChange={handleChange}
                                    disabled={!editing}
                                />
                            </div>
                        </div>

                        <div className="rf-field rf-field--full">
                            <label htmlFor="address">Address</label>
                            <textarea
                                id="address"
                                name="address"
                                rows="2"
                                value={form.address}
                                onChange={handleChange}
                                disabled={!editing}
                            />
                        </div>

                        {/* ACCOUNT */}
                        <h3 className="rf-subhead">Account Information</h3>

                        <div className="rf-form-grid">
                            <div className="rf-field">
                                <label htmlFor="role">Account Type</label>
                                <select id="role" value={role} disabled>
                                    {!ACCOUNT_TYPES.includes(role) && (
                                        <option value={role}>{role}</option>
                                    )}
                                    {ACCOUNT_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="rf-field">
                                <label htmlFor="memberSince">Member Since</label>
                                <input
                                    id="memberSince"
                                    type="text"
                                    value={formatDate(user?.createdAt) || '-'}
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* FEEDBACK + ACTIONS */}
                        {message && (
                            <div className={messageIsError ? 'rf-msg rf-msg--error' : 'rf-msg rf-msg--ok'}>
                                {message}
                            </div>
                        )}

                        {editing && (
                            <div className="rf-form-actions">
                                <button
                                    type="button"
                                    className="rf-btn-secondary"
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="rf-btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
};

export default Profile;