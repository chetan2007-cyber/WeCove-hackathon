import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Sparkles, CheckCircle2, RefreshCcw, Award } from 'lucide-react';
import memoryService from '../services/memoryService';
import gameService from '../services/gameService';
import voiceService from '../services/voiceService';
import notificationService from '../services/notificationService';
import { useLanguage } from '../context/LanguageContext';

export default function MemoryJourney() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const [memories, setMemories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionState, setSessionState] = useState('loading'); // 'loading' | 'active' | 'feedback' | 'completed'
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [startTime, setStartTime] = useState(Date.now());

  // Interactive Options & Adaptive Tuning
  const [currentOptions, setCurrentOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [difficultyInfo, setDifficultyInfo] = useState({ difficulty: 'MEDIUM', optionsCount: 3 });
  const [isListening, setIsListening] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const correctCount = useRef(0);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const patientId = user?._id || user?.id || '11111111-1111-1111-1111-111111111111';

  // 1. Fetch Session Data & Adaptive Difficulty Tuning
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setSessionState('loading');
        
        // Fetch adaptive difficulty
        const diff = await gameService.getAdaptiveDifficulty(patientId);
        setDifficultyInfo(diff);

        // Fetch memories
        const loadedMemories = await memoryService.getPatientMemories(patientId);
        if (loadedMemories && loadedMemories.length > 0) {
          setMemories(loadedMemories);
          setSessionState('active');
          setStartTime(Date.now());
        } else {
          setSessionState('completed');
        }
      } catch (err) {
        console.warn('Memory Journey initialization fallback', err);
        setSessionState('completed');
      }
    };

    initializeSession();
  }, [patientId, nodeId]);

  const currentMemory = memories[currentIndex];

  // 2. Generate Options based on Adaptive Difficulty
  useEffect(() => {
    if (!currentMemory) return;

    const suggestions = currentMemory.aiSuggestions || {};
    const validPeople = (suggestions.people || []).filter(p => p && p.trim() !== '');
    const validPlace = suggestions.place?.trim() || null;

    let correct = "A beautiful family memory";
    if (validPeople.length > 0) {
      correct = validPeople[0];
    } else if (validPlace) {
      correct = validPlace;
    } else if (currentMemory.caption?.trim()) {
      correct = currentMemory.caption;
    }

    setCorrectAnswer(correct);

    const distractor1 = validPeople.length > 0 ? "A neighbor from the town" : "A park in the neighborhood";
    const distractor2 = validPeople.length > 0 ? "Someone from the news" : "A market street";
    const distractor3 = "A photo from television";

    let options = [correct];
    if (difficultyInfo.optionsCount === 2) {
      options.push(distractor1);
    } else if (difficultyInfo.optionsCount === 3) {
      options.push(distractor1, distractor2);
    } else {
      options.push(distractor1, distractor2, distractor3);
    }

    // Shuffle options
    setCurrentOptions(options.sort(() => Math.random() - 0.5));
  }, [currentMemory, difficultyInfo]);

  // 3. Move to next memory or finish game session
  const handleNext = useCallback(async () => {
    if (currentIndex + 1 < memories.length) {
      setCurrentIndex(prev => prev + 1);
      setSessionState('active');
      setFeedbackMsg('');
      setStartTime(Date.now());
    } else {
      setSessionState('completed');
      
      const total = memories.length || 1;
      const accuracy = Math.round((correctCount.current / total) * 100);
      const calculatedScore = correctCount.current * 100;
      setFinalScore(calculatedScore);

      notificationService.playCalmChime();

      await gameService.saveGameSession(patientId, {
        gameName: 'Memory Journey',
        score: calculatedScore,
        accuracy,
        difficulty: difficultyInfo.difficulty
      });
    }
  }, [currentIndex, memories.length, patientId, difficultyInfo.difficulty]);

  // 4. Handle Option Selection
  const handleOptionSelect = (selected) => {
    if (sessionState === 'feedback') return;

    const isCorrect = selected === correctAnswer;
    const responseTime = Date.now() - startTime;

    if (isCorrect) {
      correctCount.current += 1;
      setFeedbackMsg("Wonderful! That is correct.");
      voiceService.speak("Wonderful! You remembered correctly.", lang);
    } else {
      setFeedbackMsg("Good try! Take a moment to look at this memory.");
      voiceService.speak("Good try. A lovely memory to cherish.", lang);
    }

    gameService.logInteraction(patientId, currentMemory?._id, isCorrect, responseTime);
    setSessionState('feedback');

    setTimeout(() => {
      handleNext();
    }, 2800);
  };

  // 5. Speech Recognition for Voice Answers
  const startVoiceAnswer = () => {
    voiceService.startListening(
      lang,
      null,
      (transcript) => {
        setIsListening(false);
        if (!transcript) return;
        const matched = currentOptions.find(opt => 
          transcript.toLowerCase().includes(opt.toLowerCase()) || 
          opt.toLowerCase().includes(transcript.toLowerCase())
        );
        if (matched) {
          handleOptionSelect(matched);
        } else {
          setFeedbackMsg(`I heard "${transcript}". Let's select from the options.`);
        }
      },
      () => setIsListening(false)
    );
    setIsListening(true);
  };

  if (sessionState === 'loading') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-[#162D3D]">
        <div className="text-center">
          <RefreshCcw className="w-10 h-10 animate-spin text-[#0F7673] mx-auto mb-4" />
          <h2 className="font-serif text-2xl">Preparing your Memory Journey...</h2>
          <p className="text-sm text-slate-500 mt-2">Personalizing exercises to your pace.</p>
        </div>
      </div>
    );
  }

  if (sessionState === 'completed') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-[#162D3D]">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#E5F0EE] text-[#0F7673] mx-auto flex items-center justify-center shadow-inner">
            <Award className="w-10 h-10" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">Session Completed</span>
            <h1 className="font-serif text-3xl font-bold mt-1 text-[#162D3D]">Great job today!</h1>
            <p className="text-sm text-slate-600 mt-2">
              You completed your Memory Journey with {correctCount.current} out of {memories.length || 1} moments recognized.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-around">
            <div>
              <span className="text-xs text-slate-500 block">Score</span>
              <span className="text-2xl font-bold text-[#0F7673]">{finalScore}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Difficulty</span>
              <span className="text-2xl font-bold text-slate-800">{difficultyInfo.difficulty}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/patient')}
              className="flex-1 py-3.5 px-4 rounded-xl bg-[#0F7673] hover:bg-[#0C625F] text-white font-semibold transition"
            >
              Return Home
            </button>
            <button
              onClick={() => navigate('/patient/constellation')}
              className="py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
            >
              View Constellation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/patient')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Journey</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E5F0EE] text-[#0F7673]">
            <Sparkles className="w-3.5 h-3.5" />
            Mode: {difficultyInfo.difficulty}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Moment {currentIndex + 1} of {memories.length}
          </span>
        </div>
      </header>

      {/* Question / Memory Presentation Card */}
      <main className="max-w-3xl mx-auto w-full flex-1 flex flex-col items-center justify-center">
        <div className="bg-white w-full rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200 space-y-6">
          
          {/* Photo Display */}
          <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
            <img
              src={currentMemory?.mediaUrl || '/manus-storage/shillong_cd371abe.jpg'}
              alt="Memory cue"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Prompt */}
          <div className="text-center space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl text-[#162D3D] font-bold">
              Who or what is featured in this memory?
            </h2>
            <p className="text-sm text-slate-500">
              Select the best match below, or press the microphone to answer with your voice.
            </p>
          </div>

          {/* Feedback banner */}
          {feedbackMsg && (
            <div className={`p-4 rounded-xl text-center font-bold text-sm flex items-center justify-center gap-2 ${
              feedbackMsg.includes('Wonderful') ? 'bg-[#E5F0EE] text-[#0F7673]' : 'bg-[#F6E9E6] text-[#9B4D45]'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Interactive Multiple Choice Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentOptions.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionSelect(option)}
                disabled={sessionState === 'feedback'}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-[#0F7673] hover:bg-[#E5F0EE]/40 text-slate-800 font-semibold text-base sm:text-lg transition active:scale-[0.98] text-left"
              >
                {option}
              </button>
            ))}
          </div>

          {/* Voice Answer Button */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={startVoiceAnswer}
              disabled={isListening || sessionState === 'feedback'}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{isListening ? "Listening... Speak your answer" : "Answer with voice"}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Progress Footer */}
      <footer className="max-w-3xl mx-auto w-full pt-6">
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-[#0F7673] h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / memories.length) * 100}%` }}
          />
        </div>
      </footer>
    </div>
  );
}