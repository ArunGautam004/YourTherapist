import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Monitor,
  MessageSquare, ClipboardList, Maximize, Minimize,
  Send, X, ChevronRight, CheckCircle2, Clock, Brain, Loader2, User, Stethoscope,
  FileText, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { appointmentAPI, sessionAPI } from '../services/api';

const buildRtcConfig = () => {
  const defaultStunUrls = [
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302',
    'stun:stun4.l.google.com:19302',
  ];

  const stunUrls = (import.meta.env.VITE_STUN_URLS || defaultStunUrls.join(','))
    .split(',')
    .map(url => url.trim())
    .filter(Boolean);

  const turnUsername = import.meta.env.VITE_TURN_USERNAME || '';
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL || '';
  const iceTransportPolicy = (import.meta.env.VITE_ICE_TRANSPORT_POLICY || 'all').toLowerCase();

  // Comprehensive TURN servers with multiple ports and protocols for maximum compatibility
  const iceServers = [
    { urls: stunUrls },
    {
      urls: 'stun:stun.relay.metered.ca:80',
    },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: turnUsername,
      credential: turnCredential,
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: turnUsername,
      credential: turnCredential,
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: turnUsername,
      credential: turnCredential,
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: turnUsername,
      credential: turnCredential,
    },
  ];

  const hasTurn = !!turnUsername && !!turnCredential;
  if (hasTurn) {
    console.log('[WebRTC] TURN servers configured with multiple ports and protocols');
  } else {
    console.warn('[WebRTC] TURN credentials not configured. Video may fail between different networks.');
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    iceTransportPolicy: iceTransportPolicy === 'relay' ? 'relay' : 'all',
    hasTurn,
  };
};

const rtcSetup = buildRtcConfig();
const rtcConfig = {
  iceServers: rtcSetup.iceServers,
  iceCandidatePoolSize: rtcSetup.iceCandidatePoolSize,
  iceTransportPolicy: rtcSetup.iceTransportPolicy,
};

// Avatar shown when camera is off or while connecting
const ParticipantAvatar = ({ name, role, profilePic, size = 'large' }) => {
  const isDoctor = role === 'doctor' || role === 'admin';
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (isDoctor ? 'DR' : 'PT');

  const large = size === 'large';
  return (
    <div className={`flex flex-col items-center gap-3`}>
      <div className={`${large ? 'w-28 h-28' : 'w-12 h-12'} rounded-full bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center shadow-lg border-2 border-white/20 overflow-hidden`}>
        {profilePic ? (
          <img src={profilePic} alt={name || 'Participant'} className="w-full h-full object-cover" />
        ) : (
          <span className={`${large ? 'text-4xl' : 'text-lg'} font-bold text-white font-display`}>{initials}</span>
        )}
      </div>
      {name && <span className={`text-white font-medium ${large ? 'text-lg' : 'text-xs'} bg-black/30 px-3 py-1 rounded-full`}>{isDoctor && !name.toLowerCase().startsWith('dr') ? `Dr. ${name}` : name}</span>}
      {!name && <span className={`text-gray-300 ${large ? 'text-base' : 'text-xs'}`}>{isDoctor ? 'Doctor' : 'Patient'}</span>}
    </div>
  );
};

