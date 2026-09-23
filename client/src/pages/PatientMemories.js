import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, Sparkles, RefreshCcw, Camera } from 'lucide-react';
import memoryService from '../services/memoryService';
import voiceService from '../services/voiceService';
import { useLanguage } from '../context/LanguageContext';

export default function PatientMemories() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { lang } = useLanguage();

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const patientId = user?._id || user?.id || '11111111-1111-1111-1111-111111111111';
        
        const data = await memoryService.getPatientMemories(patientId);
        setMemories(data);
      } catch (error) {
        console.warn('Memory album load error', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMemories();
  }, []);

  const handleReadAloud = (mem) => {
    const text = `${mem.caption || 'A treasured memory'}. ${mem.aiSuggestions?.place ? `Location: ${mem.aiSuggestions.place}.` : ''}`;
    voiceService.speak(text, lang);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-[#162D3D]">
        <div className="text-center">
          <RefreshCcw className="w-10 h-10 animate-spin text-[#0F7673] mx-auto mb-4" />
          <h2 className="font-serif text-2xl">Loading your memory album...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">Personal Archive</span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-800">My Memory Album</h1>
          </div>
          <button 
            onClick={() => navigate('/patient')}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-2xl border border-slate-200 text-sm shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back Home</span>
          </button>
        </div>

        {memories.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center shadow-sm border border-slate-200 space-y-4">
            <Camera className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-serif text-2xl text-slate-800">No memories added yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Your family caregiver will add special photos and stories to this album soon. You can also view daily reels.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {memories.map((mem) => (
              <div 
                key={mem._id || mem.id} 
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="relative h-64 sm:h-72 bg-slate-100 overflow-hidden">
                  <img 
                    src={mem.mediaUrl || '/manus-storage/shillong_cd371abe.jpg'} 
                    alt="Memory" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleReadAloud(mem)}
                    className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 backdrop-blur-sm text-[#0F7673] hover:bg-white shadow transition active:scale-95"
                    title="Read memory aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    {mem.caption && (
                      <h3 className="text-xl font-serif font-bold text-slate-900 leading-snug">
                        "{mem.caption}"
                      </h3>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {mem.aiSuggestions?.people?.map((person, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-100">
                        👤 {person}
                      </span>
                    ))}
                    {mem.aiSuggestions?.place && (
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-100">
                        📍 {mem.aiSuggestions.place}
                      </span>
                    )}
                    {mem.aiSuggestions?.mood && (
                      <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full border border-amber-100">
                        ✨ {mem.aiSuggestions.mood}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">
                    Added {new Date(mem.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}