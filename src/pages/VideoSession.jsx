import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Monitor,
  MessageSquare, ClipboardList, Users, Maximize, Minimize,
  Send, X, ChevronRight, CheckCircle2, Clock, Brain, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { appointmentAPI } from '../services/api';

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ]
};

const defaultQuestions = [
  { id: 1, text: 'How would you rate your overall mood this past week?', type: 'scale', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  { id: 2, text: 'How often have you felt nervous or anxious?', type: 'choice', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
  { id: 3, text: 'How would you describe your sleep quality?', type: 'choice', options: ['Very poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
  { id: 4, text: 'Have you been able to practice the coping techniques we discussed?', type: 'choice', options: ['Yes, regularly', 'Sometimes', 'Rarely', 'Not at all'] },
  { id: 5, text: 'Is there anything specific you would like to discuss today?', type: 'text' },
];

const VideoSession = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isInWaitingRoom, setIsInWaitingRoom] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [isDoctorPresent, setIsDoctorPresent] = useState(user?.role === 'doctor' || user?.role === 'admin');
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const showChatRef = useRef(false);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  const [questions, setQuestions] = useState(defaultQuestions);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  // WebRTC refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const pendingCandidates = useRef([]);

  // Custom waiting room check
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        // If it's a real mongo ID we can fetch, otherwise it's a test room
        if (roomId.length === 24) {
          const { data } = await appointmentAPI.getById(roomId);
          setAppointment(data);
        } else {
          setAppointment({ doctor: { name: 'Dr. Therapist' }, status: 'scheduled' });
        }
      } catch (err) {
        console.error('Failed to load appointment:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [roomId]);

  // Handle local media setup (for waiting room preview and session)
  useEffect(() => {
    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast.error('Could not access camera/microphone');
        setVideoOn(false);
        setMicOn(false);
      }
    };
    setupMedia();
    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Sync mic/video toggles with localStream tracks
  useEffect(() => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => { track.enabled = micOn; });
      localStream.current.getVideoTracks().forEach(track => { track.enabled = videoOn; });
    }
  }, [micOn, videoOn]);

  // Status check for Patient in Waiting Room
  useEffect(() => {
    if (user?.role !== 'patient' || sessionActive) return;

    const socket = getSocket();
    if (!socket) return;

    const handleRoomStatus = ({ hasDoctor }) => {
      setIsDoctorPresent(hasDoctor);
    };

    socket.emit('call:check-room', roomId);
    socket.on('call:room-status', handleRoomStatus);

    return () => {
      socket.off('call:room-status', handleRoomStatus);
    };
  }, [roomId, user, sessionActive]);

  // Main WebRTC & Socket logic when session is active
  useEffect(() => {
    if (!sessionActive || !localStream.current) return;

    const socket = getSocket();
    if (!socket) {
      toast.error('Socket not connected');
      return;
    }

    // Initialize WebRTC Peer Connection
    peerConnection.current = new RTCPeerConnection(servers);

    // Add local tracks to PC
    localStream.current.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    // Handle incoming remote tracks
    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    // Socket Event Listeners for WebRTC
    const handleCallReady = async () => {
      // Caller (Doctor/Admin) creates the offer
      if (user?.role === 'doctor' || user?.role === 'admin') {
        try {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          socket.emit('call:offer', { roomId, offer });
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      }
    };

    const handleCallOffer = async ({ offer, from }) => {
      // Patient receives offer, creates answer
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
        // Process any candidates that arrived before the description was set
        pendingCandidates.current.forEach(c => peerConnection.current.addIceCandidate(new RTCIceCandidate(c)));
        pendingCandidates.current = [];

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('call:answer', { roomId, answer });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const handleCallAnswer = async ({ answer }) => {
      // Doctor receives answer
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        pendingCandidates.current.forEach(c => peerConnection.current.addIceCandidate(new RTCIceCandidate(c)));
        pendingCandidates.current = [];
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidates.current.push(candidate);
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    const handleCallEnded = () => {
      toast('The other person left the call.', { icon: 'ℹ️' });
      navigate('/patient/dashboard');
    };

    // Chat and Questionnaire Events
    const handleRoomMessage = (msg) => {
      setChatMessages(prev => [...prev, msg]);
      if (!showChatRef.current) toast('New message in chat', { icon: '💬' });
    };

    const handleQuestionnaireReceive = (q) => {
      setQuestions(q);
      setAnswers({});
      setCurrentQuestion(0);
      setQuestionnaireSubmitted(false);
      setShowQuestionnaire(true);
      setShowChat(false);
      toast('Received a new questionnaire', { icon: '📋' });
    };

    const handleQuestionnaireResponse = (res) => {
      toast.success('Patient submitted the questionnaire!');
      // Doctor logic to view responses could go here
    };

    // Register all socket listeners
    socket.on('call:ready', () => {
      setIsDoctorPresent(true);
      handleCallReady();
    });
    socket.on('call:waiting-for-doctor', () => {
      setIsDoctorPresent(false);
    });
    socket.on('call:offer', handleCallOffer);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:ended', handleCallEnded);

    // Using a custom room message event just for the video session chat
    socket.on('room:message', handleRoomMessage);
    socket.on('questionnaire:receive', handleQuestionnaireReceive);
    socket.on('questionnaire:response', handleQuestionnaireResponse);

    // Join the room
    socket.emit('call:join-room', { roomId, role: user?.role });

    return () => {
      // Cleanup
      socket.off('call:ready', handleCallReady);
      socket.off('call:waiting-for-doctor');
      socket.off('call:offer', handleCallOffer);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:ended', handleCallEnded);
      socket.off('room:message', handleRoomMessage);
      socket.off('questionnaire:receive', handleQuestionnaireReceive);
      socket.off('questionnaire:response', handleQuestionnaireResponse);

      socket.emit('call:end', roomId);
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, [sessionActive, roomId, user, navigate]);

  // Keep local video attached if re-rendered
  useEffect(() => {
    if (localStream.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
  });

  const handleJoinSession = () => {
    setIsInWaitingRoom(false);
    setSessionActive(true);
  };

  const handleEndCall = () => {
    const socket = getSocket();
    if (socket) socket.emit('call:end', roomId);
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    navigate(user?.role === 'doctor' ? '/admin/dashboard' : '/patient/dashboard');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const msg = { sender: user?.role || 'patient', text: chatMessage.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, msg]);

    const socket = getSocket();
    if (socket) socket.emit('room:message', { roomId, message: msg });

    setChatMessage('');
  };

  const handleSendQuestionnaire = () => {
    if (user?.role === 'doctor') {
      const socket = getSocket();
      if (socket) {
        socket.emit('questionnaire:push', { roomId, questionnaire: defaultQuestions });
        toast.success('Questionnaire sent to patient');
      }
    }
  };

  const handleSubmitQuestionnaire = () => {
    setQuestionnaireSubmitted(true);
    const socket = getSocket();
    if (socket) socket.emit('questionnaire:submit', { roomId, responses: answers });

    setTimeout(() => {
      setShowQuestionnaire(false);
      setQuestionnaireSubmitted(false);
    }, 2000);
  };

  // ============ WAITING ROOM ============
  if (isInWaitingRoom) {
    if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center"
        >
          {/* Video Preview */}
          <div className="relative rounded-3xl overflow-hidden bg-gray-700 aspect-video mb-8 shadow-soft-xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
            />
            {(!videoOn) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-5xl">{user?.role === 'doctor' || user?.role === 'admin' ? '👩‍⚕️' : '👤'}</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button
                onClick={() => setMicOn(!micOn)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-danger text-white'}`}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setVideoOn(!videoOn)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${videoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-danger text-white'}`}
              >
                {videoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-white">
              Your<span className="text-primary-300">Therapist</span>
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold text-white mb-2">Waiting Room</h2>
          <p className="text-gray-400 mb-2">
            Your session with{' '}
            <span className="text-white font-medium">
              {(user?.role === 'doctor' || user?.role === 'admin')
                ? (appointment?.patient?.name || 'Patient')
                : (appointment?.doctor?.name || 'Doctor')}
            </span>
          </p>

          <div className="flex items-center justify-center gap-2 text-primary-300 mb-8">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Session scheduled for today</span>
          </div>

          <button
            onClick={handleJoinSession}
            disabled={!isDoctorPresent && user?.role === 'patient'}
            className={`font-semibold px-10 py-4 rounded-2xl transition-all duration-300 w-full sm:w-auto ${(!isDoctorPresent && user?.role === 'patient') ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-glow-lg active:scale-[0.98]'}`}
          >
            {(!isDoctorPresent && user?.role === 'patient') ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Waiting for Doctor to join...
              </span>
            ) : (
              'Join Session'
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  // ============ VIDEO SESSION ============
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex relative overflow-hidden">
        {/* Main Video (Remote) */}
        <div className="flex-1 relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {!remoteVideoRef.current?.srcObject && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-white font-display font-medium">Waiting for other participant...</p>
              </div>
            </div>
          )}

          {/* Self Video (Picture-in-Picture) */}
          <div className="absolute bottom-4 right-4 w-48 h-36 rounded-2xl bg-gray-700 overflow-hidden shadow-soft-xl border-2 border-gray-600">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] transition-opacity ${videoOn ? 'opacity-100' : 'opacity-0'}`}
            />
            {!videoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl">{user?.role === 'doctor' ? '👩‍⚕️' : '👤'}</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">You</div>
          </div>

          {/* Session Timer */}
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm z-10">
            <div className="w-2 h-2 bg-danger rounded-full animate-pulse" />
            <span className="font-medium">Live</span>
          </div>

          <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-medium z-10">
            🔒 Encrypted
          </div>
        </div>

        {/* Side Panel */}
        <AnimatePresence>
          {(showChat || showQuestionnaire) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="h-full bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden shrink-0"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  {showChat ? <MessageSquare className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                  {showChat ? 'Session Chat' : 'Questionnaire'}
                </h3>
                <button onClick={() => { setShowChat(false); setShowQuestionnaire(false); }} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              {showChat && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((msg, i) => {
                      const isOwn = msg.sender === user?.role;
                      return (
                        <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${isOwn ? 'bg-primary text-white rounded-br-md' : 'bg-gray-700 text-gray-200 rounded-bl-md'}`}>
                            <p>{msg.text}</p>
                            <p className={`text-xs mt-1 ${isOwn ? 'text-white/50' : 'text-gray-500'}`}>{msg.time}</p>
                          </div>
                        </div>
                      );
                    })}
                    {chatMessages.length === 0 && <p className="text-center text-gray-500 text-sm mt-4">No messages yet</p>}
                  </div>
                  <div className="p-3 border-t border-gray-700">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-700 text-white placeholder:text-gray-500 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button type="submit" disabled={!chatMessage.trim()} className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50">
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              )}

              {/* Questionnaire */}
              {showQuestionnaire && (
                <div className="flex-1 overflow-y-auto p-4">
                  {user?.role === 'doctor' ? (
                    <div className="text-center mt-10 space-y-4">
                      <ClipboardList className="w-12 h-12 text-primary mx-auto opacity-80" />
                      <h4 className="text-white font-medium text-lg">Send Check-in Survey</h4>
                      <p className="text-gray-400 text-sm mb-6">Send the standard mood and anxiety questionnaire to the patient.</p>
                      <button onClick={handleSendQuestionnaire} className="btn-primary w-full">Send to Patient</button>
                    </div>
                  ) : questionnaireSubmitted ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8 text-success" /></div>
                      <h4 className="text-white font-bold text-lg mb-2">Submitted!</h4>
                      <p className="text-gray-400 text-sm">Your responses have been recorded by your doctor.</p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">Question {currentQuestion + 1} of {questions.length}</span>
                          <span className="text-xs text-primary-300">{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-primary to-secondary rounded-full h-1.5 transition-all duration-300" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} />
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        <motion.div key={currentQuestion} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                          <p className="text-white font-medium mb-4 leading-relaxed">{questions[currentQuestion].text}</p>

                          {questions[currentQuestion].type === 'scale' && (
                            <div className="flex flex-wrap gap-2">
                              {questions[currentQuestion].options.map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => setAnswers({ ...answers, [questions[currentQuestion].id]: opt })}
                                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${answers[questions[currentQuestion].id] === opt ? 'bg-primary text-white shadow-glow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {questions[currentQuestion].type === 'choice' && (
                            <div className="space-y-2">
                              {questions[currentQuestion].options.map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => setAnswers({ ...answers, [questions[currentQuestion].id]: opt })}
                                  className={`w-full p-3 rounded-xl text-sm text-left transition-all ${answers[questions[currentQuestion].id] === opt ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {questions[currentQuestion].type === 'text' && (
                            <textarea
                              value={answers[questions[currentQuestion].id] || ''}
                              onChange={(e) => setAnswers({ ...answers, [questions[currentQuestion].id]: e.target.value })}
                              placeholder="Type your answer..."
                              rows={4}
                              className="w-full bg-gray-700 text-white placeholder:text-gray-500 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>

                      <div className="flex items-center justify-between mt-6">
                        <button onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors">Previous</button>
                        {currentQuestion < questions.length - 1 ? (
                          <button onClick={() => setCurrentQuestion(currentQuestion + 1)} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
                        ) : (
                          <button onClick={handleSubmitQuestionnaire} className="px-5 py-2.5 rounded-xl bg-success text-white text-sm font-medium hover:bg-success/80 transition-colors flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Submit</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-gray-800/50 backdrop-blur-xl border-t border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <button onClick={() => setMicOn(!micOn)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${micOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-danger text-white'}`} title={micOn ? 'Mute' : 'Unmute'}>
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button onClick={() => setVideoOn(!videoOn)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${videoOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-danger text-white'}`} title={videoOn ? 'Turn off camera' : 'Turn on camera'}>
              {videoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button className="w-12 h-12 rounded-2xl bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center transition-all hidden sm:flex" title="Share screen">
              <Monitor className="w-5 h-5" />
            </button>
          </div>

          {/* End Call */}
          <button onClick={handleEndCall} className="w-14 h-14 rounded-2xl bg-danger text-white hover:bg-red-600 flex items-center justify-center transition-all shadow-soft-lg hover:shadow-soft-xl" title="End session">
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowChat(!showChat); setShowQuestionnaire(false); }} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${showChat ? 'bg-primary text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`} title="Chat">
              <MessageSquare className="w-5 h-5" />
            </button>
            <button onClick={() => { setShowQuestionnaire(!showQuestionnaire); setShowChat(false); }} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${showQuestionnaire ? 'bg-primary text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`} title="Questionnaire">
              <ClipboardList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoSession;