const VideoSession = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isInWaitingRoom, setIsInWaitingRoom] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [remoteParticipant, setRemoteParticipant] = useState(null);
  const [isRemoteVideoActive, setIsRemoteVideoActive] = useState(false);
  const [isRemoteConnected, setIsRemoteConnected] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteId, setNoteId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const showChatRef = useRef(false);
  useEffect(() => {
    showChatRef.current = showChat;
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const chatBottomRef = useRef(null);

  // Questionnaire states
  const [diseases, setDiseases] = useState([]);
  const [selectedDisease, setSelectedDisease] = useState('');
  const [diseaseTemplates, setDiseaseTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Patient-side questionnaire
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  // Session description (doctor)
  const [sessionDescription, setSessionDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [noteSaves, setNoteSaves] = useState([]); // history of saves shown to doctor

  // Refs to avoid stale closures in socket handlers
  const appointmentRef = useRef(null);
  const activeTemplateIdRef = useRef(null);

  // ✅ FIX: appointment state declared BEFORE the auto-save useEffect that references it
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep ref in sync so socket handlers always have latest appointment
  useEffect(() => {
    appointmentRef.current = appointment;
  }, [appointment]);

  // Always signal on canonical meeting UUID room if appointment is loaded.
  // This prevents doctor/patient ending up in different socket rooms when one opens /session/<appointmentId>.
  const signalRoomId = appointment?.meetingLink?.startsWith('/session/')
    ? appointment.meetingLink.replace('/session/', '')
    : roomId;

  // Auto-save session notes when description changes (doctor only)
  useEffect(() => {
    const isDoc = user?.role === 'doctor' || user?.role === 'admin';
    if (!isDoc || !appointment?._id) return;
    if (!sessionDescription.trim() && !noteId) return;

    const timer = setTimeout(async () => {
      setSavingDescription(true);
      try {
        if (!noteId) {
          const { data } = await sessionAPI.createNote({
            appointment: appointment._id,
            patient: appointment.patient?._id || appointment.patient,
            sessionDescription: sessionDescription.trim(),
            isSharedWithPatient: true,
          });
          setNoteId(data.note._id);
        } else {
          await sessionAPI.updateNote(noteId, {
            sessionDescription: sessionDescription.trim(),
          });
        }
        // Record save in history
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setNoteSaves(prev => [{ time: now, preview: sessionDescription.trim().slice(0, 60) }, ...prev].slice(0, 5));
      } catch (err) {
        console.error('Failed to auto-save note:', err);
        toast.error('Note failed to save');
      } finally {
        setSavingDescription(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [sessionDescription, appointment, noteId, user]);

  // WebRTC refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const pendingCandidates = useRef([]);
  const isOfferSent = useRef(false);
  const didRetryIce = useRef(false);

  // Screen Share state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Fetch appointment info
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        if (roomId) {
          // roomId could be a 24-char MongoDB ObjectId or a UUID from meetingLink
          let data;
          if (roomId.length === 24 && /^[a-f0-9]{24}$/i.test(roomId)) {
            // MongoDB ObjectId — fetch by ID
            const res = await appointmentAPI.getById(roomId);
            data = res.data.appointment || res.data;
          } else {
            // UUID from meetingLink — fetch by link
            const res = await appointmentAPI.getByMeetingLink(roomId);
            data = res.data.appointment || res.data;
          }
          setAppointment(data);
        } else {
          setAppointment({ doctor: { name: 'Dr. Therapist' }, patient: { name: 'Patient' }, status: 'scheduled' });
        }
      } catch (err) {
        console.error('Failed to load appointment:', err);
        setAppointment({ doctor: { name: 'Doctor' }, patient: { name: 'Patient' }, status: 'scheduled' });
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [roomId]);

  // Fetch disease list for doctor
  useEffect(() => {
    const isDoc = user?.role === 'doctor' || user?.role === 'admin';
    if (isDoc) {
      sessionAPI.getDiseases().then(({ data }) => {
        setDiseases(data.diseases || []);
      }).catch(() => { });
    }
  }, [user]);

  // Fetch templates when disease selected
  useEffect(() => {
    if (!selectedDisease) {
      setDiseaseTemplates([]);
      setSelectedTemplate(null);
      return;
    }
    setLoadingTemplates(true);
    sessionAPI.getByDisease(selectedDisease).then(({ data }) => {
      setDiseaseTemplates(data.templates || []);
    }).catch(() => {
      setDiseaseTemplates([]);
    }).finally(() => setLoadingTemplates(false));
  }, [selectedDisease]);

  // Local media
  useEffect(() => {
    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Media error:', err);
        toast.error('Could not access camera/microphone');
        setVideoOn(false);
        setMicOn(false);
      }
    };
    setupMedia();
    return () => {
      localStream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Sync mic/video toggles
  useEffect(() => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(t => { t.enabled = micOn; });
      localStream.current.getVideoTracks().forEach(t => { t.enabled = videoOn; });
    }
  }, [micOn, videoOn]);

  // Keep local video attached
  useEffect(() => {
    if (localStream.current && localVideoRef.current && !localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = localStream.current;
    }
  });

  // ─── Main WebRTC + Socket Logic ──────────────────────────────────────────
  useEffect(() => {
    if (!sessionActive) return;
    if (!signalRoomId) return;

    const socket = getSocket();
    if (!socket) {
      toast.error('Socket not connected. Please refresh.');
      return;
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;
    isOfferSent.current = false;
    didRetryIce.current = false;

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        console.log('[WebRTC] Adding local track to peer connection:', track.kind);
        pc.addTrack(track, localStream.current);
      });
    } else {
      console.warn('[WebRTC] Local stream not available');
    }

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        console.log('[WebRTC] Attaching remote stream to video element');
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsRemoteVideoActive(true);
      } else {
        console.warn('[WebRTC] Remote video ref or stream missing:', { ref: !!remoteVideoRef.current, stream: !!event.streams[0] });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice-candidate', { roomId: signalRoomId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        console.log('[WebRTC] Peer connection established!');
        setIsRemoteVideoActive(true);
        didRetryIce.current = false;
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        console.warn('[WebRTC] Connection lost:', pc.connectionState);
        setIsRemoteVideoActive(false);
      }
    };

    pc.oniceconnectionstatechange = async () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('[WebRTC] ICE connection established!');
      }
      
      if (pc.iceConnectionState === 'failed' && !rtcSetup.hasTurn) {
        toast.error('Video connection failed: TURN server unavailable.');
      }

      if (pc.iceConnectionState !== 'failed' || didRetryIce.current) return;
      const isDoctor = user?.role === 'doctor' || user?.role === 'admin';
      if (!isDoctor) return;

      didRetryIce.current = true;
      try {
        console.log('[WebRTC] Restarting ICE...');
        const restartOffer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(restartOffer);
        socket.emit('call:offer', { roomId: signalRoomId, offer: restartOffer });
      } catch (err) {
        console.warn('[WebRTC] ICE restart failed:', err);
      }
    };

    const handleCallReady = async ({ participants }) => {
      if (participants) {
        const remote = participants.find(p => p.userId !== user?._id && p.userId !== user?.id);
        if (remote) setRemoteParticipant({ name: remote.name, role: remote.role });
      }
      setIsRemoteConnected(true);

      const isDoctor = user?.role === 'doctor' || user?.role === 'admin';
      if (isDoctor && !isOfferSent.current) {
        isOfferSent.current = true;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:offer', { roomId: signalRoomId, offer });
        } catch (err) {
          console.error('[WebRTC] Error creating offer:', err);
        }
      }
    };

    const handleUserJoined = ({ participant }) => {
      if (participant && participant.userId !== (user?._id || user?.id)) {
        setRemoteParticipant({ name: participant.name, role: participant.role });
        setIsRemoteConnected(true);
        toast.success(`${participant.name || 'Participant'} joined the session`);
      }
    };

    const handleCallOffer = async ({ offer }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        for (const c of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn);
        }
        pendingCandidates.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:answer', { roomId: signalRoomId, answer });
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    };

    const handleCallAnswer = async ({ answer }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn);
        }
        pendingCandidates.current = [];
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!candidate) return;
      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidates.current.push(candidate);
        }
      } catch (err) {
        console.warn('[WebRTC] ICE candidate error:', err);
      }
    };

    const handleCallEnded = ({ participant } = {}) => {
      const name = participant?.name || 'The other person';
      toast(`${name} left the session.`, { icon: 'ℹ️' });
      setIsRemoteVideoActive(false);
      setIsRemoteConnected(false);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };

    const handleAccessDenied = ({ reason }) => {
      toast.error(reason || 'Session is not active right now.');
      setSessionActive(false);
      setIsInWaitingRoom(true);
    };

    const handleRoomMessage = (msg) => {
      const myId = user?._id || user?.id;
      if (msg.senderId && msg.senderId === myId) return;
      setChatMessages(prev => [...prev, { ...msg, isOwn: false }]);
      if (!showChatRef.current) {
        setUnreadCount(prev => prev + 1);
        toast('New message', { icon: '💬' });
      }
    };

    const handleQuestionnaireReceive = (data) => {
      const q = data.questions || data;
      setQuestions(q);
      setAnswers({});
      setCurrentQuestion(0);
      setQuestionnaireSubmitted(false);
      setShowQuestionnaire(true);
      setShowChat(false);
      if (data.templateId) {
        setActiveTemplateId(data.templateId);
        activeTemplateIdRef.current = data.templateId;
      }
      toast('Received a questionnaire from doctor', { icon: '📋' });
    };

    const handleQuestionnaireResponse = () => {
      toast.success('Patient submitted the questionnaire!');
    };

    socket.on('call:ready', handleCallReady);
    socket.on('call:user-joined', handleUserJoined);
    socket.on('call:offer', handleCallOffer);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:access-denied', handleAccessDenied);
    socket.on('room:message', handleRoomMessage);
    socket.on('questionnaire:receive', handleQuestionnaireReceive);
    socket.on('questionnaire:response', handleQuestionnaireResponse);

    const userName = user?.name || user?.fullName || (user?.role === 'doctor' ? 'Doctor' : 'Patient');
    socket.emit('call:join-room', {
      roomId: signalRoomId,
      role: user?.role,
      userId: user?._id || user?.id,
      name: userName,
    });

    return () => {
      socket.off('call:ready', handleCallReady);
      socket.off('call:user-joined', handleUserJoined);
      socket.off('call:offer', handleCallOffer);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:access-denied', handleAccessDenied);
      socket.off('room:message', handleRoomMessage);
      socket.off('questionnaire:receive', handleQuestionnaireReceive);
      socket.off('questionnaire:response', handleQuestionnaireResponse);
      socket.emit('call:end', { roomId: signalRoomId });
      pc.close();
    };
  }, [sessionActive, signalRoomId, user]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleJoinSession = () => {
    setIsInWaitingRoom(false);
    setSessionActive(true);
  };

  const handleEndCall = async () => {
    const isDoc = user?.role === 'doctor' || user?.role === 'admin';
    const socket = getSocket();
    if (socket) socket.emit('call:end', { roomId: signalRoomId });
    localStream.current?.getTracks().forEach(t => t.stop());
    navigate(isDoc ? '/admin/dashboard' : '/patient/dashboard');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = chatMessage.trim();
    if (!text) return;

    const myId = user?._id || user?.id;
    const userName = user?.name || user?.fullName || (user?.role === 'doctor' ? 'Doctor' : 'Patient');
    const msg = {
      senderId: myId,
      senderName: userName,
      senderRole: user?.role,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };

    setChatMessages(prev => [...prev, msg]);
    setChatMessage('');

    const socket = getSocket();
    if (socket) socket.emit('room:message', { roomId: signalRoomId, message: msg });
  };

  const handleSendQuestionnaire = () => {
    if (!selectedTemplate) {
      toast.error('Please select a questionnaire first');
      return;
    }
    const socket = getSocket();
    if (socket) {
      socket.emit('questionnaire:push', {
        roomId: signalRoomId,
        questionnaire: {
          templateId: selectedTemplate._id,
          questions: selectedTemplate.questions,
          title: selectedTemplate.title,
          diseaseName: selectedTemplate.diseaseName,
        },
      });
      toast.success(`Sent "${selectedTemplate.title}" to patient`);
    }
  };

  const handleSubmitQuestionnaire = async () => {
    setQuestionnaireSubmitted(true);
    const socket = getSocket();
    if (socket) socket.emit('questionnaire:submit', { roomId: signalRoomId, responses: answers });

    try {
      const isPatient = user?.role !== 'doctor' && user?.role !== 'admin';
      // ✅ FIX 1: use ref so we always have latest values even if state hasn't updated
      const templateId = activeTemplateIdRef.current || activeTemplateId;
      const apt = appointmentRef.current || appointment;

      if (isPatient && templateId && apt?._id && (apt?.doctor?._id || apt?.doctor)) {
        const normalizeResponseType = (type) => {
          if (type === 'scale') return 'scale';
          if (type === 'choice' || type === 'objective') return 'choice';
          if (type === 'text' || type === 'subjective' || type === 'image') return 'text';
          return 'text';
        };

        // ✅ FIX 2: answers keys are question._id OR numeric index — map consistently
        const formattedResponses = questions.map((q, idx) => {
          const key = q._id || idx; // same key used when setting answers
          return {
            questionId: q._id || String(idx),
            questionText: q.text || `Question ${idx + 1}`,
            type: normalizeResponseType(q.type),
            answer: answers[key] ?? '',
          };
        });

        const doctorId = apt?.doctor?._id || apt?.doctor;
        await sessionAPI.submitResponse({
          templateId,
          appointmentId: apt._id,   // ✅ FIX 3: real MongoDB _id, not roomId URL param
          doctorId,
          responses: formattedResponses,
        });
        toast.success('Responses saved!');
      }
    } catch (err) {
      console.error('Failed to save questionnaire response:', err);
      toast.error('Failed to save responses');
    }

    setTimeout(() => {
      setShowQuestionnaire(false);
      setQuestionnaireSubmitted(false);
      setActiveTemplateId(null);
      activeTemplateIdRef.current = null;
    }, 2000);
  };

  // ─── Screen Share ─────────────────────────────────────────────────────────
  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    if (peerConnection.current && localStream.current) {
      const videoTrack = localStream.current.getVideoTracks().find(t => t.readyState === 'live');
      const sender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack).catch(e => console.error(e));
      }
    }

    if (localVideoRef.current && localStream.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];

        if (peerConnection.current) {
          const sender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack).catch(e => console.error(e));
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);

        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error('Failed to share screen (or user cancelled)', err);
      }
    } else {
      stopScreenShare();
    }
  };

  // ─── Derived values ───────────────────────────────────────────────────────
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';
  const myName = user?.name || user?.fullName || (isDoctor ? 'Doctor' : 'Patient');
  const otherName = isDoctor
    ? (appointment?.patient?.name || remoteParticipant?.name || 'Patient')
    : (appointment?.doctor?.name || remoteParticipant?.name || 'Doctor');
  const otherRole = isDoctor ? 'patient' : 'doctor';

  // ─── Waiting Room ─────────────────────────────────────────────────────────
  if (isInWaitingRoom) {
    if (loading) return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center"
        >
          <div className="relative rounded-3xl overflow-hidden bg-gray-700 aspect-video mb-8 shadow-soft-xl">
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" />
            {!videoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <ParticipantAvatar name={myName} role={user?.role} size="large" />
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button onClick={() => setMicOn(!micOn)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-danger text-white'}`}>
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button onClick={() => setVideoOn(!videoOn)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${videoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-danger text-white'}`}>
                {videoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
            <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
              {myName} (You)
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
            <span className="text-white font-medium">{otherName}</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-primary-300 mb-8">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Session scheduled for today</span>
          </div>

          <button
            onClick={handleJoinSession}
            className="font-semibold px-10 py-4 rounded-2xl transition-all duration-300 w-full sm:w-auto bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-glow-lg active:scale-[0.98]"
          >
            Join Session
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Video Session ────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex relative overflow-hidden">
        {/* Main Video Area (Remote) */}
        <div className="flex-1 relative">
          <video
            ref={remoteVideoRef}
            autoPlay playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isRemoteVideoActive ? 'opacity-100' : 'opacity-0'}`}
          />

          {!isRemoteVideoActive && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center space-y-4">
                {isRemoteConnected ? (
                  <>
                    <ParticipantAvatar name={otherName} role={otherRole} size="large" />
                    <p className="text-gray-400 text-sm animate-pulse">Connecting video…</p>
                  </>
                ) : (
                  <>
                    <div className="w-28 h-28 rounded-full bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center mx-auto">
                      {otherRole === 'doctor' ? (
                        <Stethoscope className="w-12 h-12 text-gray-500" />
                      ) : (
                        <User className="w-12 h-12 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium text-lg">{otherName}</p>
                      <p className="text-gray-400 text-sm mt-1 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Waiting for them to join…
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {isRemoteConnected && (
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-xl flex items-center gap-2 z-10">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {otherName}
            </div>
          )}

          {/* Self Video (PiP) */}
          <div className="absolute bottom-4 right-4 w-48 h-36 rounded-2xl bg-gray-700 overflow-hidden shadow-soft-xl border-2 border-gray-600 z-10">
            <video
              ref={localVideoRef}
              autoPlay playsInline muted
              className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] transition-opacity ${videoOn ? 'opacity-100' : 'opacity-0'}`}
            />
            {!videoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <ParticipantAvatar name={myName} role={user?.role} size="small" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">You</div>
          </div>

          {/* Live indicator */}
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm z-10">
            <div className="w-2 h-2 bg-danger rounded-full animate-pulse" />
            <span className="font-medium">Live</span>
          </div>

          {/* Encrypted badge */}
          <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-medium z-10">
            🔒 Encrypted
          </div>
        </div>

        {/* Side Panel */}
        <AnimatePresence>
          {(showChat || showQuestionnaire || showNotes) && (
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
                  {showChat && <><MessageSquare className="w-4 h-4" /> Session Chat</>}
                  {showQuestionnaire && <><ClipboardList className="w-4 h-4" /> Questionnaire</>}
                  {showNotes && <><FileText className="w-4 h-4" /> Session Notes</>}
                </h3>
                <button
                  onClick={() => { setShowChat(false); setShowQuestionnaire(false); setShowNotes(false); }}
                  className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat */}
              {showChat && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.length === 0 && (
                      <p className="text-center text-gray-500 text-sm mt-8">No messages yet. Say hello! 👋</p>
                    )}
                    {chatMessages.map((msg, i) => {
                      const isOwn = msg.isOwn === true;
                      return (
                        <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {!isOwn && (
                            <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center mr-2 shrink-0 self-end mb-1">
                              <span className="text-xs text-white font-bold">
                                {(msg.senderName || otherName || 'P').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="max-w-[80%]">
                            {!isOwn && (
                              <p className="text-xs text-gray-400 mb-1 ml-1">{msg.senderName || otherName}</p>
                            )}
                            <div className={`p-3 rounded-2xl text-sm ${isOwn ? 'bg-primary text-white rounded-br-md' : 'bg-gray-700 text-gray-200 rounded-bl-md'}`}>
                              <p>{msg.text}</p>
                              <p className={`text-xs mt-1 ${isOwn ? 'text-white/50' : 'text-gray-500'}`}>{msg.time}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatBottomRef} />
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
                      <button
                        type="submit"
                        disabled={!chatMessage.trim()}
                        className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              )}

              {/* Questionnaire */}
              {showQuestionnaire && (
                <div className="flex-1 overflow-y-auto p-4">
                  {isDoctor ? (
                    /* Doctor - Select & Send Questionnaire */
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-gray-400 mb-1.5 block">Select Disease / Condition</label>
                        <select
                          value={selectedDisease}
                          onChange={(e) => setSelectedDisease(e.target.value)}
                          className="w-full bg-gray-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="">-- Choose Disease --</option>
                          {diseases.map((d, i) => (
                            <option key={i} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      {selectedDisease && (
                        <div>
                          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Select Questionnaire</label>
                          {loadingTemplates ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </div>
                          ) : diseaseTemplates.length > 0 ? (
                            <div className="space-y-2">
                              {diseaseTemplates.map((tmpl) => (
                                <button
                                  key={tmpl._id}
                                  onClick={() => setSelectedTemplate(tmpl)}
                                  className={`w-full p-3 rounded-xl text-left transition-all text-sm ${selectedTemplate?._id === tmpl._id
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                  <p className="font-medium">{tmpl.title}</p>
                                  <p className="text-xs mt-0.5 opacity-70">
                                    {tmpl.testName && `${tmpl.testName} • `}{tmpl.questions?.length || 0} questions • {tmpl.answerType}
                                  </p>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No questionnaires found for "{selectedDisease}"</p>
                          )}
                        </div>
                      )}

                      {selectedTemplate && (
                        <div className="border-t border-gray-700 pt-4">
                          <h4 className="text-white font-medium text-sm mb-2">Preview: {selectedTemplate.title}</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                            {selectedTemplate.questions?.map((q, i) => (
                              <p key={i} className="text-xs text-gray-400">
                                <span className="text-primary font-bold">{i + 1}.</span> {q.text} <span className="text-gray-600">({q.type})</span>
                              </p>
                            ))}
                          </div>
                          <button onClick={handleSendQuestionnaire} className="btn-primary w-full text-sm">
                            Send to Patient
                          </button>
                        </div>
                      )}

                      {diseases.length === 0 && !selectedDisease && (
                        <div className="text-center mt-6 space-y-3">
                          <ClipboardList className="w-10 h-10 text-gray-600 mx-auto" />
                          <p className="text-gray-400 text-sm">No questionnaires created yet.</p>
                          <p className="text-gray-500 text-xs">Go to Questionnaires page to create disease-specific questionnaires.</p>
                        </div>
                      )}
                    </div>
                  ) : questionnaireSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center h-full text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-success" />
                      </div>
                      <h4 className="text-white font-bold text-lg mb-2">Submitted!</h4>
                      <p className="text-gray-400 text-sm">Your responses have been recorded.</p>
                    </motion.div>
                  ) : questions.length > 0 ? (
                    <>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">Question {currentQuestion + 1} of {questions.length}</span>
                          <span className="text-xs text-primary-300">{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-primary to-secondary rounded-full h-1.5 transition-all duration-300"
                            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                          />
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentQuestion}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <p className="text-white font-medium mb-4 leading-relaxed">{questions[currentQuestion].text}</p>

                          {questions[currentQuestion].type === 'scale' && (
                            <div className="flex flex-wrap gap-2">
                              {(questions[currentQuestion].options || ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']).map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => setAnswers({ ...answers, [questions[currentQuestion]._id || currentQuestion]: opt })}
                                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${answers[questions[currentQuestion]._id || currentQuestion] === opt ? 'bg-primary text-white shadow-glow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {(questions[currentQuestion].type === 'choice' || questions[currentQuestion].type === 'objective') && (
                            <div className="space-y-2">
                              {(questions[currentQuestion].options || []).map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => setAnswers({ ...answers, [questions[currentQuestion]._id || currentQuestion]: opt })}
                                  className={`w-full p-3 rounded-xl text-sm text-left transition-all ${answers[questions[currentQuestion]._id || currentQuestion] === opt ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {(questions[currentQuestion].type === 'text' || questions[currentQuestion].type === 'subjective') && (
                            <textarea
                              value={answers[questions[currentQuestion]._id || currentQuestion] || ''}
                              onChange={(e) => setAnswers({ ...answers, [questions[currentQuestion]._id || currentQuestion]: e.target.value })}
                              placeholder="Type your answer..."
                              rows={4}
                              className="w-full bg-gray-700 text-white placeholder:text-gray-500 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                            />
                          )}

                          {questions[currentQuestion].type === 'image' && (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={answers[questions[currentQuestion]._id || currentQuestion] || ''}
                                  onChange={(e) => setAnswers({ ...answers, [questions[currentQuestion]._id || currentQuestion]: e.target.value })}
                                  placeholder="Image URL (or use Upload button)"
                                  className="flex-1 bg-gray-700 text-white placeholder:text-gray-500 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <button
                                  type="button"
                                  onClick={() => document.getElementById('questionnaire-image-upload')?.click()}
                                  className="px-4 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 shrink-0"
                                >
                                  📷 Upload
                                </button>
                                <input
                                  id="questionnaire-image-upload"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
                                    const formData = new FormData();
                                    formData.append('image', file);
                                    try {
                                      toast.loading('Uploading image...', { id: 'img-upload' });
                                      const { data } = await (await import('../services/api')).uploadAPI.uploadImage(formData);
                                      setAnswers(prev => ({ ...prev, [questions[currentQuestion]._id || currentQuestion]: data.url }));
                                      toast.success('Image uploaded!', { id: 'img-upload' });
                                    } catch {
                                      toast.error('Upload failed', { id: 'img-upload' });
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </div>
                              {answers[questions[currentQuestion]._id || currentQuestion] && (
                                <img
                                  src={answers[questions[currentQuestion]._id || currentQuestion]}
                                  alt="Uploaded"
                                  className="max-h-32 rounded-xl object-contain bg-gray-700"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <p className="text-xs text-gray-500">Upload an image or paste a URL</p>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>

                      <div className="flex items-center justify-between mt-6">
                        <button
                          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                          disabled={currentQuestion === 0}
                          className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                          Previous
                        </button>
                        {currentQuestion < questions.length - 1 ? (
                          <button
                            onClick={() => setCurrentQuestion(currentQuestion + 1)}
                            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1"
                          >
                            Next <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={handleSubmitQuestionnaire}
                            className="px-5 py-2.5 rounded-xl bg-success text-white text-sm font-medium hover:bg-success/80 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Submit
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center mt-10 space-y-3">
                      <ClipboardList className="w-10 h-10 text-gray-600 mx-auto" />
                      <p className="text-gray-400 text-sm">Waiting for the doctor to send a questionnaire...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes Panel */}
              {showNotes && (
                <div className="flex-1 flex flex-col p-4 overflow-hidden bg-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">Observation & Treatment Notes</p>
                    <div className="flex items-center gap-2">
                      {savingDescription && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 text-primary animate-spin" /> Saving…
                        </span>
                      )}
                      {!savingDescription && noteId && (
                        <span className="text-success text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Saved
                        </span>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={sessionDescription}
                    onChange={(e) => setSessionDescription(e.target.value)}
                    placeholder="Type your notes here... They auto-save as you type and will appear in the patient's record."
                    className="flex-1 w-full bg-gray-700 text-white placeholder:text-gray-500 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[140px]"
                  />

                  {/* Manual save button */}
                  <button
                    onClick={async () => {
                      if (!sessionDescription.trim() || !appointment?._id) return;
                      setSavingDescription(true);
                      try {
                        if (!noteId) {
                          const { data } = await sessionAPI.createNote({
                            appointment: appointment._id,
                            patient: appointment.patient?._id || appointment.patient,
                            sessionDescription: sessionDescription.trim(),
                            isSharedWithPatient: true,
                          });
                          setNoteId(data.note._id);
                        } else {
                          await sessionAPI.updateNote(noteId, { sessionDescription: sessionDescription.trim() });
                        }
                        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        setNoteSaves(prev => [{ time: now, preview: sessionDescription.trim().slice(0, 60) }, ...prev].slice(0, 5));
                        toast.success('Note saved!');
                      } catch {
                        toast.error('Failed to save note');
                      } finally {
                        setSavingDescription(false);
                      }
                    }}
                    disabled={savingDescription || !sessionDescription.trim()}
                    className="mt-2 w-full py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                  >
                    {savingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Save Now
                  </button>

                  {/* Save history */}
                  {noteSaves.length > 0 && (
                    <div className="mt-3 border-t border-gray-700 pt-3">
                      <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Save History</p>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {noteSaves.map((save, i) => (
                          <div key={i} className="flex items-start gap-2 bg-gray-700/50 rounded-lg px-2.5 py-1.5">
                            <span className="text-[10px] text-primary-300 font-mono shrink-0 mt-0.5">{save.time}</span>
                            <span className="text-[11px] text-gray-400 truncate">{save.preview}{save.preview.length === 60 ? '…' : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Auto-saves as you type • Visible in patient's session history
                  </p>
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
            <button
              onClick={() => setMicOn(!micOn)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${micOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-danger text-white'}`}
              title={micOn ? 'Mute' : 'Unmute'}
            >
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setVideoOn(!videoOn)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${videoOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-danger text-white'}`}
              title={videoOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {videoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleScreenShare}
              className={`w-12 h-12 rounded-2xl hidden sm:flex items-center justify-center transition-all duration-200 ${isScreenSharing ? 'bg-primary text-white shadow-glow' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
              title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            >
              <Monitor className="w-5 h-5" />
            </button>
          </div>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-2xl bg-danger text-white hover:bg-red-600 flex items-center justify-center transition-all shadow-soft-lg hover:shadow-soft-xl"
            title="End session"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowChat(!showChat); setShowQuestionnaire(false); setShowNotes(false); setUnreadCount(0); }}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${showChat ? 'bg-primary text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
              title="Chat"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setShowQuestionnaire(!showQuestionnaire); setShowChat(false); setShowNotes(false); }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${showQuestionnaire ? 'bg-primary text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
              title="Questionnaire"
            >
              <ClipboardList className="w-5 h-5" />
            </button>
            {isDoctor && (
              <button
                onClick={() => { setShowNotes(!showNotes); setShowChat(false); setShowQuestionnaire(false); }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${showNotes ? 'bg-primary text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                title="Session Notes"
              >
                <FileText className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoSession;