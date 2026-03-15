import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
    Send, Search, Loader2, ArrowLeft, Clock
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { messageAPI, doctorAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const patientLinks = [
    { name: 'Dashboard',        path: '/patient/dashboard', icon: LayoutDashboard },
    { name: 'My Sessions',      path: '/patient/sessions',  icon: Clock },
    { name: 'Book Appointment', path: '/patient/book',      icon: Calendar },
    { name: 'Mood Journal',     path: '/patient/journal',   icon: BookOpen },
    { name: 'Messages',         path: '/patient/messages',  icon: MessageCircle },
    { name: 'Settings',         path: '/patient/settings',  icon: Settings },
];

const timeStr = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const PatientMessages = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMsg, setSendingMsg] = useState(false);
    const messageEndRef = useRef(null);
    const activeConvoRef = useRef(null);
    const [helpDeskDoctorId, setHelpDeskDoctorId] = useState(null);

    useEffect(() => {
        activeConvoRef.current = activeConvo;
    }, [activeConvo]);

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    // Update sidebar badge
    const sidebarLinks = patientLinks.map(l =>
        l.name === 'Messages'
            ? { ...l, badge: totalUnread > 0 ? totalUnread.toString() : null }
            : l
    );

    // Permanent Help & Support conversation entry
    const HELP_DESK = {
        _id: 'help-desk',
        partner: {
            _id: 'help-desk',
            name: 'Help & Support',
            email: 'doctor@yourtherapist.com',
            profilePic: null,
            isHelpDesk: true,
        },
        lastMessage: { text: 'How can we help you today?' },
        unreadCount: 0,
        pinned: true,
    };

    // ── Fetch the real doctor account ID for help desk ─────────────────────────
    useEffect(() => {
        doctorAPI.getAll()
            .then(({ data }) => {
                const doctor = (data.doctors || [])[0];
                if (doctor?._id) setHelpDeskDoctorId(doctor._id);
            }).catch(() => {});
    }, []);

    // ── Load conversations once ──────────────────────────────────────────────
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const { data } = await messageAPI.getConversations();
                const convos = data.conversations || [];

                // Inject help desk at top if not already in real conversations
                const hasRealHelpDesk = convos.some(c =>
                    c.partner?.email === 'doctor@yourtherapist.com'
                );
                const allConvos = hasRealHelpDesk ? convos : [HELP_DESK, ...convos];
                setConversations(allConvos);

                // Auto-open if navigated with a target partner
                const target = location.state?.targetPartner;
                if (target) {
                    const existing = allConvos.find(c => c.partner?._id === target._id);
                    setActiveConvo(existing || { partner: target, lastMessage: null, unreadCount: 0 });
                } else if (window.innerWidth >= 768) {
                    setActiveConvo(allConvos[0]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();
    }, []);

    // ── Load messages when active conversation changes ───────────────────────
    useEffect(() => {
        if (!activeConvo?.partner?._id) return;

        // Help desk: show a static welcome message, no API call
        if (activeConvo.partner._id === 'help-desk') {
            setMessages([{
                _id: 'hd-welcome',
                sender: 'help-desk',
                text: `👋 Welcome to Help & Support!

You can reach us any time at doctor@yourtherapist.com

Type your question below and we will get back to you as soon as possible.`,
                createdAt: new Date().toISOString(),
            }]);
            return;
        }

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
    }, [activeConvo?.partner?._id, helpDeskDoctorId]);

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

            setConversations(prev => prev.map(c => {
                if (c.partner?._id === msg.sender || c.partner?._id === msg.receiver) {
                    const isPartnerSending = c.partner?._id === msg.sender;
                    const isCurrentlyActive = current?.partner?._id === c.partner?._id;
                    const unreadInc = isPartnerSending && !isCurrentlyActive ? 1 : 0;
                    return { ...c, unreadCount: (c.unreadCount || 0) + unreadInc, lastMessage: msg };
                }
                return c;
            }));

            if (current && (msg.sender === current.partner?._id || msg.receiver === current.partner?._id)) {
                const isOwnMessage = msg.sender === user?._id || msg.sender?._id === user?._id;
                if (!isOwnMessage) {
                    setMessages(prev => {
                        if (prev.some(m => m._id && m._id === msg._id)) return prev;
                        return [...prev, msg];
                    });
                    messageAPI.markAsRead(current.partner._id).catch(() => {});
                }
            }
        };

        socket.on('message:receive', handleNewMessage);
        return () => socket.off('message:receive', handleNewMessage);
    }, [user?._id]);

    // ── Send message ─────────────────────────────────────────────────────────
    const handleSend = async (e) => {
        e?.preventDefault();
        const text = newMessage.trim();
        if (!text || !activeConvo) return;

        setNewMessage('');
        setSendingMsg(true);

        // Help desk: send as a real message to the doctor account
        if (activeConvo.partner?._id === 'help-desk') {
            if (!helpDeskDoctorId) {
                toast ? toast.error('Help desk unavailable right now') : null;
                setSendingMsg(false);
                return;
            }
            // Add optimistic message immediately
            const optimisticHd = {
                _id: `hd-opt-${Date.now()}`,
                sender: user?._id,
                receiver: helpDeskDoctorId,
                text,
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, optimisticHd]);
            try {
                const { data } = await messageAPI.send({ receiverId: helpDeskDoctorId, text });
                // Replace optimistic with real message
                setMessages(prev => prev.map(m => m._id === optimisticHd._id ? data.message : m));
                // Also update the help desk conversation snippet
                setConversations(prev => prev.map(c =>
                    c._id === 'help-desk' ? { ...c, lastMessage: { text } } : c
                ));
                // Real-time delivery to doctor
                const socket = getSocket();
                if (socket) {
                    socket.emit('message:send', {
                        senderId: user?._id,
                        receiverId: helpDeskDoctorId,
                        text,
                        senderName: user?.name,
                    });
                }
            } catch (err) {
                console.error(err);
                setMessages(prev => prev.filter(m => m._id !== optimisticHd._id));
                setNewMessage(text);
            } finally {
                setSendingMsg(false);
            }
            return;
        }

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

            setMessages(prev => prev.map(m =>
                m._id === optimistic._id ? data.message : m
            ));

            const socket = getSocket();
            if (socket) {
                socket.emit('message:send', {
                    senderId: user?._id,
                    receiverId: activeConvo.partner?._id,
                    text,
                    senderName: user?.name,
                });
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => prev.filter(m => m._id !== optimistic._id));
            setNewMessage(text);
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

    return (
        <div className="min-h-screen bg-background">
            <Sidebar links={sidebarLinks} userRole="patient" />

            <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                        <span className="gradient-text">Messages</span>
                    </h1>

                    <div className="card overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
                        <div className="flex h-full">
                            {/* Conversations List */}
                            <div className={`w-full md:w-72 border-r border-gray-100 flex-col ${activeConvo ? 'hidden md:flex' : 'flex'}`}>
                                <div className="p-3 border-b border-gray-100">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
                                        <input placeholder="Search messages..." className="input-field !pl-10 !py-2 text-sm" readOnly />
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
                                                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                                                    {convo.partner?.profilePic ? (
                                                        <img src={convo.partner.profilePic} alt={convo.partner.name} className="w-full h-full object-cover" />
                                                    ) : '👨‍⚕️'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-text-primary truncate">
                                                        {convo.partner?.name
                                                            ? (convo.partner.name.toLowerCase().startsWith('dr')
                                                                ? convo.partner.name
                                                                : `Dr. ${convo.partner.name}`)
                                                            : 'Help & Support'}
                                                    </p>
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
                                        <div className="flex flex-col items-center justify-center py-12 text-text-secondary text-sm px-4 text-center">
                                            <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
                                            <p>No messages yet.</p>
                                            <p className="text-xs mt-1 text-text-secondary/70">Book a session to start chatting with your therapist.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className={`flex-1 flex-col ${!activeConvo ? 'hidden md:flex' : 'flex'}`}>
                                {activeConvo ? (
                                    <>
                                        {/* Chat Header */}
                                        <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
                                            <button
                                                onClick={() => setActiveConvo(null)}
                                                className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 text-text-secondary transition-colors"
                                            >
                                                <ArrowLeft className="w-5 h-5" />
                                            </button>
                                            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-xl overflow-hidden">
                                                {activeConvo.partner?.profilePic ? (
                                                    <img src={activeConvo.partner.profilePic} alt={activeConvo.partner.name} className="w-full h-full object-cover" />
                                                ) : '👨‍⚕️'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-text-primary text-sm">
                                                    {activeConvo.partner?.name
                                                        ? (activeConvo.partner.name.toLowerCase().startsWith('dr')
                                                            ? activeConvo.partner.name
                                                            : `Dr. ${activeConvo.partner.name}`)
                                                        : 'Help & Support'}
                                                </p>
                                                <p className="text-xs text-success flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-success rounded-full inline-block" /> Online
                                                </p>
                                            </div>
                                        </div>

                                        {/* Messages */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                                            {messages.map((msg, i) => {
                                                const isOwn = msg.sender === user?._id || msg.sender?._id === user?._id;
                                                const isOptimistic = String(msg._id).startsWith('optimistic-');
                                                return (
                                                    <div key={msg._id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-sm shadow-sm whitespace-pre-line ${isOwn
                                                            ? 'bg-primary text-white rounded-br-md'
                                                            : 'bg-white text-text-primary rounded-bl-md border border-gray-100'
                                                        } ${isOptimistic ? 'opacity-70' : ''}`}>
                                                            <p className="leading-relaxed break-words">{msg.text}</p>
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
                                        <div className="p-3 border-t border-gray-100 bg-white flex items-end gap-2">
                                            <textarea
                                                rows={1}
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Type a message… (Enter to send)"
                                                className="input-field flex-1 !py-2.5 resize-none"
                                                style={{ maxHeight: 120, overflowY: 'auto' }}
                                            />
                                            <button
                                                onClick={handleSend}
                                                disabled={sendingMsg || !newMessage.trim()}
                                                className="btn-primary !p-2.5 disabled:opacity-50 flex-shrink-0"
                                            >
                                                {sendingMsg ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
            </main>
        </div>
    );
};

export default PatientMessages;