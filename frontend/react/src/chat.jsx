import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import '../../css/index.css';
import './styles/chat.css';
import { useTheme, useScrollHide } from './useNavbarBehavior';
import Navbar from './components/Navbar';
import { apiRequest, API_URL } from './services/api';

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

    // ── Current user identity ──────────────────────────────────────────────────
    const currentUserId = currentUser ? String(currentUser._id || currentUser.id) : '';

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
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
            setError('Authentication required. Please log in to access chat.');
            setLoading(false);
            return;
        }

        setIsLoggedIn(true);
        try {
            setCurrentUser(JSON.parse(storedUser));
        } catch (_e) {}

        const fetchConversations = async () => {
            try {
                const { data: responseData } = await apiRequest('/api/chat/conversations');
                if (responseData?.success) {
                    setConversations(responseData.data);
                } else {
                    setError(responseData?.message || 'Failed to load conversations.');
                }
            } catch (err) {
                if (err.name === 'TypeError' && err.message.includes('fetch')) {
                    setError('Cannot reach the server. Please try again.');
                } else if (err.status === 401) {
                    setError('Authentication required. Please log in to access chat.');
                } else {
                    setError(err.message || 'Failed to load conversations.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();

        // Wallet legacy script fallback
        window.__DISABLE_LEGACY_NAVBAR_SCROLL__ = true;
        if (!document.getElementById('legacy-navbar-script')) {
            const script = document.createElement('script');
            script.id  = 'legacy-navbar-script';
            script.src = '../../js/navbar-scroll.js';
            document.body.appendChild(script);
        }
    }, [currentUserId]);

    // ── Socket initialization ─────────────────────────────────────────────────

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Connect to Socket.IO using JWT authentication
        const newSocket = io(API_URL, {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Chat socket connected:', newSocket.id);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });

        // Incoming message
        newSocket.on('message', (payload) => {
            setMessages(prev => {
                // Deduplicate by _id to prevent double-rendering when
                // the sender receives their own emitted message
                if (payload._id && prev.some(m => m._id === payload._id)) {
                    return prev;
                }
                return [...prev, payload];
            });

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
    }, [currentUserId, activeConversation]);

    // Scroll to bottom on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ── Conversation selection ────────────────────────────────────────────────

    const selectConversation = async (conv) => {
        setActiveConversation(conv);
        setMessages([]); // clear while loading

        try {
            const { data: responseData } = await apiRequest(`/api/chat/conversations/${conv._id}/messages`);
            if (responseData?.success) {
                setMessages(responseData.data);
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
                <Navbar />

                {/* ── Main Chat Layout ── */}
                <div className="chat-container">

                    {/* Sidebar */}
                    <div className="chat-sidebar">
                        <div className="chat-sidebar-header">Messages</div>

                        {loading ? (
                            <div style={{ padding: 20, color: '#a0aabe' }}>Loading conversations...</div>
                        ) : error ? (
                            <div style={{ padding: 20 }}>
                                <span style={{ color: '#ef4444' }}>{error}</span>
                            </div>
                        ) : conversations.length === 0 ? (
                            <div style={{ padding: 20, color: '#a0aabe' }}>No conversations yet.</div>
                        ) : (
                            <ul className="conversation-list">
                                {conversations.map(conv => {
                                    // Determine the "other" participant name for display
                                    const otherParticipant = conv.participants?.find(p => String(p._id) !== currentUserId);
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
                                    {activeConversation.participants?.find(p => String(p._id) !== currentUserId)?.name || 'Conversation'}
                                </div>
                                <div className="chat-header-status">
                                    {/* Mock online status or use real presence if available */}
                                    Online
                                </div>
                            </div>

                            <div className="messages-container">
                                {messages.map((msg, idx) => {
                                    const isSentByMe = String(msg.sender) === currentUserId;
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
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
