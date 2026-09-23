import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, Sparkles, CheckCircle2, AlertCircle, RefreshCcw, Brain, Pill } from 'lucide-react';
import memoryService from '../services/memoryService';
import reminderService from '../services/reminderService';
import caregiverService from '../services/caregiverService';

export default function CaregiverPatientOverview() {
  const navigate = useNavigate();
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [memoryId, setMemoryId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [insightData, setInsightData] = useState({ accuracy: 78, recentGamesCount: 6, insight: 'Loading observations...' });
  
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('Morning');
  const [medInstructions, setMedInstructions] = useState('');
  const [remindMsg, setRemindMsg] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const patientId = user?._id || user?.id || '11111111-1111-1111-1111-111111111111';

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const trends = await caregiverService.getCognitiveTrends(patientId);
        if (trends && trends.length > 0) {
          const avg = Math.round(trends.reduce((s, t) => s + (t.accuracy || 0), 0) / trends.length);
          setInsightData({
            accuracy: avg,
            recentGamesCount: trends.length,
            insight: `Patient maintained an average accuracy of ${avg}% over recent sessions. Engagement remains calm and consistent.`
          });
        }
      } catch (err) {
        console.warn('Insight fetch fallback', err);
      }
    };
    fetchInsights();
  }, [patientId]);

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setUploadStatus('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('Please select an image file first.');
      return;
    }
    
    setUploadStatus('Analyzing context with AI...');
    try {
      const res = await memoryService.uploadMemory(file, patientId, user._id, '', 'caregiver');
      const mem = res.memory || res;
      setAiSuggestions(mem.aiSuggestions);
      setMemoryId(mem._id || mem.id);
      setUploadStatus('Analysis ready. Please review and confirm below.');
    } catch (err) {
      setUploadStatus(err.message || 'Upload failed.');
    }
  };

  const handleConfirm = async () => {
    setUploadStatus('Mapping to Constellation Graph...');
    try {
      await memoryService.reviewMemory(memoryId, 'confirmed', aiSuggestions);
      setUploadStatus('Memory successfully mapped to Patient Constellation!');
      setTimeout(() => {
        setAiSuggestions(null);
        setFile(null);
        setPreview(null);
        setUploadStatus('');
      }, 2500);
    } catch (err) {
      setUploadStatus('Failed to confirm memory.');
    }
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (!medName.trim()) return;

    try {
      await reminderService.createReminder(patientId, {
        title: `${medName.trim()} (${medTime}) - ${medInstructions || 'Take with water'}`,
        time: new Date(Date.now() + 3600000).toISOString(),
        type: 'medication'
      });
      setRemindMsg('Medication reminder scheduled and pushed to patient device!');
      setMedName('');
      setMedInstructions('');
      setTimeout(() => setRemindMsg(''), 3000);
    } catch (err) {
      setRemindMsg('Failed to schedule medication.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">Caregiver Overview</span>
            <h1 className="text-3xl font-serif font-bold text-slate-800">Patient Care Workspace</h1>
          </div>
          <button 
            onClick={() => navigate('/caregiver')} 
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-2xl border border-slate-200 text-sm shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Cognitive Summary Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-serif font-bold text-slate-900">Clinical Engagement Telemetry</h2>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Recent Accuracy</span>
              <span className="text-2xl font-bold text-[#0F7673]">{insightData.accuracy}%</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Exercises Evaluated</span>
              <span className="text-2xl font-bold text-slate-800">{insightData.recentGamesCount}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic">{insightData.insight}</p>
        </div>

        {/* Photo Upload & AI Mapping Section */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0F7673]" />
            <span>Upload & Link to Constellation Graph</span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <label className="flex-1 w-full p-4 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-[#0F7673] text-center text-sm font-semibold text-slate-600 transition">
              {file ? file.name : "Select a memory photo"}
              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </label>
            <button
              onClick={handleUpload}
              disabled={!file}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#0F7673] hover:bg-[#0C625F] disabled:bg-slate-300 text-white font-bold text-sm transition shadow-sm"
            >
              Analyze with AI
            </button>
          </div>

          {preview && (
            <div className="h-48 w-48 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 mx-auto">
              <img src={preview} alt="Upload" className="w-full h-full object-cover" />
            </div>
          )}

          {uploadStatus && (
            <p className="text-sm font-semibold text-center text-[#0F7673]">{uploadStatus}</p>
          )}

          {aiSuggestions && (
            <div className="p-6 rounded-2xl bg-[#E5F0EE] border border-[#0F7673]/30 space-y-4">
              <h3 className="font-bold text-[#0F7673] text-sm">Suggested Context</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl">
                  <span className="text-slate-400 block">People</span>
                  <span className="font-bold text-slate-800">{(aiSuggestions.people || []).join(', ') || 'Family'}</span>
                </div>
                <div className="p-3 bg-white rounded-xl">
                  <span className="text-slate-400 block">Place</span>
                  <span className="font-bold text-slate-800">{aiSuggestions.place || 'Home'}</span>
                </div>
                <div className="p-3 bg-white rounded-xl">
                  <span className="text-slate-400 block">Event</span>
                  <span className="font-bold text-slate-800">{aiSuggestions.event || 'Gathering'}</span>
                </div>
              </div>
              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-xl bg-[#0F7673] hover:bg-[#0C625F] text-white font-bold text-sm transition shadow-sm"
              >
                Confirm & Map into Graph
              </button>
            </div>
          )}
        </div>

        {/* Schedule Medication */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-rose-600" />
            <span>Schedule Medication Alert</span>
          </h2>

          <form onSubmit={handleAddMedication} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medication Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Amlodipine 5mg"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time of Day</label>
              <select
                value={medTime}
                onChange={(e) => setMedTime(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white"
              >
                <option value="Morning">Morning (8:00 AM)</option>
                <option value="Afternoon">Afternoon (1:00 PM)</option>
                <option value="Evening">Evening (6:00 PM)</option>
                <option value="Night">Night (9:00 PM)</option>
              </select>
            </div>
            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition"
            >
              Push to Schedule
            </button>
          </form>

          {remindMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{remindMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}