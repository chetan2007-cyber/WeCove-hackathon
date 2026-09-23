import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Clock, Sun, Cloud, Bell, CheckCircle2, Plus, Pill } from 'lucide-react';
import reminderService from '../services/reminderService';
import notificationService from '../services/notificationService';
import { SectionLabel } from '../components/shared';

export default function PatientMyDay() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: '--', condition: 'Clear & Calm' });
  const [reminders, setReminders] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const patientId = user?._id || user?.id || '11111111-1111-1111-1111-111111111111';

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch reminders
  const loadReminders = useCallback(async () => {
    try {
      const data = await reminderService.getReminders(patientId);
      setReminders(data);
    } catch (e) {
      console.warn('Reminders fetch fallback', e);
    }
  }, [patientId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Live alarm trigger: check every 5 seconds for due pending reminders
  useEffect(() => {
    if (!reminders || reminders.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const due = reminders.find(r => 
        r.status === 'pending' && new Date(r.time) <= now
      );

      if (due && !activeAlert) {
        setActiveAlert(due);
        notificationService.notify({
          title: 'Care Reminder',
          body: due.title,
          type: due.type
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [reminders, activeAlert]);

  // Fetch live weather
  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        const res = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const { temperature, weathercode } = res.data.current_weather;
        setWeather({
          temp: `${Math.round(temperature)}°C`,
          condition: weathercode > 3 ? 'Cloudy & Pleasant' : 'Clear & Sunny'
        });
      } catch (error) {
        setWeather({ temp: '24°C', condition: 'Pleasant & Calm' });
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(26.14, 91.73) // Default to Guwahati, Northeast India
      );
    } else {
      fetchWeather(26.14, 91.73);
    }
  }, []);

  const handleComplete = async (reminderId) => {
    await reminderService.updateStatus(reminderId, 'completed');
    setActiveAlert(null);
    loadReminders();
  };

  const handleSnooze = async (reminderId) => {
    await reminderService.snoozeReminder(reminderId, 30);
    setActiveAlert(null);
    loadReminders();
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTime) return;

    await reminderService.createReminder(patientId, {
      title: newTitle.trim(),
      time: newTime,
      type: 'routine'
    });

    setNewTitle('');
    setNewTime('');
    setShowAddModal(false);
    loadReminders();
  };

  const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/patient')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back home</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#0F7673] hover:bg-[#0C625F] text-white text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Reminder</span>
          </button>
        </div>

        {/* Hero Orientation Banner (Time & Weather) */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <SectionLabel>Today's orientation</SectionLabel>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#162D3D] tracking-tight mt-1">
              {timeString}
            </h1>
            <p className="text-base text-slate-500 font-medium mt-1">{dateString}</p>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F1F6F4] border border-[#DCE5E3]">
            {weather.condition.includes('Sun') || weather.condition.includes('Clear') ? (
              <Sun className="w-8 h-8 text-amber-500 flex-shrink-0" />
            ) : (
              <Cloud className="w-8 h-8 text-sky-500 flex-shrink-0" />
            )}
            <div>
              <span className="text-xl font-bold text-[#162D3D] block">{weather.temp}</span>
              <span className="text-xs font-semibold text-slate-500">{weather.condition}</span>
            </div>
          </div>
        </div>

        {/* Active Alarm Modal Banner */}
        {activeAlert && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 shadow-lg animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center flex-shrink-0">
                <Bell className="w-7 h-7 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Reminder Alarm</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{activeAlert.title}</h3>
                <p className="text-sm text-slate-600">Scheduled for now</p>
              </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => handleSnooze(activeAlert._id || activeAlert.id)}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition"
              >
                Snooze (30m)
              </button>
              <button
                onClick={() => handleComplete(activeAlert._id || activeAlert.id)}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-[#0F7673] hover:bg-[#0C625F] text-white font-bold text-sm transition shadow-sm"
              >
                Mark as Done
              </button>
            </div>
          </div>
        )}

        {/* Scheduled Reminders List */}
        <div className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0F7673]" />
            <span>Today's Schedule & Medications</span>
          </h2>

          {reminders.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center text-slate-500">
              <p className="text-lg">Your day is clear! No active reminders scheduled right now.</p>
            </div>
          ) : (
            reminders.map((rem) => {
              const isDone = rem.status === 'completed';
              const timeDisplay = new Date(rem.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={rem._id || rem.id}
                  className={`bg-white p-5 rounded-2xl border transition shadow-sm flex items-center justify-between gap-4 ${
                    isDone ? 'border-slate-100 opacity-60' : 'border-slate-200/80 hover:border-[#0F7673]/40'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      rem.type === 'medication' ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-700'
                    }`}>
                      {rem.type === 'medication' ? <Pill className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0F7673] bg-[#E5F0EE] px-2.5 py-0.5 rounded-full">
                          {timeDisplay}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">{rem.type}</span>
                      </div>
                      <h3 className={`text-lg font-bold text-slate-900 mt-1 ${isDone ? 'line-through text-slate-400' : ''}`}>
                        {rem.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isDone ? (
                      <button
                        onClick={() => handleComplete(rem._id || rem.id)}
                        className="px-4 py-2 rounded-xl bg-[#E5F0EE] hover:bg-[#D5E8E5] text-[#0F7673] font-semibold text-xs transition"
                      >
                        Complete
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 px-3 py-1 bg-emerald-50 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <h2 className="text-2xl font-serif font-bold text-slate-900">Add a New Reminder</h2>
            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Afternoon water check"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0F7673]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0F7673]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#0F7673] hover:bg-[#0C625F] text-white font-semibold text-sm shadow-sm"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}