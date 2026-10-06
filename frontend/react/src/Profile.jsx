import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    profile: <Icon><circle cx="12" cy="8" r="3.5" /><path d="M5 20C5.8 16.7 8.1 15 12 15C15.9 15 18.2 16.7 19 20" /></Icon>,
    logout: <Icon><path d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" /><path d="M16 17L21 12L16 7M21 12H9" /></Icon>,
    bell: <Icon><path d="M18 8C18 4.7 15.3 3 12 3C8.7 3 6 4.7 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" /><path d="M13.7 21C13.5 21.3 13.3 21.5 13 21.7C12.4 22.1 11.6 22.1 11 21.7C10.7 21.5 10.5 21.3 10.3 21" /></Icon>,
    settings: <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon>,
    lock: <Icon><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V10" /></Icon>,
    eye: <Icon><path d="M2 12C4.5 7.5 8 5.5 12 5.5C16 5.5 19.5 7.5 22 12C19.5 16.5 16 18.5 12 18.5C8 18.5 4.5 16.5 2 12Z" /><circle cx="12" cy="12" r="3" /></Icon>,
    eyeOff: <Icon><path d="M2 12C4.5 7.5 8 5.5 12 5.5C16 5.5 19.5 7.5 22 12C19.5 16.5 16 18.5 12 18.5C8 18.5 4.5 16.5 2 12Z" /><circle cx="12" cy="12" r="3" /><path d="M4 4L20 20" /></Icon>,
    chevron: <Icon><path d="M9 6L15 12L9 18" /></Icon>,
    palette: <Icon><path d="M12 3C7 3 3 7 3 12C3 17 7 21 12 21C13.4 21 14 20.1 14 19.2C14 18.6 13.7 18.1 13.4 17.7C13 17.2 12.8 16.7 12.8 16.1C12.8 15.1 13.6 14.3 14.6 14.3H17C19 14.3 21 13 21 11C21 6.6 17 3 12 3Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7.5" r="1" /><circle cx="14.5" cy="7.5" r="1" /></Icon>,
    trash: <Icon><path d="M4 7H20M10 11V17M14 11V17M6 7L7 19C7 20.1 7.9 21 9 21H15C16.1 21 17 20.1 17 19L18 7M9 7V4H15V7" /></Icon>,
    sun: <Icon><circle cx="12" cy="12" r="4" /><path d="M12 2V4M12 20V22M2 12H4M20 12H22M4.9 4.9L6.3 6.3M17.7 17.7L19.1 19.1M4.9 19.1L6.3 17.7M17.7 6.3L19.1 4.9" /></Icon>,
    moon: <Icon><path d="M21 12.8A9 9 0 1 1 11.2 3A7 7 0 0 0 21 12.8Z" /></Icon>,
    monitor: <Icon><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20H16M12 16V20" /></Icon>,
    search: <Icon><circle cx="11" cy="11" r="7" /><path d="M20 20L16.5 16.5" /></Icon>,
    paperclip: <Icon><path d="M21 11.5L12.5 20C10.6 21.9 7.5 21.9 5.6 20C3.7 18.1 3.7 15 5.6 13.1L14 4.7C15.3 3.4 17.4 3.4 18.7 4.7C20 6 20 8.1 18.7 9.4L10.3 17.8C9.6 18.5 8.4 18.5 7.7 17.8C7 17.1 7 15.9 7.7 15.2L15.5 7.4" /></Icon>,
    smile: <Icon><circle cx="12" cy="12" r="9" /><path d="M8 14C8.8 15.3 10.2 16 12 16C13.8 16 15.2 15.3 16 14" /><path d="M9 9.5H9.01M15 9.5H15.01" /></Icon>,
    send: <Icon><path d="M21 3L10 14" /><path d="M21 3L14.5 21L10 14L3 9.5L21 3Z" /></Icon>,
    more: <Icon><circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" /></Icon>,
    phone: <Icon><path d="M5 4H9L11 9L8.5 10.5C9.6 12.8 11.2 14.4 13.5 15.5L15 13L20 15V19C20 19.6 19.6 20 19 20C10.7 20 4 13.3 4 5C4 4.4 4.4 4 5 4Z" /></Icon>,
    mail: <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7L12 13L21 7" /></Icon>,
    flag: <Icon><path d="M5 21V4M5 4H17L15 8.5L17 13H5" /></Icon>,
    pin: <Icon><path d="M12 21C12 21 5 14.5 5 9.5C5 5.9 8.1 3 12 3C15.9 3 19 5.9 19 9.5C19 14.5 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></Icon>,
    arrowLeft: <Icon><path d="M19 12H5M11 6L5 12L11 18" /></Icon>,
    archive: <Icon><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8V19C5 19.6 5.4 20 6 20H18C18.6 20 19 19.6 19 19V8M10 12H14" /></Icon>,
    check: <Icon><path d="M5 12.5L10 17.5L19 7.5" /></Icon>,
    checks: <Icon><path d="M2 12.5L6.5 17L14 8.5M10 14.5L11.5 16L20 7" /></Icon>,
    headset: <Icon><path d="M4 14V12C4 7.6 7.6 4 12 4C16.4 4 20 7.6 20 12V14" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /><path d="M19 20C19 21 17.5 21.5 15 21.5H13" /></Icon>,
    award: <Icon><circle cx="12" cy="9" r="5" /><path d="M8.5 13.5L7 21L12 18.5L17 21L15.5 13.5" /></Icon>,
    camera: <Icon><path d="M4 8H7L8.5 5.5H15.5L17 8H20C20.55 8 21 8.45 21 9V18C21 18.55 20.55 19 20 19H4C3.45 19 3 18.55 3 18V9C3 8.45 3.45 8 4 8Z" /><circle cx="12" cy="13" r="3.5" /></Icon>,
    calendarPlus: <Icon><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10H21M8 3V7M16 3V7M12 13V18M9.5 15.5H14.5" /></Icon>,
    calendarCheck: <Icon><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10H21M8 3V7M16 3V7M9 15L11 17L15 13" /></Icon>,
    star: <Icon><path d="M12 3L14.8 8.7L21 9.6L16.5 14L17.6 20.2L12 17.3L6.4 20.2L7.5 14L3 9.6L9.2 8.7L12 3Z" /></Icon>,
    chat: <Icon><path d="M21 12C21 16.4 16.97 20 12 20C10.8 20 9.6 19.8 8.6 19.4L3 21L4.6 16.6C3.6 15.3 3 13.7 3 12C3 7.6 7.03 4 12 4C16.97 4 21 7.6 21 12Z" /><path d="M8.5 12H8.51M12 12H12.01M15.5 12H15.51" /></Icon>,
};

