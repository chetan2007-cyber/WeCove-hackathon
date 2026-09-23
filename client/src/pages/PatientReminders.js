import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pill, Clock, CheckCircle2, RefreshCcw } from 'lucide-react';
import reminderService from '../services/reminderService';

export default function PatientReminders() {
  const [reminders, setReminders] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const patientId = user?._id || user?.id || '11111111-1111-1111-1111-111111111111';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rems, meds] = await Promise.all([
          reminderService.getReminders(patientId),
          reminderService.getMedications(patientId)
        ]);
        setReminders(rems);
        setMedications(meds);
      } catch (err) {
        console.warn('Reminders fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-[#162D3D]">
        <div className="text-center">
          <RefreshCcw className="w-10 h-10 animate-spin text-[#0F7673] mx-auto mb-4" />
          <p className="text-lg font-serif">Checking your care schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">Care Plan</span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-800">My Reminders & Meds</h1>
          </div>
          <button 
            onClick={() => navigate('/patient')}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-2xl border border-slate-200 text-sm shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back Home</span>
          </button>
        </div>

        {/* Medications Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-rose-600" />
            <span>Prescribed Medications</span>
          </h2>

          {medications.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-slate-500 text-center">
              <p>No medication schedules logged by your care team yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medications.map((med, idx) => (
                <div key={med._id || idx} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-100">
                      {med.timeOfDay || 'Daily'}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">{med.medicationName || med.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{med.instructions || 'Follow doctor guidance.'}</p>
                  </div>
                  <div className="pt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Active in your care plan</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Reminders Section */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0F7673]" />
            <span>Daily Routines & Hydration</span>
          </h2>

          {reminders.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-slate-500 text-center">
              <p>No active routine reminders right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((rem) => {
                const timeStr = new Date(rem.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={rem._id || rem.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-[#0F7673] bg-[#E5F0EE] px-2.5 py-0.5 rounded-full">
                        {timeStr}
                      </span>
                      <h4 className="text-lg font-bold text-slate-900 mt-1">{rem.title}</h4>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 uppercase">
                      {rem.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}