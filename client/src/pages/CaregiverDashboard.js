import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, ArrowRight, Bell, BookOpen, Brain, Calendar, CheckCircle2,
  Clock, Heart, Images, MessageCircle, Plus, RefreshCcw, Send, Settings,
  ShieldCheck, Sparkles, Trash2, UserRound, Users, Volume2, LogOut, FileText
} from "lucide-react";
import { BrandMark, SectionLabel } from "../components/shared";
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import caregiverService from '../services/caregiverService';
import memoryService from '../services/memoryService';
import reminderService from '../services/reminderService';
import authService from '../services/authService';
import voiceService from '../services/voiceService';

export default function CaregiverDashboard() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  // Active view tab: 'overview' | 'vault' | 'schedule' | 'family' | 'notes'
  const [activeTab, setActiveTab] = useState("overview");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const loggedInUser = authService.getCurrentUser() || { name: 'Caregiver', role: 'Caregiver' };
  const caregiverName = loggedInUser.name ? loggedInUser.name.split(" ")[0] : "Caregiver";
  const caregiverId = loggedInUser._id || loggedInUser.id || '22222222-2222-2222-2222-222222222222';

  // State: Patients
  const [patientList, setPatientList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  // State: Data
  const [memories, setMemories] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [activities, setActivities] = useState([]);
  const [familyMessages, setFamilyMessages] = useState([]);
  const [notes, setNotes] = useState([]);
  const [insight, setInsight] = useState({ accuracy: 78, recentGamesCount: 6, insight: "Patient shows consistent recall accuracy across recent daily exercises." });

  // Form inputs
  const [newNoteText, setNewNoteText] = useState("");
  const [newFamilyMsg, setNewFamilyMsg] = useState("");
  const [newFamilySender, setNewFamilySender] = useState("Daughter");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newTaskType, setNewTaskType] = useState("routine");

  // 1. Load Authorized Patients on Mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const patients = await caregiverService.getAuthorizedPatients(caregiverId);
        setPatientList(patients);
        if (patients.length > 0) {
          const initialId = patients[0]._id || patients[0].id;
          setSelectedPatientId(initialId);
        }
      } catch (err) {
        console.warn('Patients fetch error', err);
      }
    };
    fetchPatients();
  }, [caregiverId]);

  // 2. Load Patient-Specific Data when selected patient changes
  useEffect(() => {
    if (!selectedPatientId) return;

    const loadPatientData = async () => {
      try {
        const [mems, rems, acts, msgs, nts] = await Promise.all([
          memoryService.getPatientMemories(selectedPatientId),
          reminderService.getReminders(selectedPatientId),
          caregiverService.getPatientActivity(selectedPatientId),
          caregiverService.getPatientActivity(selectedPatientId), // family messages placeholder
          caregiverService.getNotes(selectedPatientId)
        ]);

        setMemories(mems);
        setReminders(rems);
        setActivities(acts);
        setNotes(nts);

        // Load family messages
        const localMsgs = JSON.parse(localStorage.getItem('hackathon_family') || '[]');
        if (localMsgs.length === 0) {
          setFamilyMessages([
            { id: 1, sender: 'Ananya (Daughter)', content: 'Good morning Baba! Remember to drink water after your tea today.', time: '8:30 AM' },
            { id: 2, sender: 'Chirag (Son)', content: 'Loved seeing your score on the memory game! Calling you tonight.', time: '10:15 AM' }
          ]);
        } else {
          setFamilyMessages(localMsgs);
        }
      } catch (e) {
        console.warn('Error loading patient data', e);
      }
    };

    loadPatientData();
  }, [selectedPatientId]);

  // Action: Delete Memory
  const handleDeleteMemory = async (e, memoryId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this memory from the patient album?")) return;

    try {
      await memoryService.deleteMemory(memoryId);
      setMemories(prev => prev.filter(m => (m._id || m.id) !== memoryId));
      showToast("Memory deleted successfully.");
    } catch (err) {
      showToast("Failed to delete memory.");
    }
  };

  // Action: Add Clinical Note
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      const created = await caregiverService.saveNote(
        selectedPatientId,
        caregiverId,
        newNoteText,
        loggedInUser.name || 'Caregiver'
      );
      setNotes(prev => [created, ...prev]);
      setNewNoteText("");
      showToast("Clinical note recorded.");
    } catch (err) {
      showToast("Could not save note.");
    }
  };

  // Action: Send Family Message
  const handleSendFamilyMessage = async (e) => {
    e.preventDefault();
    if (!newFamilyMsg.trim()) return;

    try {
      const created = await caregiverService.sendFamilyMessage(
        selectedPatientId,
        newFamilySender,
        'Family',
        newFamilyMsg
      );
      setFamilyMessages(prev => [created, ...prev]);
      setNewFamilyMsg("");
      showToast("Message sent to patient feed!");
    } catch (err) {
      showToast("Could not send message.");
    }
  };

  // Action: Schedule Task
  const handleScheduleTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskTime) return;

    try {
      const created = await reminderService.createReminder(selectedPatientId, {
        title: newTaskTitle.trim(),
        time: newTaskTime,
        type: newTaskType
      });
      setReminders(prev => [...prev, created]);
      setNewTaskTitle("");
      setNewTaskTime("");
      showToast("Schedule pushed to patient device!");
    } catch (err) {
      showToast("Failed to push reminder.");
    }
  };

  // Action: Logout
  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const selectedPatient = patientList.find(p => (p._id || p.id) === selectedPatientId) || { name: 'Assigned Patient' };

  return (
    <div className="min-h-screen bg-[#FAFBFB] text-[#222B32] font-sans flex flex-col">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#162D3D] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <BrandMark />
          <span className="hidden sm:inline-block text-xs font-semibold px-3 py-1 rounded-full bg-[#E5F0EE] text-[#0F7673]">
            Caregiver Portal
          </span>
        </div>

        {/* Patient Switcher & Tools */}
        <div className="flex items-center gap-3">
          {patientList.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
              <UserRound className="w-4 h-4 text-slate-500" />
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {patientList.map(p => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <LanguageSelector />

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-8 flex-1 space-y-8">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <SectionLabel>{t('todayOverview') || "Caregiver Dashboard"}</SectionLabel>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#162D3D] mt-1">
              Welcome, {caregiverName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Managing thoughtful daily care for <span className="font-bold text-slate-800">{selectedPatient.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/caregiver/patient/${selectedPatientId}`)}
              className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
            >
              Patient Details
            </button>
            <button
              onClick={() => navigate('/caregiver/vault')}
              className="px-4 py-2.5 rounded-2xl bg-[#0F7673] hover:bg-[#0C625F] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Memory</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-px">
          {[
            { id: "overview", label: "Overview & Trends", icon: Activity },
            { id: "vault", label: "Memory Vault", icon: Images },
            { id: "schedule", label: "Care Schedule", icon: Calendar },
            { id: "family", label: "Family Feed", icon: MessageCircle },
            { id: "notes", label: "Clinical Notes", icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? "bg-white border-t border-x border-slate-200 text-[#0F7673] shadow-sm -mb-px"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cognitive Recall Accuracy</span>
                <div className="text-3xl font-bold text-[#0F7673] mt-2">{insight.accuracy}%</div>
                <p className="text-xs text-slate-500 mt-1">Based on {insight.recentGamesCount} completed sessions</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Memory Graph Anchors</span>
                <div className="text-3xl font-bold text-slate-800 mt-2">{memories.length}</div>
                <p className="text-xs text-slate-500 mt-1">Photos & stories linked to patient</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Tasks Scheduled</span>
                <div className="text-3xl font-bold text-slate-800 mt-2">{reminders.length}</div>
                <p className="text-xs text-slate-500 mt-1">Active reminders in queue</p>
              </div>
            </div>

            {/* AI Clinical Insight Card */}
            <div className="bg-[#E5F0EE] border border-[#0F7673]/20 p-6 rounded-3xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#0F7673] flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">Observational AI Observation</span>
                <p className="text-sm font-medium text-slate-800 leading-relaxed">
                  {insight.insight}
                </p>
                <p className="text-[11px] text-slate-500 italic pt-1">
                  *Disclaimer: Observational trend based purely on app engagement data. Does not constitute a clinical medical diagnosis.
                </p>
              </div>
            </div>

            {/* Recent Patient Activities */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-serif text-xl font-bold text-slate-900">Recent Patient Engagement</h3>
              {activities.length === 0 ? (
                <p className="text-sm text-slate-500">No game sessions logged yet today.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((act, idx) => (
                    <div key={act._id || act.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <Brain className="w-4 h-4 text-[#0F7673]" />
                        <div>
                          <span className="font-bold text-slate-800">{act.gameName || act.game_name || 'Memory Journey'}</span>
                          <span className="text-xs text-slate-400 block">{new Date(act.createdAt || act.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs">
                        {act.accuracy}% accuracy
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Memory Vault */}
        {activeTab === "vault" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-2xl font-bold text-slate-900">Patient Memory Vault</h3>
              <button
                onClick={() => navigate('/caregiver/vault')}
                className="px-4 py-2.5 rounded-2xl bg-[#0F7673] hover:bg-[#0C625F] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Photo to Vault</span>
              </button>
            </div>

            {memories.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500">
                <Images className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-lg font-bold">No memories uploaded yet.</p>
                <p className="text-sm text-slate-400 mt-1">Upload a family photo to build the patient's Constellation Graph.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {memories.map((mem) => (
                  <div key={mem._id || mem.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between group">
                    <div className="relative h-48 bg-slate-100">
                      <img src={mem.mediaUrl} alt="Memory" className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => handleDeleteMemory(e, mem._id || mem.id)}
                        className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 text-rose-600 hover:bg-rose-50 shadow transition opacity-0 group-hover:opacity-100"
                        title="Delete memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4 space-y-2">
                      <h4 className="font-serif font-bold text-slate-900 text-base line-clamp-1">{mem.caption || "Family Memory"}</h4>
                      <div className="flex flex-wrap gap-1">
                        {mem.aiSuggestions?.place && (
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                            📍 {mem.aiSuggestions.place}
                          </span>
                        )}
                        {mem.aiSuggestions?.people?.slice(0, 2).map((p, i) => (
                          <span key={i} className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                            👤 {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Care Schedule */}
        {activeTab === "schedule" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Push New Reminder Form */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">Push to Patient Device</h3>
              <form onSubmit={handleScheduleTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Afternoon hydration check"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#0F7673]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#0F7673] bg-white"
                  >
                    <option value="routine">Routine / Activity</option>
                    <option value="medication">Medication</option>
                    <option value="social">Family Social Call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#0F7673]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#0F7673] hover:bg-[#0C625F] text-white font-semibold text-sm transition shadow-sm"
                >
                  Push Task
                </button>
              </form>
            </div>

            {/* Scheduled Reminders List */}
            <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">Active Patient Reminders</h3>
              {reminders.length === 0 ? (
                <p className="text-sm text-slate-500">No scheduled reminders for today.</p>
              ) : (
                <div className="space-y-3">
                  {reminders.map((r) => (
                    <div key={r._id || r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-[#0F7673] bg-[#E5F0EE] px-2 py-0.5 rounded-full">
                          {new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <h4 className="font-bold text-slate-900 text-base mt-1">{r.title}</h4>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 capitalize">
                        {r.status || 'pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Family Feed */}
        {activeTab === "family" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">Send Family Message</h3>
              <form onSubmit={handleSendFamilyMessage} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sender Name</label>
                  <input
                    type="text"
                    required
                    value={newFamilySender}
                    onChange={(e) => setNewFamilySender(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Good morning Baba! We will video call you at tea time."
                    value={newFamilyMsg}
                    onChange={(e) => setNewFamilyMsg(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#0F7673]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#0F7673] hover:bg-[#0C625F] text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message to Patient</span>
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">Family Hub Messages</h3>
              <div className="space-y-3">
                {familyMessages.map((msg, idx) => (
                  <div key={msg.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F7673]">{msg.sender}</span>
                        <span className="text-xs text-slate-400">{msg.time || 'Today'}</span>
                      </div>
                      <p className="text-sm text-slate-800">{msg.content || msg.message}</p>
                    </div>
                    <button
                      onClick={() => voiceService.speak(msg.content || msg.message, lang)}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#0F7673] shadow-sm transition"
                      title="Read aloud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Clinical Notes */}
        {activeTab === "notes" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">Record Clinical Note</h3>
              <form onSubmit={handleSaveNote} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Care Observation</label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Note patient mood, appetite, cognitive responsiveness, or sleep patterns..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#0F7673]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#0F7673] hover:bg-[#0C625F] text-white font-semibold text-sm transition shadow-sm"
                >
                  Save Note
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">Historical Clinical Notes</h3>
              {notes.length === 0 ? (
                <p className="text-sm text-slate-500">No notes recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((n, idx) => (
                    <div key={n._id || n.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span className="font-bold text-slate-800">{n.createdBy || n.created_by_name || 'Caregiver'}</span>
                        <span>{new Date(n.createdAt || n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <p className="text-sm text-slate-800 pt-1">{n.text || n.note_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}