/* Sidebar items. Change the paths to match your router. */
const NAV_ITEMS = [
    { label: 'Dashboard', icon: 'dashboard', path: '/' },
    { label: 'Listings', icon: 'listings', path: '/booking-history' },
    { label: 'Bookings', icon: 'bookings', path: '/booking' },
    { label: 'Messages', icon: 'messages', path: '/messages' },
    { label: 'Profile', icon: 'profile', path: '/profile' },
    { label: 'Settings', icon: 'settings', path: '/settings' },
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

/* ---------- Settings page config ---------- */
const MIN_PASSWORD_LENGTH = 8;
const THEME_KEY = 'theme';

const SETTINGS_SECTIONS = [
    { id: 'change-password', label: 'Change Password', icon: 'lock' },
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'delete-account', label: 'Delete Account', icon: 'trash' },
];

const PASSWORD_FIELDS = [
    { key: 'current', label: 'Current Password', placeholder: 'Enter your current password', autoComplete: 'current-password' },
    { key: 'next', label: 'New Password', placeholder: 'Enter your new password', autoComplete: 'new-password' },
    { key: 'confirm', label: 'Confirm New Password', placeholder: 'Confirm your new password', autoComplete: 'new-password' },
];

const THEME_OPTIONS = [
    { value: 'light', label: 'Light Mode', description: 'Clean and bright interface', icon: 'sun' },
    { value: 'dark', label: 'Dark Mode', description: 'Easy on the eyes', icon: 'moon' },
    { value: 'system', label: 'System Default', description: 'Follow your system settings', icon: 'monitor' },
];

const getStoredTheme = () => {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        return ['light', 'dark', 'system'].includes(saved) ? saved : 'light';
    } catch {
        return 'light';
    }
};

const applyTheme = (preference) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = preference === 'dark' || (preference === 'system' && prefersDark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
};

/* ---------- Messages helpers ---------- */
const POLL_CONVERSATIONS_MS = 15000;
const POLL_MESSAGES_MS = 8000;
const EMOJIS = ['😀', '😊', '😂', '😍', '👍', '🙏', '🎉', '❤️', '😅', '🤝', '🏠', '📅'];
const VISIT_TEMPLATE = "Hi! I'd like to schedule a visit to see this property. Is there a time that works for you?";

const getConvId = (conv) => conv?.id || conv?._id;
const convTitle = (conv) => conv?.title || conv?.listing?.title || conv?.otherUser?.name || 'Conversation';
const convImage = (conv) => conv?.image || conv?.listing?.image || '';
const isSupportConv = (conv) => conv?.type === 'support' || conv?.kind === 'support';

const formatClock = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const dayKey = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toDateString();
};

const formatDayLabel = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/* Time for today, "Yesterday", otherwise "Oct 26" */
const formatListTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const label = formatDayLabel(value);
    if (label === 'Today') return formatClock(value);
    if (label === 'Yesterday') return label;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatMonthYear = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const formatRent = (price) => {
    const amount = Number(price);
    return Number.isFinite(amount) && price !== '' && price != null
        ? `₹ ${amount.toLocaleString('en-IN')} / month`
        : '';
};

const roleLabel = (role) => {
    if (role === 'owner') return 'Property Owner';
    if (role === 'admin') return 'Support';
    return 'Tenant';
};

/* ---------- Notifications helpers ---------- */
const POLL_NOTIFICATIONS_MS = 30000;

/* Shown only if the API is not available yet. Remove once your backend is ready. */
const SAMPLE_NOTIFICATIONS = [
    { id: 'n1', type: 'booking', title: 'New Booking Request', text: 'You have a new booking request for Modern 2BHK Apartment.', createdAt: new Date(Date.now() - 5 * 60000).toISOString(), read: false, link: '/booking' },
    { id: 'n2', type: 'message', title: 'New Message', text: 'Rahul Sharma sent you a message regarding Cozy Studio Apartment.', createdAt: new Date(Date.now() - 12 * 60000).toISOString(), read: false, link: '/messages' },
    { id: 'n3', type: 'review', title: 'New Review', text: 'You received a 5 star review for Luxury Villa with Pool.', createdAt: new Date(Date.now() - 60 * 60000).toISOString(), read: false, link: '/booking-history' },
    { id: 'n4', type: 'confirmed', title: 'Booking Confirmed', text: 'Your booking for Spacious 3BHK Flat has been confirmed.', createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), read: true, link: '/booking' },
    { id: 'n5', type: 'expiring', title: 'Listing Expiring Soon', text: 'Your listing Budget Friendly PG will expire in 3 days.', createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), read: true, link: '/booking-history' },
];

const NOTIFICATION_STYLES = {
    booking: { icon: 'calendarPlus', tone: 'red' },
    message: { icon: 'chat', tone: 'blue' },
    review: { icon: 'star', tone: 'amber' },
    confirmed: { icon: 'calendarCheck', tone: 'green' },
    expiring: { icon: 'bell', tone: 'red' },
};

const getNotifId = (n) => n?.id || n?._id;

