import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import caregiverService from '../services/caregiverService';
import reminderService from '../services/reminderService';

export default function CaregiverSchedule() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('routine');
  const [statusMsg, setStatusMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const caregiver = JSON.parse(localStorage.getItem('user') || '{}');
  const caregiverId = caregiver?._id || caregiver?.id;

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const list = await caregiverService.getAuthorizedPatients(caregiverId);
        setPatients(list);
        if (list.length > 0) {
          setSelectedPatientId(list[0]._id || list[0].id);
        }
      } catch (err) {
        console.warn('Authorized patients load error', err);
      }
    };
    loadPatients();
  }, [caregiverId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setStatusMsg('Please select a patient.');
      return;
    }
    if (!title.trim() || !time) {
      setStatusMsg('Please enter reminder title and time.');
      return;
    }

    setSubmitting(true);
    setStatusMsg('');

    try {
      await reminderService.createReminder(selectedPatientId, {
        title: title.trim(),
        time,
        type
      });

      setStatusMsg('Schedule successfully pushed to patient device!');
      setTitle('');
      setTime('');
      setTimeout(() => setStatusMsg(''), 3500);
    } catch (error) {
      setStatusMsg(error.message || 'Failed to update patient schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-2xl flex justify-between items-center mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">Caregiver Operations</span>
          <h1 className="text-3xl font-serif font-bold text-slate-800">Push to Patient Schedule</h1>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-2xl border border-slate-200 text-sm shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 w-full max-w-2xl space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Select Assigned Patient</label>
          {patients.length > 0 ? (
            <select 
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full p-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-[#0F7673] outline-none bg-white text-base font-semibold text-slate-800"
            >
              {patients.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name} (Assigned Patient)
                </option>
              ))}
            </select>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 text-amber-800 text-sm">
              Loading authorized patient relationships...
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Event Category</label>
          <select 
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-[#0F7673] outline-none bg-white text-sm font-semibold text-slate-800"
          >
            <option value="routine">Routine (e.g. Garden Walk, Hydration Check)</option>
            <option value="medication">Medication / Prescription Alert</option>
            <option value="social">Family Social Event / Video Call</option>
            <option value="medical">Doctor / Clinic Appointment</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Reminder Title</label>
          <input 
            type="text" 
            required
            placeholder="e.g. Take morning blood pressure medicine with water"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-[#0F7673] outline-none text-base"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Scheduled Date & Time</label>
          <input 
            type="datetime-local" 
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full p-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-[#0F7673] outline-none text-base"
          />
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          className="w-full bg-[#0F7673] hover:bg-[#0C625F] disabled:bg-slate-400 text-white font-bold py-4 rounded-2xl transition shadow-sm text-base flex items-center justify-center gap-2 cursor-pointer"
        >
          <Send className="w-5 h-5" />
          <span>{submitting ? 'Pushing to device...' : 'Push to Patient Device'}</span>
        </button>

        {statusMsg && (
          <div className={`p-4 rounded-2xl text-center text-sm font-bold flex items-center justify-center gap-2 ${
            statusMsg.includes('successfully') ? 'bg-[#E5F0EE] text-[#0F7673]' : 'bg-[#F6E9E6] text-[#9B4D45]'
          }`}>
            {statusMsg.includes('successfully') ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMsg}</span>
          </div>
        )}
      </form>
    </div>
  );
}