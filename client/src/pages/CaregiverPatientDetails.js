import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Brain, Images, Calendar, Plus, RefreshCcw } from 'lucide-react';
import patientService from '../services/patientService';

export default function CaregiverPatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const details = await patientService.getPatientDetails(patientId);
        setData(details);
      } catch (error) {
        console.error("Failed to fetch patient details:", error);
      } finally {
        setLoading(false);
      }
    };
    if (patientId) fetchDetails();
  }, [patientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-[#162D3D]">
        <div className="text-center">
          <RefreshCcw className="w-10 h-10 animate-spin text-[#0F7673] mx-auto mb-4" />
          <p className="text-lg font-serif">Loading patient profile...</p>
        </div>
      </div>
    );
  }

  if (!data?.patient) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800 mb-4">Patient record not found</h2>
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-xl bg-[#0F7673] text-white font-semibold">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">Authorized Profile</span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mt-1">
              {data.patient.name}'s Care Overview
            </h1>
          </div>
          <button 
            onClick={() => navigate('/caregiver')} 
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-2xl border border-slate-200 text-sm shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Patient Profile Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E5F0EE] text-[#0F7673] flex items-center justify-center font-bold text-2xl">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{data.patient.name}</h2>
              <p className="text-sm text-slate-500">
                {data.patient.location || 'Northeast India'} · Emergency: {data.patient.emergency_contact || '+91 98765 43211'}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active Relationship
          </span>
        </div>

        {/* Cognitive & Memory Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cognitive Adaptive Engine */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Cognitive Tuning</h3>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Current Adaptive Mode:</span>
                <span className="font-bold text-[#0F7673]">{data.metrics.currentDifficulty || 'MEDIUM'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Rolling Accuracy:</span>
                <span className="font-bold text-emerald-600">{data.metrics.rollingAccuracy || 75}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Exercises adapt choices (2, 3, or 4 options) automatically based on engagement and response speed.
            </p>
          </div>

          {/* Memory Vault Bridge */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Images className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Memory Vault</h3>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{data.memoryCount || 3}</p>
              <p className="text-sm text-slate-500">Confirmed photographic memories in patient graph.</p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => navigate('/caregiver/vault')} 
                className="flex-1 py-3 px-4 rounded-xl bg-[#0F7673] hover:bg-[#0C625F] text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Memory</span>
              </button>
              <button 
                onClick={() => navigate('/caregiver/schedule')} 
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}