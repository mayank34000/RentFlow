import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import '../../css/index.css';
import './styles/chat.css';
import { useTheme, useScrollHide } from './useNavbarBehavior';

// ============================================================================
// CHAT UI COMPONENT
// ============================================================================

export default function Chat() {
    // ── Shared navbar hooks ───────────────────────────────────────────────────
    useTheme();
    const scrollState = useScrollHide();

    // ── Auth state ────────────────────────────────────────────────────────────
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // ── Chat API & Socket state ───────────────────────────────────────────────
    const [socket, setSocket] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');

    // ── UI states ─────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState({});

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    // Scroll to bottom of message list
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // ── Init (Auth & Data fetching) ───────────────────────────────────────────

    useEffect(() => {
        // Init Auth exactly as Booking History does
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsLoggedIn(loggedIn);
        let user = null;
        if (loggedIn) {
            try { user = JSON.parse(localStorage.getItem('current_user')) || null; } catch (_e) {}
            setCurrentUser(user);
        }

        // Fetch initial conversations via HTTP
        const fetchConversations = async (devUserId) => {
            try {
                const res = await fetch('http://localhost:5000/api/chat/conversations', {
                    headers: { 'x-dev-user-id': devUserId }
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    setConversations(data.data);
                } else {
                    // Check if it's the specific ObjectId validation blocker
                    if (data.message && data.message.includes('valid MongoDB ObjectId')) {
                        setError('BLOCKER: Current mock authentication uses invalid MongoDB ObjectIds.');
                    } else {
                        setError(data.message || 'Failed to load conversations.');
                    }
                }
            } catch (_err) {
                setError('Failed to connect to chat API. Backend might be down.');
            } finally {
                setLoading(false);
            }
        };

        if (loggedIn && user) {
            // Using useremail as mock ObjectId. This WILL fail on the backend currently,
            // but we must use what we have and let the backend reject it to demonstrate the blocker.
            const devUserId = user.useremail || 'mock-id';
            fetchConversations(devUserId);
        } else {
            setLoading(false);
        }

        // Wallet legacy script fallback
        window.__DISABLE_LEGACY_NAVBAR_SCROLL__ = true;
        if (!document.getElementById('legacy-navbar-script')) {
            const script = document.createElement('script');
            script.id  = 'legacy-navbar-script';
            script.src = '../../js/navbar-scroll.js';
            document.body.appendChild(script);
        }
    }, []);

    // ── Socket initialization ─────────────────────────────────────────────────

    useEffect(() => {
        if (!currentUser) return;
        const devUserId = currentUser.useremail || 'mock-id';

        // Connect to Socket.IO using dev auth headers
        const newSocket = io('http://localhost:5000', {
            extraHeaders: { 'x-dev-user-id': devUserId },
            auth: { userId: devUserId }
        });

        newSocket.on('connect', () => {
            console.log('Chat socket connected:', newSocket.id);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });

        // Incoming message
        newSocket.on('message', (payload) => {
            setMessages(prev => [...prev, payload]);

            // Auto-mark as read if we are looking at this conversation
            if (activeConversation && payload.conversation === activeConversation._id) {
                newSocket.emit('mark_read', { conversationId: activeConversation._id });
            } else {
                // Update unread count on sidebar
                setConversations(prev => prev.map(c =>
                    c._id === payload.conversation
                        ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: payload, lastMessageAt: payload.createdAt }
                        : c
                ));
            }
        });

        // Messages read receipt
        newSocket.on('messages_read', ({ conversationId, readAt }) => {
            setMessages(prev => prev.map(msg =>
                (msg.conversation === conversationId && !msg.readAt)
                    ? { ...msg, readAt }
                    : msg
            ));
        });

        // Typing indicators
        newSocket.on('typing_start', ({ conversationId, userId }) => {
            setTypingUsers(prev => ({ ...prev, [`${conversationId}_${userId}`]: true }));
        });

        newSocket.on('typing_stop', ({ conversationId, userId }) => {
            setTypingUsers(prev => {
                const next = { ...prev };
                delete next[`${conversationId}_${userId}`];
                return next;
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [currentUser, activeConversation]);

    // Scroll to bottom on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ── Conversation selection ────────────────────────────────────────────────

    const selectConversation = async (conv) => {
        setActiveConversation(conv);
        setMessages([]); // clear while loading

        const devUserId = currentUser?.useremail || 'mock-id';

        try {
            const res = await fetch(`http://localhost:5000/api/chat/conversations/${conv._id}/messages`, {
                headers: { 'x-dev-user-id': devUserId }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // messages come back sorted newest first based on the API contract
                setMessages(data.data.reverse());
            }
        } catch (err) {
            console.error('Failed to load messages:', err);
        }

        // Join room & mark read
        if (socket) {
            socket.emit('join_conversation', { conversationId: conv._id });
            if (conv.unreadCount > 0) {
                socket.emit('mark_read', { conversationId: conv._id });
                // Reset local unread count
                setConversations(prev => prev.map(c =>
                    c._id === conv._id ? { ...c, unreadCount: 0 } : c
                ));
            }
        }
    };

    // ── Sending & Typing ──────────────────────────────────────────────────────

    const handleTextChange = (e) => {
        setInputText(e.target.value);

        if (!socket || !activeConversation) return;

        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing_start', { conversationId: activeConversation._id });
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit('typing_stop', { conversationId: activeConversation._id });
        }, 1500);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        const text = inputText.trim();
        if (!text || !socket || !activeConversation) return;

        socket.emit('send_message', { conversationId: activeConversation._id, text }, (response) => {
            if (!response.success) {
                alert('Failed to send message: ' + (response.message || 'Unknown error'));
            }
        });

        setInputText('');
        if (isTyping) {
            setIsTyping(false);
            socket.emit('typing_stop', { conversationId: activeConversation._id });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    // ── Derived display values ────────────────────────────────────────────────

    const firstName = currentUser ? (currentUser.name || currentUser.username || currentUser.userfname || 'User').split(' ')[0] : 'User';
    const savedImage = currentUser ? (localStorage.getItem('profileImage') || '../assets/profile.png') : '../assets/profile.png';
    const devUserId = currentUser?.useremail || 'mock-id';

    // ── Render Helpers ────────────────────────────────────────────────────────

    const renderBlockerNotice = () => (
        <div className="blocker-notice">
            <h4 style={{ margin: '0 0 10px 0' }}>Integration Blocker Detected</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
                The backend expects a valid 24-character MongoDB `ObjectId` for the user and booking IDs.
                Currently, the frontend uses mock email addresses (<code>{devUserId}</code>) as identifiers.
                <br /><br />
                The UI components are fully implemented and ready, but API/Socket interactions will fail until real User/Auth ObjectIds are integrated.
            </p>
        </div>
    );

    // ========================================================================
    // RETURN RENDER
    // ========================================================================
    return (
        <>
            <video className="bg-video" autoPlay muted loop playsInline>
                <source src="../../assets/video.mp4" type="video/mp4" />
            </video>
            <div className="overlay" style={{ opacity: 0.85 }} />

            <div className="page-wrapper" onClick={() => setShowProfileMenu(false)}>

                {/* ── Navbar ── */}
                <header
                    className={`site-header${scrollState.hidden ? ' hidden-nav' : ''}${scrollState.scrolled ? ' scrolled' : ''}`}
                    id="site-header"
                >
                    <Link to="/" className="logo">Rent<span style={{ color: '#3a5bd9' }}>Flow</span></Link>
                    <nav className="nav-links" id="main-nav">
                        <Link to="/">Home</Link>
                        <Link to="/booking">Explore Rentals</Link>
                        <Link to="/booking-history">My Rentals</Link>
                        <Link to="/create-listing" style={{ color: 'var(--accent-blue-bright)', fontWeight: 600 }}>+ Post Listing</Link>
                        <Link to="/contact">Contact &amp; FAQ</Link>
                    </nav>
                    <div className="nav-cta" id="auth-buttons" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {!isLoggedIn ? (
                            <>
                                <Link to="/login" className="btn-ghost">Log In</Link>
                                <Link to="/signup" className="btn-nav-primary">Get Started</Link>
                            </>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <div
                                    className="profile-dropdown-trigger"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                                    onClick={e => { e.stopPropagation(); setShowProfileMenu(p => !p); }}
                                >
                                    <div style={{ width: 32, height: 32, background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <img src={savedImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: '#fff' }}>{firstName}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 2 }}><polyline points="6 9 12 15 18 9" /></svg>
                                </div>
                                <div
                                    className="profile-dropdown-menu"
                                    style={{ display: showProfileMenu ? 'flex' : 'none', position: 'absolute', top: 40, right: 0, background: '#12172b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, width: 180, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, padding: '6px 0', flexDirection: 'column' }}
                                >
                                    <Link to="/profile" style={{ padding: '10px 16px', color: '#b0b8c6', textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'block' }}>My Profile</Link>
                                    <Link to="/chat" style={{ padding: '10px 16px', color: '#b0b8c6', textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'block' }}>Messages</Link>
                                    <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); setShowProfileMenu(false); if (window.openWalletModal) window.openWalletModal(); }} style={{ padding: '10px 16px', color: '#b0b8c6', textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'block' }}>My Wallet</a>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
                                    <a href="#" onClick={() => { localStorage.removeItem('isLoggedIn'); window.location.reload(); }} style={{ padding: '10px 16px', color: '#ef4444', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'block' }}>Logout</a>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* ── Main Chat Layout ── */}
                <div className="chat-container">

                    {/* Sidebar */}
                    <div className="chat-sidebar">
                        <div className="chat-sidebar-header">Messages</div>

                        {loading ? (
                            <div style={{ padding: 20, color: '#a0aabe' }}>Loading conversations...</div>
                        ) : error ? (
                            <div style={{ padding: 20 }}>
                                {error.includes('BLOCKER') ? renderBlockerNotice() : <span style={{ color: '#ef4444' }}>{error}</span>}
                            </div>
                        ) : conversations.length === 0 ? (
                            <div style={{ padding: 20, color: '#a0aabe' }}>No conversations yet.</div>
                        ) : (
                            <ul className="conversation-list">
                                {conversations.map(conv => {
                                    // Determine the "other" participant name for display
                                    const otherParticipant = conv.participants?.find(p => p._id !== devUserId);
                                    const title = otherParticipant ? (otherParticipant.name || otherParticipant.username) : 'Chat';
                                    const initials = title.substring(0, 2).toUpperCase();

                                    return (
                                        <li
                                            key={conv._id}
                                            className={`conversation-item ${activeConversation?._id === conv._id ? 'active' : ''}`}
                                            onClick={() => selectConversation(conv)}
                                        >
                                            <div className="conversation-avatar">{initials}</div>
                                            <div className="conversation-details">
                                                <div className="conversation-name">{title}</div>
                                                <div className="conversation-last-message">
                                                    {conv.lastMessage?.text || 'No messages yet'}
                                                </div>
                                            </div>
                                            {conv.unreadCount > 0 && (
                                                <div className="unread-badge">{conv.unreadCount}</div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Main Chat Area */}
                    {activeConversation ? (
                        <div className="chat-main">
                            <div className="chat-header">
                                <div className="chat-header-title">
                                    {activeConversation.participants?.find(p => p._id !== devUserId)?.name || 'Conversation'}
                                </div>
                                <div className="chat-header-status">
                                    {/* Mock online status or use real presence if available */}
                                    Online
                                </div>
                            </div>

                            <div className="messages-container">
                                {messages.map((msg, idx) => {
                                    const isSentByMe = String(msg.sender) === devUserId;
                                    return (
                                        <div key={msg._id || idx} className={`message-wrapper ${isSentByMe ? 'sent' : 'received'}`}>
                                            <div className="message-bubble">{msg.text}</div>
                                            <div className="message-meta">
                                                {formatTime(msg.createdAt)}
                                                {isSentByMe && msg.readAt && (
                                                    <span className="message-read-status">✓✓</span>
                                                )}
                                                {isSentByMe && !msg.readAt && (
                                                    <span className="message-read-status" style={{ color: '#a0aabe' }}>✓</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="typing-indicator">
                                {Object.keys(typingUsers).some(k => k.startsWith(activeConversation._id)) && (
                                    'Someone is typing...'
                                )}
                            </div>

                            <div className="chat-input-area">
                                <form className="chat-input-form" onSubmit={sendMessage}>
                                    <input
                                        type="text"
                                        className="chat-input"
                                        placeholder="Type a message..."
                                        value={inputText}
                                        onChange={handleTextChange}
                                        disabled={!socket}
                                    />
                                    <button type="submit" className="btn-send" disabled={!inputText.trim() || !socket}>
                                        Send
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="chat-empty-state">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 15 }}>
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <h3>Your Messages</h3>
                            <p>Select a conversation from the sidebar to start chatting.</p>
                            {error && error.includes('BLOCKER') && renderBlockerNotice()}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