const timeAgo = (value) => {
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return '';
    const mins = Math.max(0, Math.floor((Date.now() - time) / 60000));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
};

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
    const location = useLocation();

    /* The same component serves /profile, /settings and /messages */
    const isSettings = location.pathname.startsWith('/settings');
    const isMessages = location.pathname.startsWith('/messages');
    const activeLabel = isMessages ? 'Messages' : isSettings ? 'Settings' : 'Profile';

    const [user, setUser] = useState(null);
    const [form, setForm] = useState(toFormValues(null));
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    /* Settings state */
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwMsg, setPwMsg] = useState(null); // { type: 'ok' | 'error', text }
    const [theme, setTheme] = useState(getStoredTheme);
    const [activeSection, setActiveSection] = useState('change-password');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteText, setDeleteText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    /* Messages state */
    const [conversations, setConversations] = useState([]);
    const [convLoading, setConvLoading] = useState(true);
    const [convError, setConvError] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [chatOpen, setChatOpen] = useState(false); // small screens: show the chat pane
    const [chatTab, setChatTab] = useState('all'); // 'all' | 'unread' | 'archived'
    const [chatSearch, setChatSearch] = useState('');
    const [messages, setMessages] = useState([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [chatMenuOpen, setChatMenuOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);
    const [reportError, setReportError] = useState('');
    const [chatNotice, setChatNotice] = useState(null); // { type: 'ok' | 'error', text }
    const threadRef = useRef(null);
    const composerRef = useRef(null);

    /* Notifications state */
    const [notifications, setNotifications] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef(null);

    const userReady = Boolean(user);

    /* Conversation list: load once, then poll */
    useEffect(() => {
        if (!isMessages || !userReady) return undefined;

        let cancelled = false;

        const load = async (initial) => {
            try {
                // TODO: adjust the endpoint to match your backend
                const response = await apiRequest('/api/chat/conversations');
                if (cancelled) return;

                const list = response.data.data || [];
                setConversations(list);
                setConvError('');

                if (initial) {
                    const first = list.find((c) => !c.archived) || list[0];
                    setActiveId((prev) => prev ?? (first ? getConvId(first) : null));
                }
            } catch (err) {
                if (!cancelled && initial) {
                    setConvError(err.message || 'Unable to load conversations.');
                }
            } finally {
                if (!cancelled && initial) setConvLoading(false);
            }
        };

        load(true);
        const timer = setInterval(() => load(false), POLL_CONVERSATIONS_MS);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [isMessages, userReady]);

    /* Open conversation: load messages, mark as read, then poll for new ones */
    useEffect(() => {
        setMessages([]);

        if (!isMessages || !userReady || !activeId) return undefined;

        let cancelled = false;

        const load = async (initial) => {
            if (initial) setThreadLoading(true);

            try {
                // TODO: adjust the endpoint to match your backend
                const response = await apiRequest(`/api/chat/conversations/${activeId}/messages`);
                if (cancelled) return;

                const list = response.data.data || [];

                // Keep messages that are still being sent
                setMessages((prev) => [...list, ...prev.filter((m) => m.pending)]);

                if (initial) {
                    apiRequest(`/api/chat/conversations/${activeId}/read`, { method: 'PUT' })
                        .catch(() => {});

                    setConversations((prev) =>
                        prev.map((c) => (getConvId(c) === activeId ? { ...c, unreadCount: 0 } : c))
                    );
                }
            } catch (err) {
                if (!cancelled && initial) {
                    setChatNotice({ type: 'error', text: err.message || 'Unable to load messages.' });
                }
            } finally {
                if (!cancelled && initial) setThreadLoading(false);
            }
        };

        load(true);
        const timer = setInterval(() => load(false), POLL_MESSAGES_MS);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [isMessages, userReady, activeId]);

    /* Keep the thread scrolled to the newest message */
    useEffect(() => {
        const el = threadRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, activeId]);

    /* Close the ⋮ menu / emoji picker when clicking elsewhere */
    useEffect(() => {
        if (!chatMenuOpen && !emojiOpen) return undefined;

        const onDown = (event) => {
            if (!event.target.closest('[data-popover]')) {
                setChatMenuOpen(false);
                setEmojiOpen(false);
            }
        };

        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [chatMenuOpen, emojiOpen]);

    /* Auto-hide the small notice above the composer */
    useEffect(() => {
        if (!chatNotice) return undefined;
        const timer = setTimeout(() => setChatNotice(null), 4000);
        return () => clearTimeout(timer);
    }, [chatNotice]);

    /* Notifications: load once, then poll */
    useEffect(() => {
        if (!userReady) return undefined;

        let cancelled = false;

        const load = async () => {
            try {
                // TODO: adjust the endpoint to match your backend
                const response = await apiRequest('/api/notifications');
                if (!cancelled) setNotifications(response.data.data || []);
            } catch {
                // Backend not ready: show sample data once so the UI can be tested
                if (!cancelled) setNotifications((prev) => (prev.length ? prev : SAMPLE_NOTIFICATIONS));
            }
        };

        load();
        const timer = setInterval(load, POLL_NOTIFICATIONS_MS);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [userReady]);

    /* Close the notifications panel on outside click or Escape */
    useEffect(() => {
        if (!notifOpen) return undefined;

        const onDown = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setNotifOpen(false);
            }
        };
        const onKey = (event) => {
            if (event.key === 'Escape') setNotifOpen(false);
        };

        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [notifOpen]);

    /* Apply + persist the theme; follow the OS when set to "system" */
    useEffect(() => {
        applyTheme(theme);

        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch {
            /* storage unavailable: ignore */
        }

        if (theme !== 'system') return undefined;

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => applyTheme('system');

        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, [theme]);

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

    const handleProfileImageUpload = async (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage('Please select an image file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMessage('Profile image must be smaller than 5 MB.');
            return;
        }

        setUploadingImage(true);
        setMessage('');

        try {
            const formData = new FormData();
            formData.append('profileImage', file);

            const response = await apiRequest('/api/auth/me/profile-image', {
                method: 'POST',
                body: formData,
            });

            const profileImage = response.data.profileImage;

            const updatedUser = {
                ...user,
                profileImage,
            };

            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setMessage('Profile picture updated successfully.');
        } catch (err) {
            console.error('Profile image upload error:', err);
            setMessage(err.message || 'Unable to upload profile picture.');
        } finally {
            setUploadingImage(false);
            event.target.value = '';
        }
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

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setMessage('Location services are not supported by this browser.');
            return;
        }

        setMessage('Fetching your current location...');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;

                    const response = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                    );

                    if (!response.ok) {
                        throw new Error('Unable to fetch location details.');
                    }

                    const data = await response.json();

                    const country =
                        data.countryName || '';

                    const state =
                        data.principalSubdivision || '';

                    const city =
                        data.city ||
                        data.locality ||
                        data.principalSubdivision ||
                        '';

                    const addressParts = [
                        data.locality,
                        data.city,
                        data.principalSubdivision,
                        data.countryName,
                    ].filter(Boolean);

                    const address = [...new Set(addressParts)].join(', ');

                    setForm((prev) => ({
                        ...prev,
                        country: country || prev.country,
                        state: state || prev.state,
                        city: city || prev.city,
                        address: address || prev.address,
                    }));

                    setMessage('Current location fetched successfully.');
                } catch (error) {
                    console.error('Location API error:', error);
                    setMessage('Unable to fetch location details.');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);

                if (error.code === 1) {
                    setMessage(
                        'Location permission was denied. Please allow location access.'
                    );
                } else if (error.code === 2) {
                    setMessage('Unable to determine your current location.');
                } else if (error.code === 3) {
                    setMessage('Location request timed out. Please try again.');
                } else {
                    setMessage('Unable to access your current location.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
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

    /* ---------- Settings handlers ---------- */
    const handlePwChange = (key, value) => {
        setPwForm((prev) => ({ ...prev, [key]: value }));
        if (pwMsg) setPwMsg(null);
    };

    const togglePwVisibility = (key) => {
        setPwShow((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleChangePassword = async (event) => {
        event.preventDefault();

        const { current, next, confirm } = pwForm;

        if (!current || !next || !confirm) {
            setPwMsg({ type: 'error', text: 'Please fill in all password fields.' });
            return;
        }

        if (next.length < MIN_PASSWORD_LENGTH) {
            setPwMsg({ type: 'error', text: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
            return;
        }

        if (next !== confirm) {
            setPwMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        if (next === current) {
            setPwMsg({ type: 'error', text: 'New password must be different from your current password.' });
            return;
        }

        setPwSaving(true);
        setPwMsg(null);

        try {
            // TODO: adjust the endpoint/method to match your backend
            await apiRequest('/api/auth/change-password', {
                method: 'PUT',
                body: {
                    currentPassword: current,
                    newPassword: next,
                },
            });

            setPwForm({ current: '', next: '', confirm: '' });
            setPwShow({ current: false, next: false, confirm: false });
            setPwMsg({ type: 'ok', text: 'Password updated successfully.' });
        } catch (err) {
            setPwMsg({ type: 'error', text: err.message || 'Could not update password.' });
        } finally {
            setPwSaving(false);
        }
    };

    const scrollToSection = (id) => {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const openDeleteDialog = () => {
        setDeleteText('');
        setDeleteError('');
        setDeleteOpen(true);
    };

    const closeDeleteDialog = () => {
        if (deleting) return;
        setDeleteOpen(false);
    };

    const handleDeleteAccount = async (event) => {
        event.preventDefault();

        if (deleteText !== 'DELETE') return;

        setDeleting(true);
        setDeleteError('');

        try {
            // TODO: adjust the endpoint/method to match your backend
            await apiRequest('/api/auth/me', { method: 'DELETE' });

            localStorage.removeItem('token');
            localStorage.removeItem('user');

            navigate('/login');
        } catch (err) {
            setDeleteError(err.message || 'Could not delete your account.');
            setDeleting(false);
        }
    };

    /* ---------- Notification handlers ---------- */
    const unreadNotifCount = notifications.filter((n) => !n.read).length;

    const handleMarkAllRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

        try {
            // TODO: adjust the endpoint to match your backend
            await apiRequest('/api/notifications/read-all', { method: 'PUT' });
        } catch {
            /* keep the optimistic update */
        }
    };

    const handleNotificationClick = (notif) => {
        const id = getNotifId(notif);

        if (!notif.read) {
            setNotifications((prev) => prev.map((n) => (getNotifId(n) === id ? { ...n, read: true } : n)));
            // TODO: adjust the endpoint to match your backend
            apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' }).catch(() => {});
        }

        setNotifOpen(false);
        if (notif.link) navigate(notif.link);
    };

    const handleViewAllNotifications = () => {
        setNotifOpen(false);
        // TODO: point this at your notifications page
        navigate('/notifications');
    };

    /* ---------- Messages handlers ---------- */
    const updateConversation = (id, patch) => {
        setConversations((prev) =>
            prev.map((c) => (getConvId(c) === id ? { ...c, ...patch } : c))
        );
    };

    const selectConversation = (id) => {
        setActiveId(id);
        setChatOpen(true);
        setChatMenuOpen(false);
        setEmojiOpen(false);
        setDraft('');
    };

    const isMineMessage = (msg) => {
        if (typeof msg.isMine === 'boolean') return msg.isMine;
        const senderId = msg.senderId ?? msg.sender?._id ?? msg.sender?.id ?? msg.sender;
        const myId = user?.id ?? user?._id;
        return senderId != null && myId != null && String(senderId) === String(myId);
    };

    const handleSendMessage = async (event) => {
        event.preventDefault();

        const text = draft.trim();
        if (!text || !activeId || sending) return;

        const tempId = `tmp-${Date.now()}`;
        const sentAt = new Date().toISOString();

        setMessages((prev) => [
            ...prev,
            { id: tempId, text, isMine: true, createdAt: sentAt, pending: true },
        ]);
        setDraft('');
        setEmojiOpen(false);
        setSending(true);

        try {
            // TODO: adjust the endpoint to match your backend
            const response = await apiRequest(`/api/chat/conversations/${activeId}/messages`, {
                method: 'POST',
                body: { text },
            });

            const saved = response?.data?.message || { text, createdAt: sentAt };

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === tempId ? { ...saved, id: getConvId(saved) || tempId, isMine: true } : m
                )
            );

            updateConversation(activeId, { lastMessage: text, updatedAt: saved.createdAt || sentAt });
        } catch (err) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setDraft(text);
            setChatNotice({ type: 'error', text: err.message || 'Message could not be sent.' });
        } finally {
            setSending(false);
        }
    };

    const handleToggleArchive = async () => {
        const conv = conversations.find((c) => getConvId(c) === activeId);
        if (!conv) return;

        const archived = !conv.archived;
        setChatMenuOpen(false);

        try {
            // TODO: adjust the endpoint to match your backend
            await apiRequest(`/api/chat/conversations/${activeId}/archive`, {
                method: 'PUT',
                body: { archived },
            });

            updateConversation(activeId, { archived });
            setChatNotice({ type: 'ok', text: archived ? 'Conversation archived.' : 'Conversation restored.' });

            // Leave the conversation that just moved to another tab
            setActiveId(null);
            setChatOpen(false);
        } catch (err) {
            setChatNotice({ type: 'error', text: err.message || 'Could not update the conversation.' });
        }
    };

    const handleScheduleVisit = () => {
        setDraft((prev) => prev || VISIT_TEMPLATE);
        setChatOpen(true);
        setTimeout(() => composerRef.current?.focus(), 0);
    };

    const handleViewListing = () => {
        const conv = conversations.find((c) => getConvId(c) === activeId);
        const listingId = conv?.listing?.id || conv?.listing?._id;

        // TODO: adjust to your listing details route
        if (listingId) navigate(`/listings/${listingId}`);
    };

    const openReportDialog = () => {
        setChatMenuOpen(false);
        setReportReason('');
        setReportError('');
        setReportOpen(true);
    };

    const closeReportDialog = () => {
        if (reporting) return;
        setReportOpen(false);
    };

    const handleReportUser = async (event) => {
        event.preventDefault();

        if (!reportReason.trim()) {
            setReportError('Please tell us what happened.');
            return;
        }

        setReporting(true);
        setReportError('');

        try {
            // TODO: adjust the endpoint to match your backend
            await apiRequest(`/api/chat/conversations/${activeId}/report`, {
                method: 'POST',
                body: { reason: reportReason.trim() },
            });

            setReportOpen(false);
            setChatNotice({ type: 'ok', text: 'Thanks, your report has been submitted.' });
        } catch (err) {
            setReportError(err.message || 'Could not submit your report.');
        } finally {
            setReporting(false);
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
    const profileImage = user?.profileImage || '';
    const role = user?.role || 'user';
    const isIndia = form.country === 'India';
    const messageIsError = message && !message.toLowerCase().includes('success');

    const pageHeading = isMessages
        ? { title: 'Messages', subtitle: 'Chat with property owners, tenants, and support.' }
        : isSettings
            ? { title: 'Settings', subtitle: 'Manage your account settings and preferences.' }
            : { title: 'My Profile', subtitle: 'View and manage your account information.' };

    const renderMessages = () => {
        const query = chatSearch.trim().toLowerCase();

        const activeConvs = conversations.filter((c) => !c.archived);
        const counts = {
            all: activeConvs.length,
            unread: activeConvs.filter((c) => (c.unreadCount || 0) > 0).length,
            archived: conversations.length - activeConvs.length,
        };

        const visibleConvs = conversations
            .filter((c) => {
                if (chatTab === 'archived') return c.archived;
                if (c.archived) return false;
                return chatTab !== 'unread' || (c.unreadCount || 0) > 0;
            })
            .filter((c) =>
                !query ||
                [convTitle(c), c.lastMessage, c.otherUser?.name].some((v) =>
                    String(v || '').toLowerCase().includes(query)
                )
            );

        const activeConv = conversations.find((c) => getConvId(c) === activeId) || null;
        const support = isSupportConv(activeConv);
        const other = activeConv?.otherUser || {};
        const listing = activeConv?.listing || null;
        const rent = formatRent(listing?.price ?? listing?.rent);

        const renderAvatar = (conv, className) => {
            if (isSupportConv(conv)) {
                return <span className={`${className} rf-chat-avatar--support`}>{icons.headset}</span>;
            }

            const image = convImage(conv);
            return image ? (
                <img className={className} src={image} alt="" />
            ) : (
                <span className={`${className} rf-chat-avatar--initial`}>
                    {convTitle(conv).charAt(0).toUpperCase()}
                </span>
            );
        };

        return (
            <div className={`rf-messages${chatOpen ? ' chat-open' : ''}`}>

                {/* ============ CONVERSATION LIST ============ */}
                <section className="rf-card rf-msg-panel rf-chat-list-panel">
                    <div className="rf-chat-search">
                        <span className="rf-chat-search-icon">{icons.search}</span>
                        <input
                            type="text"
                            value={chatSearch}
                            onChange={(e) => setChatSearch(e.target.value)}
                            placeholder="Search conversations..."
                            aria-label="Search conversations"
                        />
                    </div>

                    <div className="rf-chat-tabs" role="tablist">
                        {[
                            { id: 'all', label: 'All Chats' },
                            { id: 'unread', label: 'Unread' },
                            { id: 'archived', label: 'Archived' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={chatTab === tab.id}
                                className={`rf-chat-tab${chatTab === tab.id ? ' active' : ''}`}
                                onClick={() => setChatTab(tab.id)}
                            >
                                {tab.label} ({counts[tab.id]})
                            </button>
                        ))}
                    </div>

                    <div className="rf-chat-list">
                        {convLoading && <p className="rf-chat-empty">Loading conversations...</p>}

                        {!convLoading && convError && (
                            <p className="rf-chat-empty rf-chat-empty--error">{convError}</p>
                        )}

                        {!convLoading && !convError && visibleConvs.length === 0 && (
                            <p className="rf-chat-empty">
                                {query
                                    ? 'No conversations match your search.'
                                    : chatTab === 'unread'
                                        ? 'No unread conversations.'
                                        : chatTab === 'archived'
                                            ? 'No archived conversations.'
                                            : 'No conversations yet.'}
                            </p>
                        )}

                        {visibleConvs.map((conv) => {
                            const id = getConvId(conv);
                            const unread = conv.unreadCount || 0;

                            return (
                                <button
                                    key={id}
                                    type="button"
                                    className={`rf-chat-item${id === activeId ? ' active' : ''}`}
                                    onClick={() => selectConversation(id)}
                                >
                                    {renderAvatar(conv, 'rf-chat-avatar')}
                                    <span className="rf-chat-item-body">
                                        <strong>{convTitle(conv)}</strong>
                                        <span className={unread ? 'unread' : ''}>{conv.lastMessage || 'No messages yet'}</span>
                                    </span>
                                    <span className="rf-chat-item-meta">
                                        <time>{formatListTime(conv.updatedAt || conv.lastMessageAt)}</time>
                                        {unread > 0 && <span className="rf-chat-unread">{unread}</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ============ CHAT ============ */}
                <section className="rf-card rf-msg-panel rf-chat-panel">
                    {!activeConv ? (
                        <div className="rf-chat-placeholder">
                            <span className="rf-chat-placeholder-icon">{icons.messages}</span>
                            <p>Select a conversation to start chatting.</p>
                        </div>
                    ) : (
                        <>
                            <header className="rf-chat-header">
                                <button
                                    type="button"
                                    className="rf-chat-back"
                                    onClick={() => setChatOpen(false)}
                                    aria-label="Back to conversations"
                                >
                                    {icons.arrowLeft}
                                </button>

                                {renderAvatar(activeConv, 'rf-chat-header-avatar')}

                                <div className="rf-chat-header-text">
                                    <strong>{convTitle(activeConv)}</strong>
                                    <span className={`rf-chat-status${other.online ? ' online' : ''}`}>
                                        {other.online ? 'Online' : 'Offline'}
                                    </span>
                                </div>

                                <div className="rf-popover-wrap" data-popover>
                                    <button
                                        type="button"
                                        className="rf-icon-btn"
                                        onClick={() => setChatMenuOpen((prev) => !prev)}
                                        aria-label="Conversation options"
                                        aria-expanded={chatMenuOpen}
                                    >
                                        {icons.more}
                                    </button>

                                    {chatMenuOpen && (
                                        <div className="rf-popover" role="menu">
                                            <button type="button" role="menuitem" onClick={handleToggleArchive}>
                                                {icons.archive}
                                                {activeConv.archived ? 'Unarchive' : 'Archive'}
                                            </button>
                                            {!support && (
                                                <button type="button" role="menuitem" className="danger" onClick={openReportDialog}>
                                                    {icons.flag}
                                                    Report user
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </header>

                            <div className="rf-chat-thread" ref={threadRef}>
                                {threadLoading && messages.length === 0 && (
                                    <p className="rf-chat-empty">Loading messages...</p>
                                )}

                                {!threadLoading && messages.length === 0 && (
                                    <p className="rf-chat-empty">No messages yet. Say hello!</p>
                                )}

                                {messages.map((msg, index) => {
                                    const mine = isMineMessage(msg);
                                    const showDay =
                                        index === 0 ||
                                        dayKey(msg.createdAt) !== dayKey(messages[index - 1].createdAt);

                                    return (
                                        <React.Fragment key={getConvId(msg) || index}>
                                            {showDay && (
                                                <div className="rf-day-divider">
                                                    <span>{formatDayLabel(msg.createdAt)}</span>
                                                </div>
                                            )}

                                            <div className={`rf-msg-row ${mine ? 'mine' : 'theirs'}`}>
                                                <div className="rf-bubble">{msg.text}</div>
                                                <div className="rf-msg-meta">
                                                    <span>{formatClock(msg.createdAt)}</span>
                                                    {mine && (
                                                        msg.pending ? (
                                                            <span>Sending...</span>
                                                        ) : (
                                                            <span className={`rf-ticks${msg.read ? ' read' : ''}`}>
                                                                {msg.read ? icons.checks : icons.check}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {chatNotice && (
                                <div className={`rf-chat-notice ${chatNotice.type === 'ok' ? 'ok' : 'error'}`}>
                                    {chatNotice.text}
                                </div>
                            )}

                            <form className="rf-composer" onSubmit={handleSendMessage}>
                                <div className="rf-composer-field">
                                    <button
                                        type="button"
                                        className="rf-icon-btn"
                                        disabled
                                        title="Attachments coming soon"
                                        aria-label="Attach a file (coming soon)"
                                    >
                                        {icons.paperclip}
                                    </button>

                                    <input
                                        ref={composerRef}
                                        type="text"
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        placeholder="Type a message..."
                                        aria-label="Type a message"
                                        maxLength={2000}
                                    />

                                    <div className="rf-popover-wrap" data-popover>
                                        <button
                                            type="button"
                                            className="rf-icon-btn"
                                            onClick={() => setEmojiOpen((prev) => !prev)}
                                            aria-label="Add emoji"
                                            aria-expanded={emojiOpen}
                                        >
                                            {icons.smile}
                                        </button>

                                        {emojiOpen && (
                                            <div className="rf-emoji-panel">
                                                {EMOJIS.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => setDraft((prev) => prev + emoji)}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="rf-send-btn"
                                    disabled={!draft.trim() || sending}
                                    aria-label="Send message"
                                >
                                    {icons.send}
                                </button>
                            </form>
                        </>
                    )}
                </section>

                {/* ============ DETAILS ============ */}
                <aside className="rf-card rf-msg-panel rf-chat-details">
                    {activeConv && (
                        <>
                            {!support && listing && (
                                <>
                                    {listing.image && (
                                        <img className="rf-detail-image" src={listing.image} alt={listing.title || 'Listing'} />
                                    )}
                                    <h3 className="rf-detail-title">{listing.title}</h3>
                                    {listing.location && (
                                        <p className="rf-detail-location">
                                            {icons.pin}
                                            {listing.location}
                                        </p>
                                    )}
                                    <div className="rf-detail-price-row">
                                        <strong>{rent}</strong>
                                        <button type="button" className="rf-btn-outline" onClick={handleViewListing}>
                                            View Listing
                                        </button>
                                    </div>
                                    <hr className="rf-detail-rule" />
                                </>
                            )}

                            <h4 className="rf-detail-heading">Conversation Details</h4>
                            <ul className="rf-detail-list">
                                <li>
                                    <span className="rf-detail-icon">{icons.profile}</span>
                                    <span>
                                        <small>{support ? 'Contact' : roleLabel(other.role)}</small>
                                        {support ? 'RentFlow Support' : other.name || '-'}
                                    </span>
                                </li>
                                {other.phone && (
                                    <li>
                                        <span className="rf-detail-icon">{icons.phone}</span>
                                        <span>
                                            <small>Phone</small>
                                            {other.phone}
                                        </span>
                                    </li>
                                )}
                                {other.email && (
                                    <li>
                                        <span className="rf-detail-icon">{icons.mail}</span>
                                        <span>
                                            <small>Email</small>
                                            {other.email}
                                        </span>
                                    </li>
                                )}
                                {(other.createdAt || other.memberSince) && (
                                    <li>
                                        <span className="rf-detail-icon">{icons.award}</span>
                                        <span>
                                            <small>Member Since</small>
                                            {formatMonthYear(other.createdAt || other.memberSince)}
                                        </span>
                                    </li>
                                )}
                            </ul>

                            {!support && (
                                <>
                                    <hr className="rf-detail-rule" />
                                    <h4 className="rf-detail-heading">Quick Actions</h4>
                                    <div className="rf-quick-actions">
                                        <button type="button" className="rf-quick-btn" onClick={handleScheduleVisit}>
                                            {icons.bookings}
                                            Schedule Visit
                                        </button>
                                        <button type="button" className="rf-quick-btn rf-quick-btn--danger" onClick={openReportDialog}>
                                            {icons.flag}
                                            Report User
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </aside>

                {/* ============ REPORT DIALOG ============ */}
                {reportOpen && (
                    <div className="rf-modal-overlay" onClick={closeReportDialog}>
                        <form
                            className="rf-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="report-title"
                            onClick={(e) => e.stopPropagation()}
                            onSubmit={handleReportUser}
                        >
                            <span className="rf-modal-icon">{icons.flag}</span>
                            <h3 id="report-title">Report {other.name || 'this user'}</h3>
                            <p>
                                Tell us what went wrong. Our team will review this conversation.
                            </p>

                            <div className="rf-field">
                                <label htmlFor="report-reason">Reason</label>
                                <textarea
                                    id="report-reason"
                                    rows="3"
                                    value={reportReason}
                                    onChange={(e) => {
                                        setReportReason(e.target.value);
                                        if (reportError) setReportError('');
                                    }}
                                    maxLength={1000}
                                    autoFocus
                                />
                            </div>

                            {reportError && <div className="rf-msg rf-msg--error">{reportError}</div>}

                            <div className="rf-form-actions">
                                <button
                                    type="button"
                                    className="rf-btn-secondary"
                                    onClick={closeReportDialog}
                                    disabled={reporting}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="rf-btn-danger" disabled={reporting}>
                                    {reporting ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        );
    };

    const renderSettings = () => (
        <div className="rf-settings-grid">

            {/* SECTION MENU */}
            <nav className="rf-card rf-settings-menu" aria-label="Settings sections">
                {SETTINGS_SECTIONS.map((section) => (
                    <button
                        key={section.id}
                        type="button"
                        className={`rf-settings-menu-item${activeSection === section.id ? ' active' : ''}`}
                        onClick={() => scrollToSection(section.id)}
                    >
                        <span className="rf-settings-menu-icon">{icons[section.icon]}</span>
                        <span className="rf-settings-menu-label">{section.label}</span>
                        <span className="rf-settings-menu-chevron">{icons.chevron}</span>
                    </button>
                ))}
            </nav>

            <div className="rf-settings-stack">

                {/* CHANGE PASSWORD */}
                <form className="rf-card" id="change-password" onSubmit={handleChangePassword}>
                    <h2 className="rf-settings-title">Change Password</h2>
                    <p className="rf-settings-desc">Update your password to keep your account secure.</p>

                    <div className="rf-pw-grid">
                        {PASSWORD_FIELDS.map((field) => (
                            <div className="rf-field" key={field.key}>
                                <label htmlFor={`pw-${field.key}`}>{field.label}</label>
                                <div className="rf-input-wrap">
                                    <span className="rf-input-icon">{icons.lock}</span>
                                    <input
                                        id={`pw-${field.key}`}
                                        type={pwShow[field.key] ? 'text' : 'password'}
                                        value={pwForm[field.key]}
                                        onChange={(e) => handlePwChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        autoComplete={field.autoComplete}
                                    />
                                    <button
                                        type="button"
                                        className="rf-input-toggle"
                                        onClick={() => togglePwVisibility(field.key)}
                                        aria-label={pwShow[field.key] ? 'Hide password' : 'Show password'}
                                    >
                                        {pwShow[field.key] ? icons.eye : icons.eyeOff}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {pwMsg && (
                        <div className={pwMsg.type === 'ok' ? 'rf-msg rf-msg--ok' : 'rf-msg rf-msg--error'}>
                            {pwMsg.text}
                        </div>
                    )}

                    <div className="rf-form-actions">
                        <button type="submit" className="rf-btn-primary" disabled={pwSaving}>
                            {pwSaving ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>

                {/* APPEARANCE */}
                <section className="rf-card" id="appearance">
                    <h2 className="rf-settings-title">Appearance</h2>
                    <p className="rf-settings-desc">Choose your preferred theme for RentFlow.</p>

                    <div className="rf-theme-grid" role="radiogroup" aria-label="Theme">
                        {THEME_OPTIONS.map((option) => (
                            <label
                                key={option.value}
                                className={`rf-theme-option${theme === option.value ? ' selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="theme"
                                    value={option.value}
                                    checked={theme === option.value}
                                    onChange={() => setTheme(option.value)}
                                />
                                <span className="rf-theme-icon">{icons[option.icon]}</span>
                                <span className="rf-theme-text">
                                    <strong>{option.label}</strong>
                                    <span>{option.description}</span>
                                </span>
                                <span className="rf-theme-radio" aria-hidden="true" />
                            </label>
                        ))}
                    </div>
                </section>

                {/* DELETE ACCOUNT */}
                <section className="rf-card" id="delete-account">
                    <h2 className="rf-settings-title">Delete Account</h2>
                    <p className="rf-settings-desc">
                        Permanently delete your account and all your data. This action cannot be undone.
                    </p>

                    <div className="rf-danger-box">
                        <span className="rf-danger-icon">{icons.trash}</span>
                        <div className="rf-danger-text">
                            <strong>Permanently Delete Your Account</strong>
                            <span>
                                This will permanently remove your account, all your listings, bookings,
                                messages, reviews, and personal data from RentFlow.
                            </span>
                        </div>
                        <button type="button" className="rf-btn-danger" onClick={openDeleteDialog}>
                            Delete Account
                        </button>
                    </div>
                </section>
            </div>

            {/* CONFIRM DELETE DIALOG */}
            {deleteOpen && (
                <div className="rf-modal-overlay" onClick={closeDeleteDialog}>
                    <form
                        className="rf-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-title"
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleDeleteAccount}
                    >
                        <span className="rf-modal-icon">{icons.trash}</span>
                        <h3 id="delete-title">Delete your account?</h3>
                        <p>
                            This permanently removes your account and all of your data.
                            This cannot be undone.
                        </p>

                        <div className="rf-field">
                            <label htmlFor="delete-confirm">
                                Type <strong>DELETE</strong> to confirm
                            </label>
                            <input
                                id="delete-confirm"
                                type="text"
                                value={deleteText}
                                onChange={(e) => setDeleteText(e.target.value)}
                                autoComplete="off"
                                autoFocus
                            />
                        </div>

                        {deleteError && <div className="rf-msg rf-msg--error">{deleteError}</div>}

                        <div className="rf-form-actions">
                            <button
                                type="button"
                                className="rf-btn-secondary"
                                onClick={closeDeleteDialog}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rf-btn-danger"
                                disabled={deleting || deleteText !== 'DELETE'}
                            >
                                {deleting ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );

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
                            className={`rf-nav-item${item.label === activeLabel ? ' active' : ''}`}
                            onClick={() => navigate(item.path)}
                            aria-current={item.label === activeLabel ? 'page' : undefined}
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
                    <div className="rf-notif-wrap" ref={notifRef}>
                        <button
                            type="button"
                            className="rf-bell"
                            aria-label="Notifications"
                            aria-haspopup="true"
                            aria-expanded={notifOpen}
                            onClick={() => setNotifOpen((prev) => !prev)}
                        >
                            {icons.bell}
                            {unreadNotifCount > 0 && (
                                <span className="rf-bell-badge">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>
                            )}
                        </button>

                        {notifOpen && (
                            <div className="rf-notif-panel" role="dialog" aria-label="Notifications">
                                <div className="rf-notif-head">
                                    <h3>Notifications ({unreadNotifCount})</h3>
                                    {unreadNotifCount > 0 && (
                                        <button type="button" onClick={handleMarkAllRead}>
                                            Mark all as read
                                        </button>
                                    )}
                                </div>

                                <div className="rf-notif-list">
                                    {notifications.length === 0 && (
                                        <p className="rf-notif-empty">You're all caught up.</p>
                                    )}

                                    {notifications.map((notif) => {
                                        const style = NOTIFICATION_STYLES[notif.type] || NOTIFICATION_STYLES.message;

                                        return (
                                            <button
                                                key={getNotifId(notif)}
                                                type="button"
                                                className={`rf-notif-item${notif.read ? '' : ' unread'}`}
                                                onClick={() => handleNotificationClick(notif)}
                                            >
                                                <span className={`rf-notif-icon rf-notif-icon--${style.tone}`}>
                                                    {icons[style.icon]}
                                                </span>
                                                <span className="rf-notif-body">
                                                    <strong>{notif.title}</strong>
                                                    <span>{notif.text}</span>
                                                    <time>{timeAgo(notif.createdAt)}</time>
                                                </span>
                                                {!notif.read && <span className="rf-notif-dot" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* <button type="button" className="rf-notif-viewall" onClick={handleViewAllNotifications}>
                                    View All Notifications
                                </button> */}
                            </div>
                        )}
                    </div>

                    <div className="rf-user-chip">
                        <div className="rf-avatar-sm">
                            {profileImage ? (
                                <img src={profileImage} alt="Profile" />
                            ) : (
                                initial
                            )}
                        </div>
                        <div className="rf-user-chip-text">
                            <strong>{user?.name || 'User'}</strong>
                            <span>{role}</span>
                        </div>
                    </div>
                </div>

                {/* HEADING */}
                <div className="rf-heading">
                    <h1>{pageHeading.title}</h1>
                    <p>{pageHeading.subtitle}</p>
                </div>

                {/* CONTENT */}
                {isMessages ? renderMessages() : isSettings ? renderSettings() : (
                <div className="rf-grid">

                    {/* SUMMARY */}
                    <section className="rf-card rf-summary">
                        <div className="rf-avatar-wrap">
                            <div className="rf-avatar-lg">
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" />
                                ) : (
                                    initial
                                )}
                            </div>

                            {editing && (
                                <label
                                    className={`rf-avatar-edit${uploadingImage ? ' is-uploading' : ''}`}
                                    title="Change profile photo"
                                >
                                    {uploadingImage ? (
                                        <span className="rf-spinner" aria-hidden="true" />
                                    ) : (
                                        icons.camera
                                    )}
                                    <span className="rf-sr-only">
                                        {uploadingImage ? 'Uploading photo' : 'Change profile photo'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleProfileImageUpload}
                                        disabled={uploadingImage}
                                    />
                                </label>
                            )}
                        </div>

                        {editing && (
                            <p className="rf-avatar-hint">
                                {uploadingImage ? 'Uploading...' : 'JPG, PNG or WebP · max 5 MB'}
                            </p>
                        )}

                        <h2>{user?.name || 'User'}</h2>
                        <p className="rf-summary-email">{user?.email || '-'}</p>
                        <span className="rf-badge">{role}</span>
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
                        <div className="rf-location-head">
                            <h3 className="rf-subhead">Location Information</h3>

                            {editing && (
                                <button
                                    type="button"
                                    className="rf-location-btn"
                                    onClick={handleUseCurrentLocation}
                                >
                                    📍 Use My Current Location
                                </button>
                            )}
                        </div>

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
                )}
            </main>
        </div>
    );
};

export default Profile;