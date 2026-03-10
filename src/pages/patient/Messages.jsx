import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
  Send, Phone, Video, Search, Loader2, ArrowLeft, Clock
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { messageAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const patientLinks = [
  { name: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
  { name: 'My Sessions', path: '/patient/sessions', icon: Clock },
  { name: 'Book Appointment', path: '/patient/book', icon: Calendar },
  { name: 'Mood Journal', path: '/patient/journal', icon: BookOpen },
  { name: 'Messages', path: '/patient/messages', icon: MessageCircle },
  { name: 'Settings', path: '/patient/settings', icon: Settings },
];

const PatientMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const messageEndRef = useRef(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await messageAPI.getConversations();
        setConversations(data.conversations || []);
        if (data.conversations?.length > 0) {
          setActiveConvo(data.conversations[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!activeConvo?.partner?._id) return;
    const fetchMessages = async () => {
      try {
        const { data } = await messageAPI.getMessages(activeConvo.partner._id);
        setMessages(data.messages || []);

        // Clear unread count for the active conversation locally
        setConversations(prev => prev.map(c =>
          c.partner._id === activeConvo.partner._id ? { ...c, unreadCount: 0 } : c
        ));
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [activeConvo]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for real-time messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setConversations(prev => prev.map(c => {
        // If the message is from/to a partner in our active conversations list, update the snippet
        if (c.partner?._id === msg.sender || c.partner?._id === msg.receiver) {
          const isFromPartner = c.partner?._id === msg.sender;
          const isActive = activeConvo && c.partner?._id === activeConvo.partner._id;

          let unreadInc = 0;
          if (isFromPartner && !isActive) unreadInc = 1;

          return { ...c, unreadCount: (c.unreadCount || 0) + unreadInc, lastMessage: msg };
        }
        return c;
      }));

      if (activeConvo && (msg.sender === activeConvo.partner._id || msg.receiver === activeConvo.partner._id)) {
        setMessages(prev => [...prev, msg]);

        // If we received this while active in the chat, mark it as read immediately in the backend
        if (msg.sender === activeConvo.partner._id) {
          messageAPI.markAsRead(activeConvo.partner._id).catch(() => { });
        }
      }
    };

    socket.on('message:receive', handleNewMessage);
    return () => socket.off('message:receive', handleNewMessage);
  }, [activeConvo]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo) return;

    setSendingMsg(true);
    try {
      const { data } = await messageAPI.send({
        receiverId: activeConvo.partner._id,
        text: newMessage.trim(),
      });
      setMessages(prev => [...prev, data.message]);
      setNewMessage('');

      // Also emit via socket for real-time
      const socket = getSocket();
      if (socket) {
        socket.emit('message:send', {
          senderId: user._id,
          receiverId: activeConvo.partner._id,
          text: newMessage.trim(),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar links={patientLinks} userRole="patient" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
            <span className="gradient-text">Messages</span>
          </h1>

          <div className="card overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
            <div className="flex h-full">
              {/* Conversations List */}
              <div className={`w-full md:w-80 border-r border-gray-100 flex-col ${activeConvo ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
                    <input placeholder="Search..." className="input-field !pl-10 !py-2 text-sm" />
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
                          ${activeConvo?.partner?._id === convo.partner?._id ? 'bg-primary-light' : 'hover:bg-gray-50'}`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                          {convo.partner?.profilePic ? (
                            <img src={convo.partner.profilePic} alt={convo.partner.name} className="w-full h-full object-cover" />
                          ) : (
                            convo.partner?.role === 'doctor' ? '👩‍⚕️' : '👤'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{convo.partner?.name}</p>
                          <p className="text-xs text-text-secondary truncate">{convo.lastMessage?.text || 'Start a conversation'}</p>
                        </div>
                        {convo.unreadCount > 0 && (
                          <span className="bg-danger text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{convo.unreadCount}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-text-secondary text-sm">No conversations yet</p>
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className={`flex-1 flex-col ${!activeConvo ? 'hidden md:flex' : 'flex'}`}>
                {activeConvo ? (
                  <>
                    {/* Chat Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
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
                          ) : (
                            activeConvo.partner?.role === 'doctor' ? '👩‍⚕️' : '👤'
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary text-sm">{activeConvo.partner?.name}</p>
                          <p className="text-xs text-success flex items-center gap-1">
                            <span className="w-2 h-2 bg-success rounded-full" /> Online
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.map((msg, i) => {
                        const isOwn = msg.sender === user?._id || msg.sender?._id === user?._id;
                        return (
                          <div key={msg._id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${isOwn
                              ? 'bg-primary text-white rounded-br-md'
                              : 'bg-gray-100 text-text-primary rounded-bl-md'
                              }`}>
                              <p>{msg.text}</p>
                              <p className={`text-xs mt-1 ${isOwn ? 'text-white/50' : 'text-text-secondary'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messageEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex items-center gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="input-field flex-1 !py-2.5"
                      />
                      <button type="submit" disabled={sendingMsg || !newMessage.trim()} className="btn-primary !p-2.5 disabled:opacity-50">
                        {sendingMsg ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
                    Select a conversation to start chatting
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
