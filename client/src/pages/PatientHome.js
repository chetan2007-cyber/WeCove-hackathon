import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, CalendarCheck2, CalendarDays, 
  CheckCircle2, Clock3, Images, Mic2, MoreHorizontal, Plus, Send, 
  Sparkles, Volume2, WifiOff, X, BookOpen, Camera, Image as ImageIcon, UploadCloud, 
  Loader2, Trash2, UserRound, Heart, Play, RotateCcw
} from "lucide-react";
import { cx, Avatar, SoftButton, SectionLabel, MemoryTile, Toast, TopBar, PatientShell } from "../components/shared";
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import memoryService from '../services/memoryService';
import reminderService from '../services/reminderService';
import gameService from '../services/gameService';
import aiService from '../services/aiService';
import voiceService from '../services/voiceService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export const getMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${SERVER_BASE_URL}${cleanPath}`;
};

// Browser TTS Language mapping
const voiceLangMap = {
  en: 'en-US',
  bn: 'bn-IN',
  as: 'as-IN',
  mni: 'hi-IN',
  lus: 'en-IN',
  kha: 'en-IN'
};

// Global Voice Helper
export const playVoice = (text, langCode) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceLangMap[langCode] || 'en-US';
  utterance.rate = 0.9; // Slightly slower for elderly comprehension
  window.speechSynthesis.speak(utterance);
};

// Reusable Speaker Button for Every Field
const SpeakBtn = ({ text }) => {
  const { lang } = useLanguage();
  return (
    <button 
      onClick={(e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        playVoice(text, lang); 
      }}
      className="inline-flex items-center justify-center text-[#0F7673] bg-[#0F7673]/10 hover:bg-[#0F7673]/20 rounded-full p-1.5 ml-2 transition-colors active:scale-95 align-middle"
      title="Read aloud"
    >
      <Volume2 className="w-4 h-4" />
    </button>
  );
};

