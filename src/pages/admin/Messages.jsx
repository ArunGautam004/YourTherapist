import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
    Send, Search, Loader2, ArrowLeft, ClipboardList, Smile
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { messageAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const AdminMessages = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMsg, setSendingMsg] = useState(false);
    const messageEndRef = useRef(null);
    const activeConvoRef = useRef(null); // ✅ keep a ref to avoid stale closures

    // keep ref in sync
    useEffect(() => {
        activeConvoRef.current = activeConvo;
    }, [activeConvo]);

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    const dynamicAdminLinks = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Patients', path: '/admin/patients', icon: Users },
        { name: 'Calendar', path: '/admin/calendar', icon: Calendar },
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
        { name: 'Questionnaires', path: '/admin/questionnaires', icon: ClipboardList },
        {
            name: 'Messages',
            path: '/admin/messages',
            icon: MessageCircle,
            badge: totalUnread > 0 ? totalUnread.toString() : null
        },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
    ];

    // ── Load conversations once ──────────────────────────────────────────────
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const { data } = await messageAPI.getConversations();
                const convos = data.conversations || [];
                setConversations(convos);

                const target = location.state?.targetPartner;
                if (target) {
                    const existing = convos.find(c => c.partner?._id === target._id);
                    setActiveConvo(existing || { partner: target, lastMessage: null, unreadCount: 0 });
                } else if (convos.length > 0 && window.innerWidth >= 768) {
                    setActiveConvo(convos[0]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();
    }, []); // ✅ run once on mount — not on location.state changes to avoid re-run

    // ── Load messages when active conversation changes ───────────────────────
    useEffect(() => {
        if (!activeConvo?.partner?._id) return;
        const fetchMessages = async () => {
            try {
                const { data } = await messageAPI.getMessages(activeConvo.partner._id);
                setMessages(data.messages || []);
                setConversations(prev => prev.map(c =>
                    c.partner?._id === activeConvo.partner._id ? { ...c, unreadCount: 0 } : c
                ));
            } catch (err) {
                console.error(err);
            }
        };
        fetchMessages();
    }, [activeConvo?.partner?._id]); // ✅ only re-run when partner changes

    // ── Auto-scroll ──────────────────────────────────────────────────────────
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Real-time socket messages ────────────────────────────────────────────
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleNewMessage = (msg) => {
            const current = activeConvoRef.current;

            // Update conversation list snippet + unread count
            setConversations(prev => {
                const updated = prev.map(c => {
                    if (c.partner?._id === msg.sender || c.partner?._id === msg.receiver) {
                        const isPartnerSending = c.partner?._id === msg.sender;
                        const isCurrentlyActive = current?.partner?._id === c.partner?._id;
                        const unreadInc = isPartnerSending && !isCurrentlyActive ? 1 : 0;
                        return { ...c, unreadCount: (c.unreadCount || 0) + unreadInc, lastMessage: msg };
                    }
                    return c;
                });

                // If partner doesn't exist in conversation list yet, add them
                const partnerId = msg.sender === user?._id ? msg.receiver : msg.sender;
                const exists = updated.some(c => c.partner?._id === partnerId);
                if (!exists) {
                    // We can't fully hydrate but we can add a placeholder
                    return updated;
                }
                return updated;
            });

            // ✅ KEY FIX: Only add incoming messages to the chat window.
            // Messages sent by the current user are added optimistically in handleSend.
            // This prevents duplicates from socket echo.
            if (current && (String(msg.sender) === String(current.partner?._id) || String(msg.receiver) === String(current.partner?._id))) {
                const myId = String(user?._id || user?.id || '');
                const isOwnMessage = myId && (String(msg.sender) === myId || String(msg.sender?._id) === myId);
                if (!isOwnMessage) {
                    setMessages(prev => {
                        // Deduplicate by _id (string compare) or by sender+text+time window (2s)
                        const isDupe = prev.some(m => {
                            if (m._id && msg._id && String(m._id) === String(msg._id)) return true;
                            if (!msg._id && m.text === msg.text && String(m.sender) === String(msg.sender)) {
                                return Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 2000;
                            }
                            return false;
                        });
                        if (isDupe) return prev;
                        return [...prev, msg];
                    });
                    messageAPI.markAsRead(current.partner._id).catch(() => {});
                }
            }
        };

        socket.on('message:receive', handleNewMessage);
        return () => socket.off('message:receive', handleNewMessage);
    }, [user?._id]); // ✅ stable dependency — user._id never changes during session

    // ── Send message ─────────────────────────────────────────────────────────
    const handleSend = async (e) => {
        e?.preventDefault();
        const text = newMessage.trim();
        if (!text || !activeConvo) return;

        setNewMessage('');
        setSendingMsg(true);

        // Optimistic message
        const optimistic = {
            _id: `optimistic-${Date.now()}`,
            sender: user?._id,
            receiver: activeConvo.partner?._id,
            text,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);

        try {
            const { data } = await messageAPI.send({
                receiverId: activeConvo.partner?._id,
                text,
            });

            // Replace optimistic with real message
            setMessages(prev => prev.map(m =>
                m._id === optimistic._id ? data.message : m
            ));

            // ✅ Real-time delivery is now handled server-side in sendMessage controller
            // No need to emit from frontend — avoids double message bug
        } catch (err) {
            console.error(err);
            // Remove optimistic on failure
            setMessages(prev => prev.filter(m => m._id !== optimistic._id));
            setNewMessage(text); // restore input
        } finally {
            setSendingMsg(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const timeStr = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Sidebar links={dynamicAdminLinks} userRole="admin" />

            <main className="lg:ml-[260px] pt-16 lg:pt-6 flex flex-col" style={{ height: '100dvh' }}>
                <div className="px-4 md:px-6 lg:px-8 py-4 lg:py-6 flex-shrink-0">
                    <h1 className="font-display text-xl md:text-2xl font-bold text-text-primary">
                        <span className="gradient-text">Patient Messages</span>
                    </h1>
                </div>

                <div className="flex-1 overflow-hidden px-4 md:px-6 lg:px-8 pb-4 lg:pb-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full max-w-5xl mx-auto">
                    <div className="card overflow-hidden h-full" style={{ minHeight: 0 }}>
                        <div className="flex h-full">
                            {/* Conversations List */}
                            <div className={`w-full md:w-80 border-r border-gray-100 flex-col ${activeConvo ? 'hidden md:flex' : 'flex'}`}>
                                <div className="p-3 border-b border-gray-100">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
                                        <input placeholder="Search patients..." className="input-field !pl-10 !py-2 text-sm" readOnly />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {loading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        </div>
                                    ) : conversations.length > 0 ? (
                                        conversations.map((convo, i) => (
                                            <div
                                                key={convo.partner?._id || i}
                                                onClick={() => setActiveConvo(convo)}
                                                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors
                                                    ${activeConvo?.partner?._id === convo?.partner?._id ? 'bg-primary-light' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-xl flex-shrink-0 overflow-hidden relative">
                                                    {convo.partner?.profilePic ? (
                                                        <img src={convo.partner.profilePic} alt={convo.partner.name} className="w-full h-full object-cover" />
                                                    ) : '👤'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-text-primary truncate">{convo.partner?.name || 'Patient'}</p>
                                                    <p className="text-xs text-text-secondary truncate">{convo.lastMessage?.text || 'Start a conversation'}</p>
                                                </div>
                                                {convo.unreadCount > 0 && (
                                                    <span className="bg-danger text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                                        {convo.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-8 text-text-secondary text-sm">No conversations yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className={`flex-1 min-w-0 flex flex-col ${!activeConvo ? 'hidden md:flex' : 'flex'}`}>
                                {activeConvo ? (
                                    <>
                                        {/* Chat Header */}
                                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setActiveConvo(null)}
                                                    className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 text-text-secondary transition-colors"
                                                >
                                                    <ArrowLeft className="w-5 h-5" />
                                                </button>
                                                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-xl overflow-hidden">
                                                    {activeConvo.partner?.profilePic ? (
                                                        <img src={activeConvo.partner.profilePic} alt={activeConvo.partner.name} className="w-full h-full object-cover" />
                                                    ) : '👤'}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-text-primary text-sm">{activeConvo.partner?.name || 'Patient'}</p>
                                                    <p className="text-xs text-success flex items-center gap-1">
                                                        <span className="w-2 h-2 bg-success rounded-full" /> Online
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Messages */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                                            {messages.map((msg, i) => {
                                                const isOwn = msg.sender === user?._id || msg.sender?._id === user?._id;
                                                const isOptimistic = String(msg._id).startsWith('optimistic-');
                                                return (
                                                    <div key={msg._id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isOwn
                                                            ? 'bg-primary text-white rounded-br-md'
                                                            : 'bg-white text-text-primary rounded-bl-md border border-gray-100'
                                                        } ${isOptimistic ? 'opacity-70' : ''}`}>
                                                            <p className="leading-relaxed break-words overflow-hidden [word-break:break-word]">{msg.text}</p>
                                                            <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-white/60' : 'text-text-secondary'}`}>
                                                                {timeStr(msg.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={messageEndRef} />
                                        </div>

                                        {/* Input */}
                                        <div className="p-3 border-t border-gray-100 bg-white flex items-end gap-2 flex-shrink-0">
                                            <textarea
                                                rows={1}
                                                value={newMessage}
                                                onChange={(e) => {
                                                    setNewMessage(e.target.value);
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                                                }}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Type a message…"
                                                className="input-field flex-1 !py-2.5 resize-none text-sm"
                                                style={{ minHeight: 40, maxHeight: 100, overflowY: 'auto' }}
                                            />
                                            <button
                                                onClick={handleSend}
                                                disabled={sendingMsg || !newMessage.trim()}
                                                className="btn-primary !p-2.5 disabled:opacity-50 flex-shrink-0 w-10 h-10 flex items-center justify-center"
                                            >
                                                {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary gap-3">
                                        <MessageCircle className="w-12 h-12 text-gray-200" />
                                        <p className="text-sm font-medium">Select a conversation to start chatting</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
                </div>
            </main>
        </div>
    );
};

export default AdminMessages;