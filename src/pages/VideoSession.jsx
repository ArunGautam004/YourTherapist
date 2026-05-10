import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Monitor,
  MessageSquare, ClipboardList, Maximize2, Minimize2,
  Send, X, ChevronRight, CheckCircle2, Clock, Brain, Loader2, User, Stethoscope,
  FileText, ChevronDown, RotateCcw, Shield, Wifi
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

  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;
  const iceTransportPolicy = (import.meta.env.VITE_ICE_TRANSPORT_POLICY || 'all').toLowerCase();

  // Comprehensive TURN servers with multiple ports and protocols for maximum compatibility
  const iceServers = [
    { urls: stunUrls },
    {
      urls: 'turn:free.expressturn.com:3478',
      username: turnUsername,
      credential: turnCredential,
    },
    {
      urls: 'turn:free.expressturn.com:3478?transport=tcp',
      username: turnUsername,
      credential: turnCredential,
    },
    {
      urls: 'turns:free.expressturn.com:5349',
      username: turnUsername,
      credential: turnCredential,
    },
    {
      urls: 'turns:free.expressturn.com:5349?transport=tcp',
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

  // Camera flip
  const [facingMode, setFacingMode] = useState('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const videoDevicesRef = useRef([]);
  const currentDeviceIndexRef = useRef(0);

  // Fullscreen & timer
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');

  // Remote media state
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);

  // Ref for signalRoomId to avoid stale closures in setupPeerConnection
  const signalRoomIdRef = useRef(null);

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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Detect multiple cameras for flip button
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          videoDevicesRef.current = videoInputs;
          setHasMultipleCameras(videoInputs.length > 1);
          // Find current device index
          const currentTrack = stream.getVideoTracks()[0];
          const currentDeviceId = currentTrack?.getSettings()?.deviceId;
          const idx = videoInputs.findIndex(d => d.deviceId === currentDeviceId);
          if (idx >= 0) currentDeviceIndexRef.current = idx;
        } catch {}
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

  // ─── Reusable Peer Connection Setup (for reconnection) ─────────────────
  const setupPeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.onconnectionstatechange = null;
      peerConnection.current.oniceconnectionstatechange = null;
      peerConnection.current.close();
    }
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;
    isOfferSent.current = false;
    didRetryIce.current = false;
    pendingCandidates.current = [];

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
      });
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsRemoteVideoActive(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        socket?.emit('call:ice-candidate', { roomId: signalRoomIdRef.current, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsRemoteVideoActive(true);
        didRetryIce.current = false;
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setIsRemoteVideoActive(false);
      }
    };

    pc.oniceconnectionstatechange = async () => {
      if (pc.iceConnectionState === 'failed' && !rtcSetup.hasTurn) {
        toast.error('Video connection failed: TURN server unavailable.');
      }
      if (pc.iceConnectionState !== 'failed' || didRetryIce.current) return;
      didRetryIce.current = true;
      try {
        const restartOffer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(restartOffer);
        const socket = getSocket();
        socket?.emit('call:offer', { roomId: signalRoomIdRef.current, offer: restartOffer });
      } catch (err) {
        console.warn('[WebRTC] ICE restart failed:', err);
      }
    };

    return pc;
  }, []);

  // ─── Main WebRTC + Socket Logic ──────────────────────────────────────────
  useEffect(() => {
    if (!sessionActive) return;
    if (!signalRoomId) return;

    const socket = getSocket();
    if (!socket) {
      toast.error('Socket not connected. Please refresh.');
      return;
    }

    signalRoomIdRef.current = signalRoomId;
    setupPeerConnection();
    setSessionStartTime(Date.now());

    const handleCallReady = async ({ participants }) => {
      if (participants) {
        const remote = participants.find(p => p.userId !== user?._id && p.userId !== user?.id);
        if (remote) setRemoteParticipant({ name: remote.name, role: remote.role, profilePic: remote.profilePic });
      }
      setIsRemoteConnected(true);

      const isDoc = user?.role === 'doctor' || user?.role === 'admin';
      const pc = peerConnection.current;
      if (isDoc && pc && !isOfferSent.current) {
        isOfferSent.current = true;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:offer', { roomId: signalRoomId, offer });
        } catch (err) {
          console.error('[WebRTC] Error creating offer:', err);
          isOfferSent.current = false;
        }
      }
    };

    const handleUserJoined = async ({ participant }) => {
      if (participant && participant.userId !== (user?._id || user?.id)) {
        setRemoteParticipant({ name: participant.name, role: participant.role, profilePic: participant.profilePic });
        setIsRemoteConnected(true);
        setRemoteVideoEnabled(true);
        setRemoteAudioEnabled(true);
        toast.success(`${participant.name || 'Participant'} joined the session`);

        // ✅ RECONNECTION FIX: Doctor creates fresh PC and sends new offer
        const isDoc = user?.role === 'doctor' || user?.role === 'admin';
        if (isDoc) {
          setupPeerConnection();
          setTimeout(async () => {
            const pc = peerConnection.current;
            if (!pc || isOfferSent.current) return;
            isOfferSent.current = true;
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('call:offer', { roomId: signalRoomId, offer });
            } catch (err) {
              console.error('[WebRTC] Offer on rejoin failed:', err);
              isOfferSent.current = false;
            }
          }, 300);
        }
      }
    };

    const handleCallOffer = async ({ offer }) => {
      try {
        // ✅ RECONNECTION FIX: If PC is in bad state, recreate it
        let pc = peerConnection.current;
        if (!pc || (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer')) {
          pc = setupPeerConnection();
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        for (const c of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
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
        const pc = peerConnection.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingCandidates.current = [];
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!candidate) return;
      try {
        const pc = peerConnection.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
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
      // ✅ RECONNECTION FIX: Recreate PC so we're ready when they rejoin
      setupPeerConnection();
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

    const handleMediaToggle = ({ kind, enabled }) => {
      if (kind === 'video') setRemoteVideoEnabled(enabled);
      if (kind === 'audio') setRemoteAudioEnabled(enabled);
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
    socket.on('call:media-toggle', handleMediaToggle);
    socket.on('questionnaire:receive', handleQuestionnaireReceive);
    socket.on('questionnaire:response', handleQuestionnaireResponse);

    const userName = user?.name || user?.fullName || (user?.role === 'doctor' ? 'Doctor' : 'Patient');
    socket.emit('call:join-room', {
      roomId: signalRoomId,
      role: user?.role,
      userId: user?._id || user?.id,
      name: userName,
      profilePic: user?.profilePic,
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
      socket.off('call:media-toggle', handleMediaToggle);
      socket.off('questionnaire:receive', handleQuestionnaireReceive);
      socket.off('questionnaire:response', handleQuestionnaireResponse);
      socket.emit('call:end', { roomId: signalRoomId });
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    };
  }, [sessionActive, signalRoomId, user, setupPeerConnection]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  // Session timer
  useEffect(() => {
    if (!sessionStartTime) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - sessionStartTime) / 1000);
      const mins = String(Math.floor(diff / 60)).padStart(2, '0');
      const secs = String(diff % 60).padStart(2, '0');
      setElapsedTime(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

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

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    const socket = getSocket();
    socket?.emit('call:media-toggle', { roomId: signalRoomId, kind: 'audio', enabled: next });
  };

  const toggleVideo = () => {
    const next = !videoOn;
    setVideoOn(next);
    const socket = getSocket();
    socket?.emit('call:media-toggle', { roomId: signalRoomId, kind: 'video', enabled: next });
  };

  const toggleCameraFlip = async () => {
    const devices = videoDevicesRef.current;
    if (devices.length < 2) return;
    try {
      // Cycle to next camera by deviceId (more reliable than facingMode)
      const nextIndex = (currentDeviceIndexRef.current + 1) % devices.length;
      const nextDeviceId = devices[nextIndex].deviceId;
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextDeviceId } },
        audio: true,
      });
      // Stop old video tracks
      localStream.current?.getVideoTracks().forEach(t => t.stop());
      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];
      // Replace track in peer connection
      if (peerConnection.current) {
        const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender && newVideoTrack) await sender.replaceTrack(newVideoTrack);
      }
      // Keep existing audio track if new one wasn't acquired
      const existingAudio = localStream.current?.getAudioTracks()[0];
      const updatedStream = new MediaStream();
      updatedStream.addTrack(newVideoTrack);
      if (newAudioTrack) {
        updatedStream.addTrack(newAudioTrack);
        existingAudio?.stop();
      } else if (existingAudio) {
        updatedStream.addTrack(existingAudio);
      }
      localStream.current = updatedStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = updatedStream;
      currentDeviceIndexRef.current = nextIndex;
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      toast.success(`Camera switched`);
    } catch (err) {
      console.error('Camera flip failed:', err);
      toast.error('Could not switch camera');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
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
  const myProfilePic = user?.profilePic;
  const otherName = isDoctor
    ? (appointment?.patient?.name || remoteParticipant?.name || 'Patient')
    : (appointment?.doctor?.name || remoteParticipant?.name || 'Doctor');
  const otherRole = isDoctor ? 'patient' : 'doctor';
  const otherProfilePic = isDoctor
    ? (appointment?.patient?.profilePic || remoteParticipant?.profilePic)
    : (appointment?.doctor?.profilePic || remoteParticipant?.profilePic);
  const showRemoteAvatar = !isRemoteVideoActive || !remoteVideoEnabled;

  // ─── Waiting Room ─────────────────────────────────────────────────────────
  if (isInWaitingRoom) {
    if (loading) return (
      <div className="min-h-screen video-session-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

    return (
      <div className="min-h-screen video-session-bg flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl ambient-orb" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/8 blur-3xl ambient-orb-delayed" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-lg w-full text-center relative z-10"
        >
          {/* Video Preview Card */}
          <div className="relative rounded-3xl overflow-hidden bg-black/40 aspect-video mb-8 shadow-2xl border border-white/10 backdrop-blur-sm">
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" />
            {!videoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/95 to-gray-800/95">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center shadow-lg border-2 border-white/20 overflow-hidden avatar-ring-pulse">
                    {myProfilePic ? (
                      <img src={myProfilePic} alt={myName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-white">{myName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                    )}
                  </div>
                  <span className="text-white/80 text-sm font-medium">Camera is off</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button onClick={() => setMicOn(!micOn)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md ${micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/90 text-white'}`}>
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button onClick={() => setVideoOn(!videoOn)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md ${videoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/90 text-white'}`}>
                {videoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              {hasMultipleCameras && (
                <button onClick={toggleCameraFlip} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md">
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-xl font-medium">
              {myName} (You)
            </div>
          </div>

          {/* Branding */}
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white">
              Your<span className="text-primary-300">Therapist</span>
            </span>
          </div>

          <h2 className="font-display text-3xl font-bold text-white mb-3">Ready to join?</h2>
          <p className="text-gray-400 mb-2 text-lg">
            Session with{' '}
            <span className="text-white font-semibold">{otherName}</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-primary-300 mb-8">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Session scheduled for today</span>
          </div>

          <motion.button
            onClick={handleJoinSession}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="font-semibold px-12 py-4 rounded-2xl w-full sm:w-auto bg-gradient-to-r from-primary via-primary-dark to-secondary text-white shadow-lg hover:shadow-glow-lg transition-shadow text-lg"
          >
            Join Session
          </motion.button>

          <p className="text-gray-500 text-xs mt-4 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            End-to-end encrypted session
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Video Session ────────────────────────────────────────────────────────
  return (
    <div className="h-screen video-session-bg flex flex-col overflow-hidden">
      <div className="flex-1 flex relative overflow-hidden min-h-0">
        {/* Main Video Area (Remote) */}
        <div className="flex-1 relative">
          <video
            ref={remoteVideoRef}
            autoPlay playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isRemoteVideoActive && remoteVideoEnabled ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Remote avatar: shown when video off, camera disabled, or waiting */}
          {showRemoteAvatar && (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Ambient orbs behind avatar */}
              <div className="absolute w-72 h-72 rounded-full bg-primary/8 blur-3xl ambient-orb" />
              <div className="absolute w-56 h-56 rounded-full bg-secondary/6 blur-3xl ambient-orb-delayed" />

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-5 relative z-10"
              >
                {isRemoteConnected ? (
                  <>
                    {/* Connected but camera off — show profile pic */}
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/60 to-secondary/60 flex items-center justify-center shadow-2xl border-[3px] border-white/15 overflow-hidden mx-auto avatar-ring-pulse">
                      {otherProfilePic ? (
                        <img src={otherProfilePic} alt={otherName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold text-white font-display">
                          {otherName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-xl">{otherRole === 'doctor' && !otherName.toLowerCase().startsWith('dr') ? `Dr. ${otherName}` : otherName}</p>
                      {!remoteVideoEnabled ? (
                        <p className="text-gray-400 text-sm mt-1.5 flex items-center justify-center gap-2">
                          <VideoOff className="w-4 h-4" />
                          Camera is turned off
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm mt-1.5 animate-pulse flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting video…
                        </p>
                      )}
                    </div>
                    {!remoteAudioEnabled && (
                      <div className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-300 text-xs px-3 py-1.5 rounded-full">
                        <MicOff className="w-3.5 h-3.5" /> Muted
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Waiting for remote to join */}
                    <div className="w-32 h-32 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center mx-auto">
                      {otherProfilePic ? (
                        <img src={otherProfilePic} alt={otherName} className="w-full h-full object-cover rounded-full opacity-40" />
                      ) : otherRole === 'doctor' ? (
                        <Stethoscope className="w-12 h-12 text-white/30" />
                      ) : (
                        <User className="w-12 h-12 text-white/30" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-xl">{otherName}</p>
                      <p className="text-gray-400 text-sm mt-1.5 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Waiting for them to join…
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}

          {/* Remote participant name badge */}
          {isRemoteConnected && !showRemoteAvatar && (
            <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md text-white text-sm px-3 py-1.5 rounded-xl flex items-center gap-2 z-10 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-400 status-dot-connected" />
              {otherName}
              {!remoteAudioEnabled && <MicOff className="w-3.5 h-3.5 text-red-400" />}
            </div>
          )}

          {/* Self Video (PiP) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-4 right-4 w-44 sm:w-52 aspect-[4/3] rounded-2xl bg-black/50 overflow-hidden shadow-2xl border border-white/15 z-10 pip-glow"
          >
            <video
              ref={localVideoRef}
              autoPlay playsInline muted
              className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${videoOn ? 'opacity-100' : 'opacity-0'}`}
            />
            {!videoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/95 to-gray-800/95">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/70 to-secondary/70 flex items-center justify-center overflow-hidden border border-white/20">
                    {myProfilePic ? (
                      <img src={myProfilePic} alt={myName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-white">{myName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                    )}
                  </div>
                  <span className="text-white/60 text-[10px]">Camera off</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-lg font-medium">You</div>
            {!micOn && (
              <div className="absolute top-1.5 right-1.5 bg-red-500/80 rounded-full p-1">
                <MicOff className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </motion.div>

          {/* ─── Top Overlay Bar ─────────────────────────────────────────── */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10 bg-gradient-to-b from-black/50 to-transparent">
            {/* Left: Live + Timer */}
            <div className="flex items-center gap-3">
              <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-semibold border border-white/10">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                LIVE
              </div>
              {sessionStartTime && (
                <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-medium border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-primary-300" />
                  {elapsedTime}
                </div>
              )}
            </div>

            {/* Right: Connection + Encrypted + Fullscreen */}
            <div className="flex items-center gap-2">
              <div className="bg-black/40 backdrop-blur-md text-white/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs border border-white/10">
                <Wifi className="w-3.5 h-3.5 text-green-400" />
                <span className="hidden sm:inline">Connected</span>
              </div>
              <div className="bg-black/40 backdrop-blur-md text-white/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs border border-white/10">
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Encrypted</span>
              </div>
              <button
                onClick={toggleFullscreen}
                className="bg-black/40 backdrop-blur-md text-white/80 p-1.5 rounded-xl hover:bg-white/10 transition-colors border border-white/10"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel — full overlay on mobile, 380px on desktop */}
        <AnimatePresence>
          {(showChat || showQuestionnaire || showNotes) && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute sm:relative inset-0 sm:inset-auto w-full sm:w-[380px] h-full bg-gray-900/95 sm:bg-black/40 backdrop-blur-2xl sm:border-l border-white/10 flex flex-col overflow-hidden shrink-0 dark-scrollbar z-30 sm:z-auto"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
                  {showChat && <><MessageSquare className="w-4 h-4 text-primary-300" /> Session Chat</>}
                  {showQuestionnaire && <><ClipboardList className="w-4 h-4 text-primary-300" /> Questionnaire</>}
                  {showNotes && <><FileText className="w-4 h-4 text-primary-300" /> Session Notes</>}
                </h3>
                <button
                  onClick={() => { setShowChat(false); setShowQuestionnaire(false); setShowNotes(false); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
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
                  <div className="p-3 border-t border-white/10 mb-[72px] sm:mb-0">
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

      {/* ─── Control Bar (in flow, not floating) ───────────────────────────── */}
      <div className="flex justify-center py-3 px-4 bg-black/30 backdrop-blur-xl border-t border-white/5 shrink-0 z-20">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 20 }}
          className="flex items-center gap-1.5 sm:gap-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl px-3 sm:px-5 py-2.5 shadow-2xl"
        >
          {/* Media Controls */}
          <button
            onClick={toggleMic}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}
            title={micOn ? 'Mute' : 'Unmute'}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${videoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}
            title={videoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {videoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          {hasMultipleCameras && (
            <button
              onClick={toggleCameraFlip}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all duration-200"
              title="Flip camera"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={toggleScreenShare}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl hidden sm:flex items-center justify-center transition-all duration-200 ${isScreenSharing ? 'bg-primary text-white btn-glow-active' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shadow-lg hover:shadow-red-500/30"
            title="End session"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />

          {/* Panel Controls */}
          <button
            onClick={() => { setShowChat(!showChat); setShowQuestionnaire(false); setShowNotes(false); setUnreadCount(0); }}
            className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${showChat ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title="Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setShowQuestionnaire(!showQuestionnaire); setShowChat(false); setShowNotes(false); }}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${showQuestionnaire ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title="Questionnaire"
          >
            <ClipboardList className="w-5 h-5" />
          </button>
          {isDoctor && (
            <button
              onClick={() => { setShowNotes(!showNotes); setShowChat(false); setShowQuestionnaire(false); }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${showNotes ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
              title="Session Notes"
            >
              <FileText className="w-5 h-5" />
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VideoSession;