// ==========================================
// 1. PATIENT REELS VIEW
// ==========================================
function PatientReelsView({ setView, showToast, memories }) {
  const { t, lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const startY = useRef(null);
  
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('hackathon_favorites');
    return new Set(saved ? JSON.parse(saved) : []);
  });

  const toggleFavorite = (id) => {
    if (!id) return;
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast("Removed from favorites.");
      } else {
        next.add(id);
        showToast("Saved to your favorites!");
      }
      localStorage.setItem('hackathon_favorites', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const familyMessages = JSON.parse(localStorage.getItem('hackathon_family') || '[]');

  const messageMoments = familyMessages.map((msg) => ({
    id: `msg-${msg.id}`,
    kind: `From ${msg.sender}`,
    title: "A message for you.",
    copy: msg.content,
    image: "", 
    action: "Listen to message",
    icon: "voice"
  }));

  const dynamicMoments = memories.map((mem) => ({
    id: mem._id, 
    kind: mem.aiSuggestions?.event || "A familiar memory",
    title: mem.caption || mem.title || mem.aiSuggestions?.place || "A moment in time",
    copy: mem.aiSuggestions?.dateCues ? `Captured ${mem.aiSuggestions.dateCues}` : "Take a moment to enjoy this memory.",
    image: getMediaUrl(mem.mediaUrl),
    action: "Spend time here",
    icon: "play"
  }));

  const moments = [
    ...messageMoments,
    ...dynamicMoments,
    {
      id: null,
      kind: t('todaysLastMoment') || "Today’s last moment",
      title: t('thatsAll') || "That’s all for today.",
      copy: t('exploreMoments') || "You’ve explored today’s moments. Come back whenever you like.",
      image: "", 
      action: t('backHome') || "Back home",
      icon: "restart"
    }
  ];

  if (moments.length === 1) {
    moments.unshift({
      id: null,
      kind: "Vault Empty",
      title: "No moments yet.",
      copy: "Upload photos or send messages to generate your daily reels.",
      image: "",
      action: t('backHome') || "Back home",
      icon: "restart"
    });
  }

  const moment = moments[index];
  const advance = () => setIndex((value) => Math.min(moments.length - 1, value + 1));
  const retreat = () => setIndex((value) => Math.max(0, value - 1));
  
  const primary = () => {
    if (moment.icon === "restart" || index === moments.length - 1) return setView("home");
    if (moment.icon === "voice") {
      showToast("Reading message aloud...");
      playVoice(moment.copy, lang);
      return; 
    }
    advance();
  };

  const handleTouchStart = (event) => { startY.current = event.touches[0]?.clientY ?? null; };
  const handleTouchEnd = (event) => { 
    if (startY.current === null) return; 
    const delta = startY.current - (event.changedTouches[0]?.clientY ?? startY.current); 
    if (Math.abs(delta) > 42) delta > 0 ? advance() : retreat(); 
    startY.current = null; 
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#162D3D] text-white" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="absolute inset-0">
        {moment.image && <img key={moment.image + index} src={moment.image} alt="" className="h-full w-full object-cover animate-in fade-in duration-700" />}
        <div className="absolute inset-0 bg-gradient-to-b from-[#162D3D]/60 via-[#162D3D]/20 to-[#162D3D]/95" />
      </div>
      <div className="relative flex h-full flex-col justify-between px-5 pb-8 pt-5 sm:px-10 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => { window.speechSynthesis.cancel(); setView("home"); }} className="flex min-h-11 items-center gap-2 rounded-full bg-black/20 hover:bg-black/40 transition px-4 text-sm font-semibold backdrop-blur-md">
            <ArrowLeft className="h-4 w-4" /> {t('exit') || 'Exit'}
          </button>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">{t('todaysMoments') || "Today’s moments"}</div>
            <div className="mt-1 font-serif text-xl">
              {String(Math.min(index + 1, Math.max(1, moments.length - 1))).padStart(2, "0")} / {String(Math.max(1, moments.length - 1)).padStart(2, "0")}
            </div>
          </div>
        </div>
        
        <div className="mx-auto w-full max-w-xl animate-in slide-in-from-bottom-8 duration-700">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#D4E8E0] drop-shadow-md">
            <Sparkles className="h-4 w-4" /> {moment.kind} <SpeakBtn text={moment.kind} />
          </div>
          <h1 className="font-serif text-5xl leading-[1.05] tracking-[-0.04em] sm:text-7xl drop-shadow-lg">
            {moment.title} <SpeakBtn text={moment.title} />
          </h1>
          <p className="mt-5 max-w-md text-lg leading-7 text-white/90 drop-shadow-md">
            {moment.copy} <SpeakBtn text={moment.copy} />
          </p>
          
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <SoftButton variant="light" className="min-h-14 text-base px-6 shadow-xl" onClick={primary} icon={moment.icon === "voice" ? <Mic2 className="h-4 w-4" /> : moment.icon === "restart" ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}>
              {moment.action}
            </SoftButton>
            
            {moment.id && !moment.id.startsWith('msg-') && (
              <button 
                onClick={() => toggleFavorite(moment.id)} 
                aria-label="Save this moment" 
                className={cx(
                  "flex h-14 w-14 items-center justify-center rounded-full backdrop-blur-md shadow-xl transition-all active:scale-95",
                  favorites.has(moment.id) ? "bg-white/25 text-red-400" : "bg-white/15 hover:bg-white/25 text-white"
                )}
              >
                <Heart className="h-5 w-5" fill={favorites.has(moment.id) ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button onClick={() => { window.speechSynthesis.cancel(); retreat(); }} disabled={index === 0} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-white/65 hover:text-white transition disabled:opacity-30">
            <ArrowLeft className="h-4 w-4" /> {t('previous') || 'Previous'}
          </button>
          {index < moments.length - 1 && (
            <button onClick={() => { window.speechSynthesis.cancel(); advance(); }} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition">
              {t('nextMoment') || 'Next moment'} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. PATIENT MEMORIES VIEW
// ==========================================
function PatientMemoriesView({ setView, showToast, memories, loading, user }) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState("All memories");
  const [selectedMemory, setSelectedMemory] = useState(null); 
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState('select'); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const galleryInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const filters = ["All memories", "Family", "Places", "Celebrations", "Favorites"];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadStep('preview');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setUploadStep('camera');
    } catch (err) {
      showToast("Camera access denied or unavailable.");
    }
  };

  useEffect(() => {
    if (uploadStep === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [uploadStep]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      stopCamera();
      setUploadStep('preview');
    }, "image/jpeg");
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patientId', user._id || user.id);
    formData.append('uploadedBy', 'patient');
    if (caption.trim()) formData.append('caption', caption);

    try {
      await memoryService.uploadMemory(selectedFile, user._id || user.id, null, caption, 'patient');
      showToast("Memory successfully processed by AI and added to your vault!");
      closeUploadModal();
      setTimeout(() => window.location.reload(), 1500); 
    } catch (err) {
      showToast("Failed to upload memory.");
      setIsUploading(false);
    }
  };

  const closeUploadModal = () => {
    stopCamera();
    setIsUploadModalOpen(false);
    setUploadStep('select');
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
  };

  const handleDeleteMemory = async () => {
    if (!selectedMemory) return;
    const isCaregiverUpload = selectedMemory.caregiverId || selectedMemory.uploadedBy === 'caregiver';

    if (isCaregiverUpload) {
      showToast("This memory can only be removed by your caregiver.");
      return;
    }
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this memory?");
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await memoryService.deleteMemory(selectedMemory._id);
      showToast("Memory removed successfully.");
      setSelectedMemory(null);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      showToast("Failed to delete.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <SectionLabel>{t('memoryVaultTitle') || 'The memory vault'}</SectionLabel>
          <h1 className="font-serif text-4xl tracking-[-0.045em] text-[#162D3D]">
            A life, remembered <SpeakBtn text="A life, remembered in many ways." /><br /><em className="text-[#0F7673]">in many ways.</em>
          </h1>
        </div>
        <SoftButton variant="secondary" onClick={() => setIsUploadModalOpen(true)} icon={<Plus className="h-4 w-4" />}>
          {t('addMemoryBtn') || 'Add a memory'}
        </SoftButton>
      </div>
      
      <div className="mt-8 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {filters.map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={cx("shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition", filter === item ? "bg-[#162D3D] text-white" : "bg-white text-[#78909A] ring-1 ring-inset ring-[#DCE5E3] hover:text-[#162D3D]")}>
            {item}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-[#78909A] font-medium">Loading your memory album...</div>
        ) : memories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#78909A] font-medium border border-dashed border-[#DCE5E3] rounded-2xl">No memories added yet.</div>
        ) : (
          memories.map((mem, idx) => {
            let metaText = "";
            if (mem.aiSuggestions?.place && mem.createdAt) metaText = `${mem.aiSuggestions.place} · ${new Date(mem.createdAt).getFullYear()}`;
            else if (mem.aiSuggestions?.place) metaText = mem.aiSuggestions.place;
            else if (mem.createdAt) metaText = new Date(mem.createdAt).toLocaleDateString();

            return (
              <MemoryTile 
                key={mem._id || idx} image={getMediaUrl(mem.mediaUrl)} 
                label={mem.caption || mem.title || mem.aiSuggestions?.place || "Memory"} 
                meta={metaText} onClick={() => setSelectedMemory(mem)} large={idx === 0} 
              />
            );
          })
        )}
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#092026]/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#FAFBFB] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-3xl text-[#162D3D]">Add a Memory <SpeakBtn text="Add a Memory" /></h2>
                <button onClick={closeUploadModal} disabled={isUploading} className="text-[#6F858D] hover:text-[#162D3D] transition disabled:opacity-50">
                  <X size={24} />
                </button>
              </div>

              {uploadStep === 'select' && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                  <p className="text-[#647980] mb-4">Would you like to take a new photo, or choose one from your device? <SpeakBtn text="Would you like to take a new photo, or choose one from your device?" /></p>
                  <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileSelect} className="hidden" />
                  
                  <button onClick={startCamera} className="flex items-center justify-center gap-3 w-full bg-[#0F7673] hover:bg-[#0A5A58] text-white font-bold py-5 rounded-2xl transition shadow-md text-lg active:scale-95">
                    <Camera className="w-6 h-6" /> Take a Photo
                  </button>
                  <button onClick={() => galleryInputRef.current.click()} className="flex items-center justify-center gap-3 w-full bg-white border-2 border-[#DCE5E3] hover:border-[#0F7673] text-[#162D3D] font-bold py-5 rounded-2xl transition shadow-sm text-lg active:scale-95">
                    <ImageIcon className="w-6 h-6 text-[#0F7673]" /> Choose from Files
                  </button>
                </div>
              )}

              {/* ... other modal steps omitted for brevity ... */}

            </div>
          </div>
        </div>
      )}

      {selectedMemory && (
        <div className="fixed inset-0 z-[150] bg-[#092026]/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#FAFBFB] w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative animate-in zoom-in duration-300">
            <button onClick={() => setSelectedMemory(null)} className="absolute top-4 right-4 z-10 bg-black/20 text-white rounded-full p-2 hover:bg-black/40 transition"><X size={20} /></button>
            <div className="w-full md:w-1/2 h-64 md:h-auto relative bg-[#162D3D]">
              <img src={getMediaUrl(selectedMemory.mediaUrl)} alt="Memory detail" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#162D3D]/60 to-transparent" />
            </div>
            <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-center">
              
              <div className="flex justify-between items-start mb-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0F7673]">Memory Details</div>
              </div>

              <h2 className="font-serif text-3xl text-[#162D3D] mb-5 leading-tight">
                {selectedMemory.caption || selectedMemory.title || "A familiar memory"}
                <SpeakBtn text={selectedMemory.caption || selectedMemory.title || "A familiar memory"} />
              </h2>
              
              <div className="mt-auto">
                <SoftButton onClick={() => { setSelectedMemory(null); setView("journey"); }} className="w-full justify-center">Start Memory Journey</SoftButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. PATIENT COMPANION VIEW
// ==========================================
function PatientCompanionView({ showToast }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState("idle"); 
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const firstName = user.firstName || user.name?.split(' ')[0] || '';
  const [aiResponse, setAiResponse] = useState(`Hello${firstName ? ` ${firstName}` : ''}. I am here to chat whenever you are ready.`);
  const recognitionRef = useRef(null);

  const startListening = () => {
    window.speechSynthesis.cancel();
    setAiResponse('...');
    setTranscript('');
    setState("listening");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return setState("idle");

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = voiceLangMap[lang] || 'en-US';
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onresult = (e) => setTranscript(Array.from(e.results).map(r => r[0].transcript).join(''));
    recognitionRef.current.onend = async () => {
      if (state !== "listening") return; 
      setState("thinking");
      if (transcript.trim() === '') { setAiResponse("I didn't catch that. Could you try again?"); return setState("idle"); }
      await sendToAI(transcript);
    };
    recognitionRef.current.start();
  };

  const stopListening = () => { if (recognitionRef.current && state === "listening") recognitionRef.current.stop(); };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTranscript(textInput);
    setTextInput('');
    setState("thinking");
    window.speechSynthesis.cancel();
    await sendToAI(textInput);
  };

  const sendToAI = async (text) => {
    try {
      const result = await aiService.processCommand(text, user._id || user.id, lang);
      setAiResponse(result.reply);
      speakResponse(result.reply);
    } catch (err) {
      setAiResponse("I am right here with you. Take all the time you need.");
      setState("idle");
    }
  };

  const speakResponse = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLangMap[lang] || 'en-US';
    utterance.onstart = () => setState("speaking");
    utterance.onend = () => setState("idle");
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="animate-in fade-in duration-300 mx-auto max-w-3xl">
      <div className="text-center">
        <SectionLabel>{t('aiCompanionTitle') || 'AI companion'}</SectionLabel>
        <h1 className="font-serif text-4xl tracking-[-0.045em] text-[#162D3D] sm:text-5xl">
          {t('aiCompanionSub') || 'A calm voice, whenever you need it.'}
          <SpeakBtn text={t('aiCompanionSub') || 'A calm voice, whenever you need it.'} />
        </h1>
      </div>
      <div className="relative mx-auto mt-10 flex min-h-[420px] max-w-xl flex-col items-center justify-center overflow-hidden rounded-[30px] bg-[#F1F6F4] px-6 py-12">
        <div className={cx("companion-orbit companion-orbit-one", (state === "listening" || state === "thinking") && "companion-active")} />
        <div className={cx("companion-orbit companion-orbit-two", state === "speaking" && "companion-speaking")} />
        <button onMouseDown={startListening} onMouseUp={stopListening} onTouchStart={startListening} onTouchEnd={stopListening} className={cx("relative z-10 flex h-40 w-40 items-center justify-center rounded-full bg-[#0F7673] text-white shadow-lg transition-all hover:scale-[1.03] active:scale-95", (state === "listening" || state === "thinking") && "bg-[#162D3D]", state === "speaking" && "bg-[#B77C5D]")}>
          {state === "speaking" ? <Volume2 className="h-8 w-8" /> : (state === "listening" || state === "thinking") ? "..." : <Mic2 className="h-8 w-8" />}
        </button>
        <div className="relative mt-10 text-center z-10 w-full">
          <div className="font-serif text-2xl text-[#162D3D] min-h-[64px] flex items-center justify-center">{aiResponse}</div>
          <div className="mt-2 text-sm text-[#0F7673] font-medium h-6 italic">{transcript && `"${transcript}"`}</div>
        </div>
      </div>
      <div className="mt-7 max-w-xl mx-auto w-full">
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Type a message here..." className="flex-1 bg-white border border-[#DCE5E3] rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-[#0F7673]" />
          <button type="submit" disabled={!textInput.trim() || state === "speaking" || state === "thinking"} className="bg-[#0F7673] disabled:bg-[#9AAAB0] text-white px-5 rounded-2xl"><Send className="w-4 h-4" /></button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 4. PATIENT MY DAY VIEW
// ==========================================
function PatientMyDayView({ showToast, reminders, currentTime }) {
  const { t } = useLanguage();
  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const nextUp = reminders.find(r => r.status !== 'Done') || { title: "Relax and enjoy your day", time: "" };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <SectionLabel>{t('calmPlan') || 'Your day'}</SectionLabel>
          <h1 className="font-serif text-4xl text-[#162D3D]">
            {formattedDate.split(',')[0]}, <SpeakBtn text={`Today is ${formattedDate}`} /><br />
            <em className="text-[#0F7673]">{formattedDate.split(',')[1]}.</em>
          </h1>
        </div>
        <div className="rounded-2xl bg-[#162D3D] px-5 py-4 text-white">
          <div className="text-[10px] font-bold uppercase text-white/55">The time now</div>
          <div className="mt-1 font-serif text-3xl">{formattedTime.split(' ')[0]} <span className="text-base text-white/65">{formattedTime.split(' ')[1]}</span></div>
        </div>
      </div>
      <div className="mt-8 border-y border-[#DCE5E3]">
        <div className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E5F0EE] text-[#0F7673]"><CalendarCheck2 className="h-5 w-5" /></div><div><div className="text-sm font-bold text-[#162D3D]">{t('nextUpHeader') || 'Next up'}</div><div className="mt-1 text-xs text-[#78909A]">{nextUp.title} <SpeakBtn text={`Next up is ${nextUp.title}`} /></div></div></div>
        </div>
      </div>
      <div className="mt-9 grid gap-4 md:grid-cols-3">
        {reminders.map(({ icon: Icon, title, time, status }, idx) => (
          <div key={idx} className={cx("rounded-2xl p-5", status === "Ready" ? "bg-[#E5F0EE]" : "bg-white ring-1 ring-inset ring-[#DCE5E3]")}>
            <div className="flex items-start justify-between">
              <div className={cx("flex h-10 w-10 items-center justify-center rounded-xl", status === "Ready" ? "bg-white text-[#0F7673]" : "bg-[#F1F6F4] text-[#71878D]")}><Icon className="h-5 w-5" /></div>
              <span className={cx("rounded-full px-2 py-1 text-[10px] font-bold", status === "Done" ? "bg-[#EAF4E9] text-[#528257]" : status === "Ready" ? "bg-[#0F7673] text-white" : "bg-[#F5F3EC] text-[#9A7A35]")}>{status}</span>
            </div>
            <div className="mt-9 text-sm font-bold text-[#162D3D]">{title}</div>
            <div className="mt-1 text-xs text-[#78909A] flex items-center justify-between">
              {time}
              <SpeakBtn text={`At ${time}, ${title}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 5. THE INTERACTIVE MEMORY JOURNEY QUIZ
// ==========================================
function MemoryJourneyView({ setView, showToast, memories, user }) {
  const { t, lang } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizState, setQuizState] = useState('initial');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [optionsCount, setOptionsCount] = useState(3);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [hintLevel, setHintLevel] = useState(0);
  const [activeHint, setActiveHint] = useState(""); 
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const fetchAdaptive = async () => {
      try {
        const res = await gameService.getAdaptiveDifficulty(user._id || user.id);
        if (res.optionsCount) setOptionsCount(res.optionsCount);
      } catch(e) {}
    };
    if (user._id || user.id) fetchAdaptive();
  }, [user]);

  const currentMemory = memories[currentIndex];

  useEffect(() => {
    if (currentMemory) {
      const suggestions = currentMemory.aiSuggestions || {};
      const validPlace = suggestions.place?.trim();
      const validPeople = (suggestions.people || []).filter(p => p && p.trim() !== '');
      let correct = validPlace || validPeople[0] || currentMemory.caption || "A familiar memory";
      setCorrectAnswer(correct);

      const wrongPool = ["A family holiday", "At a friend's house", "During a festival", "At the local park", "A vacation spot"];
      const shuffledWrong = wrongPool.sort(() => 0.5 - Math.random());
      
      let generated = [correct];
      if (optionsCount >= 2) generated.push(shuffledWrong[0]);
      if (optionsCount >= 3) generated.push(shuffledWrong[1]);
      if (optionsCount >= 4) generated.push(shuffledWrong[2]);

      setCurrentOptions(generated.sort(() => 0.5 - Math.random()));
      setQuizState('initial');
      setHintLevel(0);
      setActiveHint(""); 
      startTime.current = Date.now();
    }
  }, [currentMemory, optionsCount]);

  const logInteraction = async (isCorrect) => {
    try {
      await gameService.logInteraction(user._id || user.id, currentMemory._id, isCorrect, Date.now() - startTime.current);
    } catch(e) {}
  };

  const handleIRemember = () => setQuizState('guessing');

  const handleOptionSelect = (opt) => {
    const isCorrect = (opt === correctAnswer);
    if (isCorrect) correctCount.current += 1;
    logInteraction(isCorrect);
    setFeedbackMsg(isCorrect ? "Correct! Well done." : "Not quite, but that's a great guess.");
    setQuizState('feedback');
    playVoice(isCorrect ? "Correct! Well done." : "Not quite, but that's a great guess.", lang);
  };

  const handleForgot = () => {
    logInteraction(false);
    setFeedbackMsg(`That is perfectly fine! This was ${correctAnswer}.`);
    setQuizState('feedback');
    playVoice(`That is perfectly fine! This was ${correctAnswer}.`, lang);
  };

  const handleHint = () => {
    setHintLevel(prev => prev + 1);
    const suggestions = currentMemory?.aiSuggestions || {};
    let newHint = "";
    if (hintLevel === 0) newHint = `This looks like it happened during a ${suggestions.event || 'special gathering'}.`;
    else if (hintLevel === 1) newHint = `I can see ${suggestions.people?.join(', ') || 'loved ones'} here in the photo.`;
    else newHint = "Take your time and look closely at the surroundings.";

    setActiveHint(newHint);
    playVoice(newHint, lang);
  };

  const handleNext = async () => {
    if (currentIndex < memories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      try {
        const payload = { patientId: user._id || user.id, gameName: 'Memory Journey', score: correctCount.current * 100, accuracy: Math.round((correctCount.current / memories.length) * 100), uuid: crypto.randomUUID() };
        await gameService.saveGameSession(user._id || user.id, payload);
      } catch(e) {}
      setQuizState('completed');
    }
  };

  if (memories.length === 0) return <div className="text-center font-serif text-xl text-[#78909A] py-20">Loading your journey...</div>;
  if (quizState === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="font-serif text-4xl text-[#162D3D] mb-4">Journey Complete <SpeakBtn text="Journey Complete" /></h1>
        <p className="text-[#647980] mb-8">Well done, {user.firstName || 'Patient'}.</p>
        <SoftButton onClick={() => setView("home")}>Return to Dashboard</SoftButton>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 w-full max-w-5xl mx-auto flex flex-col justify-center min-h-[65vh]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <button onClick={() => { window.speechSynthesis.cancel(); setView("home"); }} className="flex items-center gap-2 text-sm font-bold text-[#6F858D] hover:text-[#162D3D] transition"><X className="h-4 w-4" /> Close journey</button>
        <div className="flex items-center gap-2 text-xs font-bold text-[#78909A]"><span>Memory journey</span><span className="text-[#B8C5C8]">·</span><span>{currentIndex + 1} of {memories.length}</span></div>
      </div>
      <div className="w-full overflow-hidden rounded-[30px] bg-[#162D3D] shadow-[0_24px_60px_rgba(22,45,61,0.16)] flex flex-col md:flex-row">
        <div className="relative min-h-[300px] md:min-h-[540px] md:w-[47%] shrink-0">
          <img src={getMediaUrl(currentMemory.mediaUrl)} alt="Memory" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#162D3D]/80 via-[#162D3D]/20 to-transparent" />
          <div className="absolute bottom-6 left-7 right-7 text-white">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">{currentMemory.aiSuggestions?.place || 'Memory'} {currentMemory.createdAt ? `· ${new Date(currentMemory.createdAt).getFullYear()}` : ''}</div>
            <div className="mt-2 font-serif text-2xl tracking-[-0.03em] drop-shadow-md">{currentMemory.caption || ""}</div>
          </div>
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-12 text-white w-full relative overflow-y-auto hide-scrollbar">
          {quizState === 'initial' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-sm font-semibold text-[#B7D8CE]">Let's revisit a familiar moment. <SpeakBtn text="Let's revisit a familiar moment." /></div>
              <h1 className="mt-5 font-serif text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl mb-5">Do you remember where this was? <SpeakBtn text="Do you remember where this was?" /></h1>
              <p className="max-w-sm text-sm leading-6 text-white/65 mb-6">There is no right or wrong answer. We can look at it together.</p>
              {activeHint && (
                <div className="mb-6 rounded-2xl bg-[#0F7673]/20 border border-[#0F7673]/40 p-5 text-[#D4E8E0] text-[15px] font-medium leading-relaxed animate-in fade-in zoom-in duration-300">
                  <Sparkles className="inline-block w-4 h-4 mr-2 mb-0.5 text-[#B7D8CE]" /> {activeHint}
                </div>
              )}
              <div className="space-y-3">
                <button onClick={handleIRemember} className="flex min-h-14 w-full items-center justify-between rounded-xl border border-[#7AB7AA] bg-[#0F7673] px-4 text-left text-sm font-bold text-white hover:bg-[#168A85] transition active:scale-[0.99]"><span>I remember</span> <ArrowRight className="h-4 w-4 opacity-60" /></button>
                <button onClick={handleForgot} className="flex min-h-14 w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 text-left text-sm font-bold text-white/80 hover:bg-white/10 transition active:scale-[0.99]"><span>Not sure</span> <ArrowRight className="h-4 w-4 opacity-60" /></button>
                <button onClick={handleHint} className="flex min-h-14 w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 text-left text-sm font-bold text-white/80 hover:bg-white/10 transition active:scale-[0.99]"><span>Tell me more</span> <Volume2 className="h-4 w-4 opacity-60" /></button>
              </div>
            </div>
          )}
          {quizState === 'guessing' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-sm font-semibold text-[#B7D8CE]">Take your time.</div>
              <h1 className="mt-5 font-serif text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl mb-9">Which one looks right? <SpeakBtn text="Which one looks right?" /></h1>
              <div className="space-y-3">
                {currentOptions.map((opt, idx) => (
                  <button key={idx} onClick={() => handleOptionSelect(opt)} className="flex min-h-14 w-full items-center justify-between rounded-xl border border-[#7AB7AA] bg-[#0F7673] px-4 text-left text-sm font-bold text-white hover:bg-[#168A85] transition active:scale-[0.99]">
                    <span>{opt}</span>
                    <Volume2 className="h-4 w-4 opacity-60" onClick={(e) => { e.stopPropagation(); playVoice(opt, lang); }} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {quizState === 'feedback' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0F7673] text-white mb-6"><Sparkles className="w-6 h-6" /></div>
              <h1 className="font-serif text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl mb-4">{feedbackMsg} <SpeakBtn text={feedbackMsg} /></h1>
              <p className="text-white/80 text-lg leading-relaxed mb-9">{currentMemory.aiSuggestions?.place ? `This was at ${currentMemory.aiSuggestions.place}.` : ""} {currentMemory.caption}</p>
              <button onClick={handleNext} className="flex min-h-14 w-full items-center justify-between rounded-xl border border-transparent bg-white px-4 text-left text-sm font-bold text-[#162D3D] hover:bg-gray-100 transition active:scale-[0.99]"><span>{currentIndex < memories.length - 1 ? "Next memory" : "Finish journey"}</span> <ArrowRight className="h-4 w-4 opacity-60" /></button>
            </div>
          )}
          <div className="mt-9 flex gap-1.5 absolute bottom-8 right-12">
            {memories.map((_, index) => <div key={index} className={cx("h-1 rounded-full transition-all", index === currentIndex ? "w-8 bg-[#B7D8CE]" : "w-2 bg-white/25")} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN APP ROUTER (PATIENT HOME)
// ==========================================
export default function PatientHome() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [view, setView] = useState("home");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [toastMessage, setToastMessage] = useState("");
  const [comfort, setComfort] = useState(false);

  const [todayMemory, setTodayMemory] = useState(null);
  const [allMemories, setAllMemories] = useState([]);
  const [allReminders, setAllReminders] = useState([]);
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const snoozedRef = useRef({});

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const firstName = user.firstName || user.name?.split(' ')[0] || '';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleLogout = () => {
    if (!window.confirm("Log out?")) return;
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/"); 
  };

  const [profilePic, setProfilePic] = useState(() => localStorage.getItem('patient_profile_pic') || null);
  const [profileData, setProfileData] = useState(() => {
    const saved = localStorage.getItem('patient_profile_data');
    return saved ? JSON.parse(saved) : {
      name: "Chetan Sharma P.",
      dob: "2007-06-11",
      location: "Mysuru, Karnataka",
      emergencyContact: "Sunitha Dubey (Mother)"
    };
  });

  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 5000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user._id && !user.id) return;
      const patientId = user._id || user.id;
      
      try {
        const mems = await memoryService.getPatientMemories(patientId);
        if (mems && mems.length > 0) {
          setTodayMemory(mems[0]);
          setAllMemories(mems);
        }
      } catch (err) {}
      
      try {
        const rems = await reminderService.getReminders(patientId);
        setAllReminders(rems);
      } catch (err) {}
    };
    fetchDashboardData();
  }, [user._id, user.id]);

  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const recentDisplay = allMemories.slice(0, 3).map((mem) => ({
    id: mem._id, image: getMediaUrl(mem.mediaUrl), label: mem.caption || mem.title || "",
    meta: mem.aiSuggestions?.place || ""
  }));

  const handleAcknowledge = async () => {
    if (!activeAlarm) return;
    try { 
      await reminderService.updateStatus(activeAlarm._id || activeAlarm.id, 'completed');
      setAllReminders(prev => prev.map(r => (r._id === activeAlarm._id || r.id === activeAlarm.id) ? { ...r, status: 'completed' } : r));
    } catch (err) {}
    setActiveAlarm(null);
  };

  const handleSnooze = async () => {
    if (!activeAlarm) return;
    snoozedRef.current[activeAlarm._id] = Date.now() + 300000; 
    setActiveAlarm(null);
    showToast("We will gently remind you again in 5 minutes.");
  };

  return (
    <div className={cx("animate-page min-h-screen transition-all duration-700 ease-in-out", comfort ? "bg-[#FCF9F2]" : "bg-[#FAFBFB]")}>
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} />}
      
      <TopBar 
        role="Patient" 
        offline={offline} 
        setOffline={setOffline} 
        comfort={comfort} 
        setComfort={setComfort} 
        onProfileClick={() => setView("profile")}
        profilePic={profilePic}
      />

      <PatientShell view={view} setView={setView}>
        {/* GLOBAL LANGUAGE SELECTOR FOR PATIENT */}
        <div className="flex items-center justify-between p-4 border border-[#DCE5E3] rounded-xl bg-[#F1F6F4] mb-6 shadow-sm">
          <span className="font-bold text-[#162D3D]">{t('interfaceLanguage') || 'Interface Language'}</span>
          <LanguageSelector />
        </div>

        {view === "home" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0F7673]">
                  <span className="h-2 w-2 rounded-full bg-[#0F7673] animate-pulse" /> {formattedDate} · {formattedTime}
                </div>
                <h1 className="max-w-xl font-serif text-4xl text-[#162D3D] sm:text-5xl">
                  {t('goodMorning') || 'Good morning'},<br /><em className="text-[#0F7673] capitalize">{firstName}.</em>
                  <SpeakBtn text={`${t('goodMorning') || 'Good morning'}, ${firstName}.`} />
                </h1>
              </div>
            </div>
            
            <div className="mt-9 grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
              <section className="relative min-h-[380px] overflow-hidden rounded-[28px] bg-[#162D3D] p-7 text-white sm:p-9 shadow-[0_24px_55px_rgba(22,45,61,0.16)]">
                {todayMemory?.mediaUrl && <img src={getMediaUrl(todayMemory.mediaUrl)} className="absolute inset-0 h-full w-full object-cover opacity-50 z-0" />}
                <div className="absolute inset-0 bg-gradient-to-r from-[#162D3D]/90 via-[#162D3D]/60 to-transparent z-0" />
                
                <div className="relative z-10 flex h-full min-h-[320px] max-w-xl flex-col justify-between">
                  <div>
                    <div className="mb-7 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 drop-shadow-md">
                      <Sparkles className="h-4 w-4 text-[#B7D8CE]" /> {t('gentleCheckIn') || "Today's gentle activity"}
                    </div>
                    <h2 className="max-w-md font-serif text-4xl leading-[1.04] text-white">
                      A familiar place<br /><em className="text-[#B7D8CE]">to begin.</em>
                      <SpeakBtn text="A familiar place to begin." />
                    </h2>
                    <p className="mt-4 max-w-sm text-sm leading-6 text-white drop-shadow-md font-medium">
                      {todayMemory?.caption || ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <SoftButton variant="light" onClick={() => setView("journey")} icon={<ArrowRight className="h-4 w-4" />}>
                      {t('beginTogether') || 'Begin together'}
                    </SoftButton>
                    <button 
                      onClick={() => setView("reels")} 
                      className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20 transition backdrop-blur-sm border border-white/20"
                    >
                      <Play className="h-4 w-4" fill="currentColor" /> {t('watchReels') || 'Watch Daily Reels'}
                    </button>
                  </div>
                </div>
              </section>
              
              <section className="flex flex-col justify-between rounded-[28px] border border-[#DCE5E3] bg-[#F1F6F4] p-7 sm:p-8">
                <div>
                  <SectionLabel>{t('howFeeling') || 'How are you feeling?'}</SectionLabel>
                  <p className="max-w-xs font-serif text-3xl text-[#162D3D]">
                    {t('feelingSub') || 'Your day can be taken one moment at a time.'}
                    <SpeakBtn text={t('feelingSub') || 'Your day can be taken one moment at a time.'} />
                  </p>
                </div>
                <div className="mt-8">
                  <button onClick={() => setView("companion")} className="group flex w-full items-center justify-between border-t border-[#CDDCD8] py-4 text-left">
                    <span>
                      <span className="block text-sm font-bold text-[#162D3D]">{t('talkCompanion') || 'Talk with your companion'}</span>
                      <span className="mt-1 block text-xs text-[#78909A]">{t('companionSubText') || "I'm here to listen."}</span>
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0F7673]"><Mic2 className="h-4 w-4" /></span>
                  </button>
                  <button onClick={() => setView("myday")} className="group flex w-full items-center justify-between border-t border-[#CDDCD8] py-4 text-left">
                    <span>
                      <span className="block text-sm font-bold text-[#162D3D]">{t('seeWhatsNext') || "See what's next"}</span>
                      <span className="mt-1 block text-xs text-[#78909A]">{t('calmPlan') || "Your calm plan for today."}</span>
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0F7673]"><CalendarDays className="h-4 w-4" /></span>
                  </button>
                </div>
              </section>
            </div>
            
            <div className="mt-10 flex items-end justify-between">
              <div>
                <SectionLabel>{t('memoryVaultTitle') || 'Your memories'}</SectionLabel>
                <h2 className="font-serif text-3xl text-[#162D3D]">
                  {t('littleWindows') || 'Little windows into your life'}
                  <SpeakBtn text={t('littleWindows') || 'Little windows into your life'} />
                </h2>
              </div>
            </div>
            
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {recentDisplay.map((tile, idx) => (
                <MemoryTile key={tile.id || idx} image={tile.image} label={tile.label} meta={tile.meta} onClick={() => setView("reels")} large={idx === 0} />
              ))}
              <button onClick={() => setView("memories")} className="group flex min-h-[170px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#B9CFCA] bg-[#F4F8F7] p-4 text-center">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0F7673] shadow-sm"><Images className="h-4 w-4" /></span>
                <span className="text-sm font-bold text-[#162D3D]">{t('openVault') || 'Open memory vault'}</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW: PATIENT PROFILE */}
        {view === "profile" && (
          <div className="max-w-4xl space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-8 sm:p-10 rounded-[24px] shadow-sm border border-[#DCE5E3]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#F1F6F4] pb-6 mb-8">
                <div>
                  <h2 className="text-2xl font-serif text-[#162D3D] tracking-tight">
                    {t('patientProfile') || 'Patient Profile'}
                    <SpeakBtn text={t('patientProfile') || 'Patient Profile'} />
                  </h2>
                  <p className="text-sm text-[#78909A] mt-1">{t('managePrefs') || 'Manage your personal details and application preferences.'}</p>
                </div>
                
                <div className="flex items-center gap-3 mt-4 sm:mt-0">
                  <button 
                    onClick={handleLogout}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors shadow-sm"
                  >
                    {t('logout') || 'Log Out'}
                  </button>
                  
                  <SoftButton onClick={() => {
                    localStorage.setItem('patient_profile_data', JSON.stringify(profileData));
                    
                    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                    currentUser.name = profileData.name;
                    localStorage.setItem("user", JSON.stringify(currentUser));

                    showToast("Profile details successfully saved!");
                    setTimeout(() => setView("home"), 800);
                  }} className="bg-[#0F7673] text-white">
                    {t('saveChanges') || 'Save Changes'}
                  </SoftButton>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-[#F1F6F4] shadow-inner bg-[#F8FAFA] flex items-center justify-center group">
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserRound className="w-12 h-12 text-[#9AAAB0]" />
                    )}
                    
                    <label htmlFor="profile-upload" className="absolute inset-0 bg-[#162D3D]/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <UploadCloud className="w-6 h-6 text-white" />
                    </label>
                    <input 
                      id="profile-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64String = reader.result;
                            setProfilePic(base64String);
                            localStorage.setItem('patient_profile_pic', base64String);
                            showToast("Profile picture saved.");
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-[#162D3D]">{t('profilePhoto') || 'Profile Photo'}</p>
                    <p className="text-[10px] text-[#78909A] mt-1">{t('imageConstraint') || 'JPG or PNG, max 2MB'}</p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#78909A] uppercase tracking-wider mb-2">{t('fullName') || 'Full Name'}</label>
                    <input type="text" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} className="w-full border border-[#DCE5E3] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0F7673] bg-[#F8FAFA] text-[#162D3D] font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#78909A] uppercase tracking-wider mb-2">{t('dob') || 'Date of Birth'}</label>
                    <input type="date" value={profileData.dob} onChange={(e) => setProfileData({...profileData, dob: e.target.value})} className="w-full border border-[#DCE5E3] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0F7673] bg-[#F8FAFA] text-[#162D3D] font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#78909A] uppercase tracking-wider mb-2">{t('location') || 'Location'}</label>
                    <input type="text" value={profileData.location} onChange={(e) => setProfileData({...profileData, location: e.target.value})} className="w-full border border-[#DCE5E3] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0F7673] bg-[#F8FAFA] text-[#162D3D] font-medium" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#78909A] uppercase tracking-wider mb-2">{t('emergencyContact') || 'Emergency Contact'}</label>
                    <input type="text" value={profileData.emergencyContact} onChange={(e) => setProfileData({...profileData, emergencyContact: e.target.value})} className="w-full border border-[#DCE5E3] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0F7673] bg-[#F8FAFA] text-[#162D3D] font-medium" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "memories" && <PatientMemoriesView setView={setView} showToast={showToast} memories={allMemories} loading={false} user={user} />}
        {view === "companion" && <PatientCompanionView showToast={showToast} />}
        {view === "myday" && <PatientMyDayView showToast={showToast} reminders={allReminders} currentTime={currentTime} />}
        {view === "journey" && <MemoryJourneyView setView={setView} showToast={showToast} memories={allMemories} user={user} />}
        {view === "reels" && <PatientReelsView setView={setView} showToast={showToast} memories={allMemories} />}
        
      </PatientShell>

      {/* Alarm Modal at Root */}
      {activeAlarm && (
        <div className="fixed inset-0 bg-[#092026]/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 text-center shadow-2xl transform scale-100 animate-in zoom-in duration-300 border-2 border-[#DCE5E3]">
            <div className="w-24 h-24 bg-[#E5F0EE] rounded-full flex items-center justify-center mx-auto mb-6 relative shadow-inner">
              <span className="absolute w-full h-full rounded-full bg-[#9FC4BC] animate-ping opacity-30"></span>
              <Bell className="text-[#0F7673] w-10 h-10 relative z-10" />
            </div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#78909A] mb-2">Scheduled Reminder</h2>
            <div className="mb-8 p-6 bg-[#F8FAFA] rounded-2xl border border-[#DCE5E3]">
              <p className="text-2xl text-[#162D3D] font-serif font-bold leading-tight">{activeAlarm.title}</p>
              <SpeakBtn text={`Reminder for: ${activeAlarm.title}`} />
            </div>
            <button onClick={handleAcknowledge} className="w-full bg-[#0F7673] hover:bg-[#0A5A58] text-white font-bold text-lg py-5 rounded-2xl shadow-lg transition-all active:scale-95 mb-3 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-6 h-6" /> Got it, thanks!
            </button>
            <button onClick={handleSnooze} className="w-full bg-[#F1F6F4] hover:bg-[#E5F0EE] text-[#6F858D] font-bold text-md py-4 rounded-2xl transition-colors flex items-center justify-center gap-2">
              <Clock3 className="w-5 h-5" /> Remind me later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}