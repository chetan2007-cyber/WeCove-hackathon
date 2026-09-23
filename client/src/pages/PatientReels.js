import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronUp, ChevronDown, Volume2, Heart, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import memoryService from '../services/memoryService';
import voiceService from '../services/voiceService';
import { useLanguage } from '../context/LanguageContext';

export default function PatientReels() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReels = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const patientId = user?._id || user?.id || '11111111-1111-1111-1111-111111111111';
        const memories = await memoryService.getPatientMemories(patientId);

        // Transform memories into interactive reel cards
        const generatedReels = memories.map((mem, idx) => {
          const suggestions = mem.aiSuggestions || {};
          const primarySubject = (suggestions.people && suggestions.people[0]) || suggestions.place || 'Family';
          
          return {
            id: mem._id || `reel-${idx}`,
            type: idx % 2 === 0 ? 'memory_quiz' : 'memory_photo',
            mediaUrl: mem.mediaUrl || '/manus-storage/shillong_cd371abe.jpg',
            caption: mem.caption || suggestions.place || 'A cherished family moment',
            dateCues: suggestions.dateCues || 'A warm afternoon',
            mood: suggestions.mood || 'Joyful & Calm',
            question: `Who or what is pictured in this memory?`,
            correctAnswer: primarySubject,
            options: [
              primarySubject,
              'A neighbor from town',
              'A scene from television'
            ].sort(() => Math.random() - 0.5)
          };
        });

        if (generatedReels.length === 0) {
          generatedReels.push({
            id: 'fallback-1',
            type: 'memory_photo',
            mediaUrl: '/manus-storage/shillong_cd371abe.jpg',
            caption: 'Trip to Umiam Lake, Shillong',
            dateCues: 'Spring afternoon',
            mood: 'Serene',
            question: 'Where was this beautiful photo taken?',
            correctAnswer: 'Shillong',
            options: ['Shillong', 'Guwahati Station', 'Kaziranga Park']
          });
        }

        setReels(generatedReels);
      } catch (e) {
        console.warn('Reels fetch error', e);
      } finally {
        setLoading(false);
      }
    };

    loadReels();
  }, []);

  const currentReel = reels[currentIndex];

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedOption(null);
      setIsCorrect(null);
    }
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    const correct = option === currentReel.correctAnswer;
    setIsCorrect(correct);
    if (correct) {
      voiceService.speak('That is wonderful! You remembered correctly.', lang);
    } else {
      voiceService.speak('That is a very thoughtful guess. Take a look together.', lang);
    }
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const readCaption = () => {
    if (currentReel) {
      voiceService.speak(`${currentReel.caption}. ${currentReel.dateCues}`, lang);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#162D3D] flex items-center justify-center text-white">
        <p className="font-serif text-2xl animate-pulse">Loading daily reels...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#111A20] text-white flex flex-col justify-between overflow-hidden">
      {/* Top Header Controls */}
      <header className="relative z-20 flex items-center justify-between p-5 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={() => navigate('/patient')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back home</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0F7673] text-white">
            Reel {currentIndex + 1} of {reels.length}
          </span>
          <button
            onClick={() => currentReel && toggleFavorite(currentReel.id)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
            title="Save to favorites"
          >
            <Heart className={`w-5 h-5 ${currentReel && favorites.has(currentReel.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Reel Viewport */}
      {currentReel && (
        <div className="relative flex-1 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md h-[580px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900 flex flex-col justify-end">
            <img
              src={currentReel.mediaUrl}
              alt="Daily memory reel"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />

            {/* Content Overlay */}
            <div className="relative z-10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-[#84CBC1]">
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentReel.mood}
                </span>

                <button
                  onClick={readCaption}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition active:scale-95"
                  title="Read aloud"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-white leading-snug">
                  {currentReel.caption}
                </h2>
                <p className="text-xs text-white/70 mt-1">{currentReel.dateCues}</p>
              </div>

              {/* Interactive Quiz Option Buttons */}
              {currentReel.type === 'memory_quiz' && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-white/80">{currentReel.question}</p>
                  <div className="space-y-1.5">
                    {currentReel.options.map((option, idx) => {
                      const isChosen = selectedOption === option;
                      let btnStyle = "bg-white/15 hover:bg-white/25 text-white border-white/10";
                      if (isChosen) {
                        btnStyle = isCorrect
                          ? "bg-emerald-600 border-emerald-400 text-white ring-2 ring-emerald-400"
                          : "bg-amber-600 border-amber-400 text-white ring-2 ring-amber-400";
                      }
                      return (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(option)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition active:scale-[0.98] ${btnStyle}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {isCorrect !== null && (
                    <div className="flex items-center gap-2 pt-1 text-xs font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isCorrect ? "Wonderful! Correct answer." : "Good try! A lovely memory to reflect on."}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reel Up / Down Navigation Controls */}
      <footer className="relative z-20 flex items-center justify-center gap-6 pb-6">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white text-sm font-semibold transition"
        >
          <ChevronUp className="w-5 h-5" />
          <span>Previous</span>
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === reels.length - 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0F7673] hover:bg-[#0C625F] disabled:opacity-30 disabled:pointer-events-none text-white text-sm font-semibold transition shadow-lg"
        >
          <span>Next moment</span>
          <ChevronDown className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}
