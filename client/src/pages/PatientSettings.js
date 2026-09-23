import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, LogOut, Moon, Type, Shield, User } from 'lucide-react';
import patientService from '../services/patientService';
import authService from '../services/authService';

export default function PatientSettings() {
  const navigate = useNavigate();
  const [comfortMode, setComfortMode] = useState(false);
  const [largeText, setLargeText] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const patientId = user?._id || user?.id || '11111111-1111-1111-1111-111111111111';

  const handleToggleComfort = async () => {
    const nextVal = !comfortMode;
    setComfortMode(nextVal);
    await savePreferences(nextVal, largeText);
  };

  const handleToggleLargeText = async () => {
    const nextVal = !largeText;
    setLargeText(nextVal);
    await savePreferences(comfortMode, nextVal);
  };

  const savePreferences = async (comfort, text) => {
    try {
      await patientService.updatePreferences(patientId, {
        comfortMode: comfort,
        largeText: text
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (e) {
      console.warn('Preferences update error', e);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-2xl flex justify-between items-center mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">Accessibility & Care</span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-800">Preferences</h1>
        </div>
        <button 
          onClick={() => navigate('/patient')}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-2xl border border-slate-200 text-sm shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
        
        {/* User Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#E5F0EE] text-[#0F7673] flex items-center justify-center font-bold text-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{user.name || 'Chetan Sharma'}</h3>
              <p className="text-xs text-slate-500">{user.phone || '+91 98765 43210'} · {user.role || 'Patient'}</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Verified
          </span>
        </div>

        {savedNotice && (
          <div className="p-3.5 rounded-xl bg-[#E5F0EE] text-[#0F7673] text-sm font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Preferences saved successfully.</span>
          </div>
        )}

        {/* Comfort Mode Toggle */}
        <div className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Comfort Mode</h3>
              <p className="text-sm text-slate-500">Simplifies the interface and provides gentle extra hints.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleToggleComfort}
            className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer ${
              comfortMode ? 'bg-[#0F7673]' : 'bg-slate-300'
            }`}
          >
            <span className={`absolute top-1 bg-white w-6 h-6 rounded-full transition-all shadow-sm ${
              comfortMode ? 'right-1' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Large Text Toggle */}
        <div className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Large & Clear Text</h3>
              <p className="text-sm text-slate-500">Increases contrast and font size for relaxed reading.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleToggleLargeText}
            className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer ${
              largeText ? 'bg-[#0F7673]' : 'bg-slate-300'
            }`}
          >
            <span className={`absolute top-1 bg-white w-6 h-6 rounded-full transition-all shadow-sm ${
              largeText ? 'right-1' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Security / Privacy */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
          <Shield className="w-5 h-5 text-[#0F7673] flex-shrink-0" />
          <span>Your memory recordings, games, and healthcare notes are encrypted and isolated per DPDP & HIPAA regulations.</span>
        </div>

        {/* Logout Button */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 px-4 rounded-2xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out of care space</span>
          </button>
        </div>
      </div>
    </div>
  );
}