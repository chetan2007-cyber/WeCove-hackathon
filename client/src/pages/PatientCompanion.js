import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic2, Volume2, Send, ArrowLeft, CheckCircle2 } from "lucide-react";
import { cx, SectionLabel } from "../components/shared";
import aiService from "../services/aiService";
import voiceService from "../services/voiceService";
import { useLanguage } from "../context/LanguageContext";

export default function PatientCompanion({ showToast }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const [state, setState] = useState("idle"); // "idle" | "listening" | "speaking" | "thinking"
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [actionNotice, setActionNotice] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName = user.name?.split(' ')[0] || user.firstName || 'Chetan';
  const patientId = user?._id || user?.id || '11111111-1111-1111-1111-111111111111';

  const [aiResponse, setAiResponse] = useState(
    `Hello, ${firstName}. I am right here with you. What would you like to do?`
  );

  const startListening = () => {
    voiceService.stopSpeaking();
    setTranscript('');
    setActionNotice(null);
    setState("listening");

    voiceService.startListening(
      lang,
      (interim) => setTranscript(interim),
      async (finalText) => {
        if (!finalText) {
          setState("idle");
          return;
        }
        setTranscript(finalText);
        setState("thinking");
        await handleCommandExecution(finalText);
      },
      (err) => {
        console.warn('Voice recognition error', err);
        setState("idle");
        if (showToast) showToast("Could not catch voice. Try speaking closer or typing below.");
      }
    );
  };

  const stopListening = () => {
    voiceService.stopListening();
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const submitted = textInput.trim();
    setTranscript(submitted);
    setTextInput('');
    setActionNotice(null);
    setState("thinking");

    await handleCommandExecution(submitted);
  };

  const handleCommandExecution = async (text) => {
    try {
      const result = await aiService.processCommand(text, patientId, lang);
      setAiResponse(result.reply);

      if (result.action) {
        setActionNotice({
          text: `Action triggered: ${result.intent}`,
          path: result.action
        });
      }

      // Speak the response warmly
      voiceService.speak(
        result.reply,
        lang,
        () => setState("speaking"),
        () => {
          setState("idle");
          // If a navigation action was triggered (e.g. playing game), navigate after speaking
          if (result.action && (result.intent === 'PLAY_GAME' || result.intent === 'SHOW_MEMORIES')) {
            setTimeout(() => navigate(result.action), 800);
          }
        }
      );
    } catch (err) {
      const fallback = "I am right here with you. Take all the time you need.";
      setAiResponse(fallback);
      voiceService.speak(fallback, lang, () => setState("speaking"), () => setState("idle"));
    }
  };

  return (
    <div className="animate-page mx-auto max-w-3xl p-4 sm:p-6">
      {/* Back button */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/patient')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back home</span>
        </button>
      </div>

      <div className="text-center">
        <SectionLabel>AI companion</SectionLabel>
        <h1 className="font-serif text-4xl tracking-[-0.045em] text-[#162D3D] sm:text-5xl">
          A calm voice,<br /><em className="text-[#0F7673]">whenever you need it.</em>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#6F858D]">
          Press and hold to speak naturally, or type below. Try saying: <em>"Remind me to drink water"</em> or <em>"I want to play"</em>.
        </p>
      </div>

      {/* Orbit Voice Sphere */}
      <div className="relative mx-auto mt-10 flex min-h-[420px] max-w-xl flex-col items-center justify-center overflow-hidden rounded-[32px] bg-[#F1F6F4] px-6 py-12 shadow-sm border border-[#DCE5E3]">
        <div className={cx("companion-orbit companion-orbit-one", (state === "listening" || state === "thinking") && "companion-active")} />
        <div className={cx("companion-orbit companion-orbit-two", state === "speaking" && "companion-speaking")} />
        
        <button 
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          aria-label={state === "listening" ? "Release to send" : "Hold to speak"} 
          className={cx(
            "relative flex h-36 w-36 sm:h-40 sm:w-40 items-center justify-center rounded-full bg-[#0F7673] text-white shadow-[0_18px_50px_rgba(15,118,115,0.28)] transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer", 
            (state === "listening" || state === "thinking") && "scale-105 bg-[#162D3D]", 
            state === "speaking" && "bg-[#B77C5D]"
          )}
        >
          <div className="absolute inset-[-12px] rounded-full border border-[#0F7673]/15" />
          <div className="absolute inset-[-28px] rounded-full border border-[#0F7673]/10" />
          {state === "speaking" ? (
            <Volume2 className="h-8 w-8 animate-pulse" />
          ) : (state === "listening" || state === "thinking") ? (
            <div className="flex gap-1.5">
              <span className="h-6 w-1.5 animate-pulse rounded-full bg-white" />
              <span className="h-10 w-1.5 animate-pulse rounded-full bg-white [animation-delay:150ms]" />
              <span className="h-7 w-1.5 animate-pulse rounded-full bg-white [animation-delay:300ms]" />
            </div>
          ) : (
            <Mic2 className="h-8 w-8" />
          )}
        </button>

        <div className="relative mt-10 text-center z-10 w-full px-4">
          <div className="font-serif text-2xl tracking-[-0.03em] text-[#162D3D] min-h-[64px] flex items-center justify-center">
            {aiResponse}
          </div>
          
          {transcript && (
            <div className="mt-2 text-sm text-[#0F7673] font-medium h-6 italic">
              "{transcript}"
            </div>
          )}

          {actionNotice && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E5F0EE] text-[#0F7673] text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{actionNotice.text}</span>
            </div>
          )}

          <div className="mt-3 text-xs text-[#6F858D] font-medium">
            {state === "idle" ? "Hold the circle to speak, or release when done." : state === "thinking" ? "Understanding your words..." : state === "listening" ? "Listening... Take your time." : "Speaking to you warmly."}
          </div>
        </div>
      </div>

      {/* Text Input Fallback */}
      <div className="mt-7 max-w-xl mx-auto w-full">
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a request (e.g. Remind me to drink water at 5 PM)..."
            className="flex-1 bg-white border border-[#DCE5E3] rounded-2xl px-5 py-3.5 text-sm text-[#162D3D] focus:outline-none focus:border-[#0F7673] focus:ring-2 focus:ring-[#0F7673]/10 transition"
          />
          <button 
            type="submit" 
            disabled={!textInput.trim() || state === "thinking"} 
            className="bg-[#0F7673] hover:bg-[#0C625F] disabled:bg-[#9AAAB0] text-white px-5 rounded-2xl transition flex items-center justify-center shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}