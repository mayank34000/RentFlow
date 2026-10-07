import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearAuthSession, getAuthUser } from './services/api';
import { adminApiErrorMessage } from './adminApiMessages';
import { useTheme } from './useNavbarBehavior';
import './styles/admin-dashboard.css';

/* ---------- inline icons (no extra package needed) ---------- */
const makeIcon = (children) => ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const Users = makeIcon(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>);
const Home = makeIcon(<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>);
const CalendarCheck = makeIcon(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m9 16 2 2 4-4" /></>);
const Calendar = makeIcon(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>);
const IndianRupee = makeIcon(<><path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3" /><path d="M9 13c6.667 0 6.667-10 0-10" /></>);
const Search = makeIcon(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>);
const RefreshCw = makeIcon(<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>);
const Check = makeIcon(<path d="M20 6 9 17l-5-5" />);
const X = makeIcon(<path d="M18 6 6 18M6 6l12 12" />);
const Clock = makeIcon(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>);
const Pencil = makeIcon(<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />);
const Trash2 = makeIcon(<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />);
const Crown = makeIcon(<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zM5 20h14" />);
const ChevronDown = makeIcon(<path d="m6 9 6 6 6-6" />);
const Bell = makeIcon(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>);
const UserIcon = makeIcon(<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>);
const Wallet = makeIcon(<><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>);
const LogOut = makeIcon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>);

/* Order matters: it is the order of the filter pills. */
const KYC_STATES = ['pending', 'approved', 'rejected', 'none'];
const FILTERS = ['all', ...KYC_STATES];

/* Navbar config. Change the paths to match your router. */
const NAV_LINKS = [
  { label: 'Dashboard', path: '/admin-dashboard', page: 'dashboard' },
  { label: 'Analytics', path: '/analytics', page: 'analytics' },
  { label: 'Feedback', path: '/feedback', page: 'feedback' }
];

const USER_MENU = [
  { label: 'My Profile', icon: UserIcon, path: '/profile' },
  { label: 'My Wallet', icon: Wallet, wallet: true },
  { label: 'Go Premium', icon: Crown, path: '/premium', tone: 'premium' }
];

/* Date range presets use the currently loaded user records. Start with all records. */
const DEFAULT_RANGE = 'all';
const RANGE_PRESETS = [
  { key: 'month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom range' }
];

const kycOf = (u) => u.kycStatus || 'none';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const initials = (name) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
const avatarTone = (name = '') =>
  [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 6;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const readStoredUser = () => {
  try {
    return getAuthUser() || JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
};

const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const daysBack = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const parseInputDate = (s, endOfDayFlag) =>
  s ? new Date(`${s}T${endOfDayFlag ? '23:59:59.999' : '00:00:00'}`) : null;

function getRange(key, custom = {}) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case 'month': return { start: new Date(y, m, 1), end: endOfDay(new Date(y, m + 1, 0)) };
    case 'last-month': return { start: new Date(y, m - 1, 1), end: endOfDay(new Date(y, m, 0)) };
    case '7d': return { start: daysBack(6), end: endOfDay(now) };
    case '30d': return { start: daysBack(29), end: endOfDay(now) };
    case '90d': return { start: daysBack(89), end: endOfDay(now) };
    case 'year': return { start: new Date(y, 0, 1), end: endOfDay(new Date(y, 11, 31)) };
    case 'custom': return { start: parseInputDate(custom.from, false), end: parseInputDate(custom.to, true) };
    default: return { start: null, end: null };
  }
}

const inRange = (u, { start, end }) => {
  if (!start && !end) return true;
  if (!u.createdAt) return false;
  const t = new Date(u.createdAt);
  if (start && t < start) return false;
  if (end && t > end) return false;
  return true;
};

const rangeLabel = (key, { start, end }) => {
  if (key === 'all') return 'All time';
  if (!start && !end) return 'Select dates';
  return `${start ? fmtDate(start) : 'Start'} - ${end ? fmtDate(end) : 'Today'}`;
};

/* ---------- navbar ---------- */

export function AdminNavbar({ pendingCount = 0, onBellClick = () => {}, activePage = 'dashboard' }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);
  const me = useMemo(readStoredUser, []);

  const displayName = me?.name || 'Admin';
  const firstName = displayName.split(' ')[0];

  /* close the account menu on outside click / Escape */
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    clearAuthSession();
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="ad-nav">
      <div className="ad-nav-inner">
        <button type="button" className="ad-logo" onClick={() => navigate('/')} aria-label="RentFlow home">
          RENT<span>FLOW</span>
        </button>

        <nav className="ad-nav-links" aria-label="Admin">
          {NAV_LINKS.filter((link) => link.page !== 'analytics' || me?.role === 'admin').map((link) => (
            <button
              key={link.label}
              type="button"
              className={`ad-nav-link${link.page === activePage ? ' is-active' : ''}`}
              aria-current={link.page === activePage ? 'page' : undefined}
              onClick={() => navigate(
                link.page === 'feedback' && me?.role !== 'admin' ? '/give-feedback' : link.path
              )}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="ad-nav-right">
          <button
            type="button"
            className="ad-bell"
            onClick={onBellClick}
            aria-label={pendingCount ? `${pendingCount} KYC requests pending` : 'Notifications'}
            title={pendingCount ? `${pendingCount} KYC pending` : 'No pending KYC'}
          >
            <Bell size={22} />
            {pendingCount > 0 && <span className="ad-bell-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>}
          </button>

          <div className="ad-account" ref={wrapRef}>
            <button
              type="button"
              className="ad-account-btn"
              onClick={() => setMenuOpen((p) => !p)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="ad-account-avatar">
                {(me?.profileImage || me?.avatar) ? <img src={me.profileImage || me.avatar} alt="" /> : initials(displayName)}
              </span>
              <span className="ad-account-name">{firstName}</span>
              <ChevronDown size={16} />
            </button>

            {menuOpen && (
              <div className="ad-menu" role="menu">
                {USER_MENU.map(({ label, icon: Icon, path, tone, wallet }) => (
                  <button
                    key={label}
                    type="button"
                    role="menuitem"
                    className={`ad-menu-item${tone ? ` is-${tone}` : ''}`}
                    disabled={wallet && typeof window.openWalletModal !== 'function'}
                    onClick={() => {
                      if (wallet) {
                        setMenuOpen(false);
                        window.openWalletModal?.();
                      } else {
                        go(path);
                      }
                    }}
                  >
                    <Icon size={18} /> {label}
                  </button>
                ))}
                <hr />
                <button type="button" role="menuitem" className="ad-menu-item is-danger" onClick={handleLogout}>
                  <LogOut size={18} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- date range picker ---------- */

function DateRangePicker({ rangeKey, custom, label, onPick, onCustom }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (key) => {
    onPick(key);
    if (key !== 'custom') setOpen(false);
  };

  return (
    <div className="ad-range" ref={wrapRef}>
      <button
        type="button"
        className="ad-range-btn"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Calendar size={20} />
        <span>{label}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="ad-range-menu" role="listbox" aria-label="Date range">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="option"
              aria-selected={rangeKey === p.key}
              className={`ad-range-opt${rangeKey === p.key ? ' is-active' : ''}`}
              onClick={() => pick(p.key)}
            >
              {p.label}
            </button>
          ))}
          {rangeKey === 'custom' && (
            <div className="ad-range-custom">
              <label>
                From
                <input type="date" value={custom.from} max={custom.to || undefined}
                  onChange={(e) => onCustom({ ...custom, from: e.target.value })} />
              </label>
              <label>
                To
                <input type="date" value={custom.to} min={custom.from || undefined}
                  onChange={(e) => onCustom({ ...custom, to: e.target.value })} />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- page ---------- */

export default function AdminDashboard() {
  useTheme();
  const [users, setUsers] = useState([]);
  const [listingCount, setListingCount] = useState(null);
  const [bookingCount, setBookingCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [activeKycFilter, setActiveKycFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE);
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [selected, setSelected] = useState(new Set());
  const [editUser, setEditUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/admin/users');
      setUsers(res.data.users || []);
      setUsersLoaded(true);
      setSelected(new Set());
    } catch (err) {
      setError(adminApiErrorMessage(err, 'load users'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionCounts = async () => {
    const [listingsResult, bookingsResult] = await Promise.allSettled([
      apiRequest('/api/admin/listings'),
      apiRequest('/api/admin/bookings')
    ]);
    setListingCount(listingsResult.status === 'fulfilled'
      ? listingsResult.value.data.count ?? listingsResult.value.data.listings?.length ?? null
      : null);
    setBookingCount(bookingsResult.status === 'fulfilled'
      ? bookingsResult.value.data.count ?? bookingsResult.value.data.bookings?.length ?? null
      : null);
  };

  useEffect(() => {
    fetchUsers();
    fetchCollectionCounts();
  }, []);

  const handleRefresh = async () => {
    setSuccessMessage(null);
    setRefreshing(true);
    try {
      await Promise.all([fetchUsers(), fetchCollectionCounts()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateKyc = async (userId, newStatus) => {
    const confirmMap = {
      rejected: "Reject this user's KYC? This will mark them as rejected.",
      pending: 'Reset KYC status to Pending?'
    };
    if (confirmMap[newStatus] && !window.confirm(confirmMap[newStatus])) return;
    setError(null);
    setSuccessMessage(null);
    setActionInProgress(true);
    try {
      await apiRequest(`/api/admin/users/${userId}`, { method: 'PATCH', body: { kycStatus: newStatus } });
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, kycStatus: newStatus } : u)));
      setSuccessMessage(`KYC status set to ${cap(newStatus)}.`);
    } catch (err) {
      setError(adminApiErrorMessage(err, 'update KYC status'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    setError(null);
    setSuccessMessage(null);
    setActionInProgress(true);
    try {
      const response = await apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setSuccessMessage(response.data.message || 'User deleted successfully.');
    } catch (err) {
      setError(adminApiErrorMessage(err, 'delete user'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setActionInProgress(true);
    try {
      const res = await apiRequest(`/api/admin/users/${editUser._id}`, {
        method: 'PATCH',
        body: {
          name: editUser.name,
          email: editUser.email,
          role: editUser.role,
          kycStatus: editUser.kycStatus,
          isPro: editUser.isPro
        }
      });
      setUsers((prev) => prev.map((u) => (u._id === editUser._id ? res.data.user : u)));
      setEditUser(null);
      setSuccessMessage(res.data.message || 'User updated successfully.');
    } catch (err) {
      setError(adminApiErrorMessage(err, 'update user'));
    } finally {
      setActionInProgress(false);
    }
  };

  /* derived data */
  const range = useMemo(() => getRange(rangeKey, custom), [rangeKey, custom]);
  const label = rangeLabel(rangeKey, range);

  const rangeUsers = useMemo(() => users.filter((u) => inRange(u, range)), [users, range]);

  /* counts for the pills follow the selected date range */
  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, none: 0 };
    rangeUsers.forEach((u) => { c[kycOf(u)] = (c[kycOf(u)] || 0) + 1; });
    return c;
  }, [rangeUsers]);

  /* the bell always shows every pending KYC, whatever the date range */
  const pendingTotal = useMemo(() => users.filter((u) => kycOf(u) === 'pending').length, [users]);

  /* new users in this range vs the previous range of the same length */
  const usersDelta = useMemo(() => {
    let prev = null;
    if (rangeKey === 'month') {
      prev = getRange('last-month');
    } else if (range.start && range.end) {
      const len = range.end - range.start;
      prev = { start: new Date(range.start - len - 1), end: new Date(range.start - 1) };
    }
    if (!prev) return null;
    const before = users.filter((u) => inRange(u, prev)).length;
    return before ? Math.round(((rangeUsers.length - before) / before) * 100) : null;
  }, [users, rangeUsers, range, rangeKey]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rangeUsers.filter((u) => {
      if (activeKycFilter !== 'all' && kycOf(u) !== activeKycFilter) return false;
      if (!q) return true;
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });
  }, [rangeUsers, activeKycFilter, query]);

  const allSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selected.has(u._id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filteredUsers.map((u) => u._id)));
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* bell: show every user waiting for KYC review */
  const handleBellClick = () => {
    setRangeKey('all');
    setActiveKycFilter('pending');
    document.getElementById('ad-users')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const usersDeltaLabel = rangeKey === 'month' ? 'from last month' : 'vs previous period';
  const kpis = [
    { key: 'users', tone: 'orange', label: 'Total Users', icon: Users, value: usersLoaded ? rangeUsers.length : '—', delta: usersLoaded ? usersDelta : null, note: usersDeltaLabel },
    { key: 'listings', tone: 'blue', label: 'Total Listings', icon: Home, value: listingCount ?? '—' },
    { key: 'bookings', tone: 'purple', label: 'Total Bookings', icon: CalendarCheck, value: bookingCount ?? '—' },
    { key: 'revenue', tone: 'green', label: 'Total Revenue', icon: IndianRupee, value: '—' }
  ];

  return (
    <div className="ad-page">
      <AdminNavbar pendingCount={pendingTotal} onBellClick={handleBellClick} />

      <div className="ad-container">
        <div className="ad-header-row">
          <header className="ad-header">
            <h1>Admin <span>Dashboard</span></h1>
            <p>User Management &amp; KYC Workflow</p>
          </header>
          <DateRangePicker
            rangeKey={rangeKey}
            custom={custom}
            label={label}
            onPick={setRangeKey}
            onCustom={setCustom}
          />
        </div>

        {/* KPI cards */}
        <section className="ad-kpis">
          {kpis.map(({ key, tone, label: kpiLabel, icon: Icon, value, delta, note }) => (
            <article key={key} className={`ad-kpi ad-kpi--${tone}`}>
              <div className="ad-kpi-icon"><Icon size={30} /></div>
              <div className="ad-kpi-body">
                <span className="ad-kpi-label">{kpiLabel}</span>
                <strong className="ad-kpi-value">{value}</strong>
                {typeof delta === 'number' && (
                  <span className="ad-kpi-delta">
                    <b className={delta < 0 ? 'down' : 'up'}>{delta < 0 ? '↓' : '↑'} {Math.abs(delta)}%</b> {note}
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>

        {/* Toolbar */}
        <div className="ad-toolbar">
          <div className="ad-pills">
            {FILTERS.map((f) => (
              <button key={f} className={`ad-pill${activeKycFilter === f ? ' is-active' : ''}`} onClick={() => setActiveKycFilter(f)}>
                {f === 'all' ? 'All Users' : cap(f)} ({f === 'all' ? rangeUsers.length : counts[f]})
              </button>
            ))}
          </div>
          <div className="ad-tools">
            <label className="ad-search">
              <Search size={18} />
              <input type="search" placeholder="Search users by name or email..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button className="ad-refresh" onClick={handleRefresh} disabled={loading || refreshing || actionInProgress}><RefreshCw size={17} /> {refreshing ? 'Refreshing…' : 'Refresh'}</button>
          </div>
        </div>

        {successMessage && <div className="ad-success" role="status">{successMessage}</div>}
        {error && (
          <div className="ad-error">
            <p>{error}</p>
            <button onClick={fetchUsers}>Retry</button>
          </div>
        )}

        {/* Users table */}
        <section className="ad-card ad-users" id="ad-users">
          <h2 className="ad-users-title">Users ({filteredUsers.length})</h2>
          <p className="ad-users-sub">Manage users, their roles, and KYC status</p>

          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th className="ad-check"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Tier</th>
                  <th>KYC Status</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="ad-empty">Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="8" className="ad-empty">No users found.</td></tr>
                ) : (
                  filteredUsers.map((u) => {
                    const status = kycOf(u);
                    const role = u.role || 'customer';
                    return (
                      <tr key={u._id}>
                        <td className="ad-check">
                          <input type="checkbox" checked={selected.has(u._id)} onChange={() => toggleOne(u._id)} aria-label={`Select ${u.name || 'user'}`} />
                        </td>
                        <td>
                          <div className="ad-user">
                            <span className={`ad-avatar tone-${avatarTone(u.name)}`}>{(u.avatar || u.profileImage) ? <img src={u.avatar || u.profileImage} alt="" /> : initials(u.name)}</span>
                            <span className="ad-user-name">{u.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="ad-email">{u.email || 'N/A'}</td>
                        <td><span className={`ad-badge role-${role}`}>{cap(role)}</span></td>
                        <td>
                          {u.isPro
                            ? <span className="ad-badge tier-pro"><Crown size={13} /> Pro</span>
                            : <span className="ad-badge tier-standard">Standard</span>}
                        </td>
                        <td><span className={`ad-badge kyc-${status}`}>{cap(status)}</span></td>
                        <td className="ad-date">{fmtDate(u.createdAt)}</td>
                        <td>
                          <div className="ad-actions">
                            <button className="ad-act act-approve" disabled={actionInProgress || status === 'approved'} onClick={() => handleUpdateKyc(u._id, 'approved')}><Check size={14} /> Approve</button>
                            <button className="ad-act act-reject" disabled={actionInProgress || status === 'rejected'} onClick={() => handleUpdateKyc(u._id, 'rejected')}><X size={14} /> Reject</button>
                            <button className="ad-act act-pending" disabled={actionInProgress || status === 'pending'} onClick={() => handleUpdateKyc(u._id, 'pending')}><Clock size={14} /> Set Pending</button>
                            <button className="ad-act act-edit" disabled={actionInProgress} onClick={() => setEditUser(u)}><Pencil size={14} /> Edit</button>
                            <button className="ad-act act-delete" disabled={actionInProgress} onClick={() => handleDeleteUser(u._id)}><Trash2 size={14} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="ad-modal" onClick={(e) => e.target === e.currentTarget && setEditUser(null)}>
          <div className="ad-modal-card" role="dialog" aria-modal="true" aria-label="Edit user">
            <div className="ad-modal-head">
              <h2>Edit User</h2>
              <button className="ad-close" onClick={() => setEditUser(null)} aria-label="Close"><X size={18} /></button>
            </div>
            {error && <div className="ad-error" role="alert"><p>{error}</p></div>}
            <form onSubmit={handleSaveEdit}>
              <div className="ad-field">
                <label htmlFor="eu-name">Name</label>
                <input id="eu-name" type="text" value={editUser.name || ''} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} required />
              </div>
              <div className="ad-field">
                <label htmlFor="eu-email">Email</label>
                <input id="eu-email" type="email" value={editUser.email || ''} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} required />
              </div>
              <div className="ad-field">
                <label htmlFor="eu-role">Role</label>
                <select id="eu-role" value={editUser.role || 'customer'} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                  {/* <option value="customer">Customer</option> */}
                  <option value="seller">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="ad-field">
                <label htmlFor="eu-kyc">KYC Status</label>
                <select id="eu-kyc" value={editUser.kycStatus || 'none'} onChange={(e) => setEditUser({ ...editUser, kycStatus: e.target.value })}>
                  {KYC_STATES.map((k) => <option key={k} value={k}>{cap(k)}</option>)}
                </select>
              </div>
              <label className="ad-check-row">
                <input type="checkbox" checked={!!editUser.isPro} onChange={(e) => setEditUser({ ...editUser, isPro: e.target.checked })} />
                Pro user
              </label>
              <button type="submit" className="ad-submit" disabled={actionInProgress}>{actionInProgress ? 'Saving…' : 'Save changes'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
