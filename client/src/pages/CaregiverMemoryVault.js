import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, Sparkles, CheckCircle2, AlertCircle, RefreshCcw, Camera } from 'lucide-react';
import memoryService from '../services/memoryService';

export default function CaregiverMemoryVault() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState(1); // 1: Upload, 2: Review & Confirm
  
  // AI Suggestions State
  const [isProcessing, setIsProcessing] = useState(false);
  const [memoryId, setMemoryId] = useState(null);
  const [suggestions, setSuggestions] = useState({ people: '', place: '', event: '', mood: '' });
  const [statusMsg, setStatusMsg] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const patientId = user?._id || user?.id || '11111111-1111-1111-1111-111111111111';
  const caregiverId = user?.role === 'Caregiver' ? user?._id || user?.id : null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setStatusMsg('');
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) {
      setStatusMsg('Please select a photo or video to upload.');
      return;
    }

    setIsProcessing(true);
    setStatusMsg('');

    try {
      const result = await memoryService.uploadMemory(
        file,
        patientId,
        caregiverId,
        caption,
        user?.role === 'Caregiver' ? 'caregiver' : 'patient'
      );

      const mem = result.memory || result;
      setMemoryId(mem._id || mem.id);

      const aiSugg = mem.aiSuggestions || {};
      setSuggestions({
        people: (aiSugg.people || []).join(', '),
        place: aiSugg.place || '',
        event: aiSugg.event || '',
        mood: aiSugg.mood || ''
      });

      setStep(2);
    } catch (err) {
      setStatusMsg(err.message || 'Failed to analyze memory with AI.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    try {
      await memoryService.reviewMemory(memoryId, 'confirmed', {
        people: suggestions.people.split(',').map(p => p.trim()).filter(Boolean),
        place: suggestions.place.trim(),
        event: suggestions.event.trim(),
        mood: suggestions.mood.trim()
      });

      navigate('/patient/memories');
    } catch (err) {
      setStatusMsg('Failed to confirm memory. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">Memory Preservation</span>
          <h1 className="text-3xl font-serif font-bold text-slate-800">Memory Vault Manager</h1>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-2xl border border-slate-200 text-sm shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="w-full max-w-3xl bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
        
        {step === 1 && (
          <div className="space-y-6">
            <label className="w-full h-72 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-[#0F7673] hover:bg-[#E5F0EE]/20 transition relative overflow-hidden group">
              {preview ? (
                <img src={preview} alt="Upload Preview" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#E5F0EE] text-[#0F7673] mx-auto flex items-center justify-center">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-slate-700 text-base">Click or drag a family photo here</p>
                  <p className="text-xs text-slate-500">Supports JPG, PNG, WEBP up to 10MB</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Memory Caption (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Summer vacation at Umiam Lake with Ananya"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full p-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-[#0F7673] outline-none text-base"
              />
            </div>

            <button
              onClick={handleUploadAndAnalyze}
              disabled={!file || isProcessing}
              className="w-full bg-[#0F7673] hover:bg-[#0C625F] disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl transition shadow-sm text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  <span>Analyzing with Vision AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Upload & Analyze with AI</span>
                </>
              )}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-[#E5F0EE] border border-[#0F7673]/30 text-[#0F7673] p-4 rounded-2xl text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <span>AI Vision context extracted. Please review and edit before saving to the Constellation Graph.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-56 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img src={preview} alt="Memory" className="w-full h-full object-cover" />
              </div>

              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">People in this memory</label>
                  <input 
                    type="text" 
                    value={suggestions.people} 
                    onChange={(e) => setSuggestions({...suggestions, people: e.target.value})}
                    placeholder="Comma separated names e.g. Ananya, Chirag"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F7673] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Place / Setting</label>
                  <input 
                    type="text" 
                    value={suggestions.place} 
                    onChange={(e) => setSuggestions({...suggestions, place: e.target.value})}
                    placeholder="e.g. Umiam Lake, Shillong"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F7673] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Event / Gathering</label>
                  <input 
                    type="text" 
                    value={suggestions.event} 
                    onChange={(e) => setSuggestions({...suggestions, event: e.target.value})}
                    placeholder="e.g. Family Holiday"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F7673] text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setStep(1)}
                className="w-1/3 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
              >
                Change Photo
              </button>
              <button 
                onClick={handleConfirmAndSave}
                className="w-2/3 py-3.5 rounded-2xl bg-[#0F7673] hover:bg-[#0C625F] text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm & Add to Memory Graph</span>
              </button>
            </div>
          </div>
        )}

        {statusMsg && (
          <div className="p-4 rounded-2xl bg-[#F6E9E6] text-[#9B4D45] text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}