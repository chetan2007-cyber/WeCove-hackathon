import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, FileText, Printer, AlertCircle, LogOut, RefreshCcw } from 'lucide-react';
import caregiverService from '../services/caregiverService';
import aiService from '../services/aiService';
import authService from '../services/authService';
import LanguageSelector from '../components/LanguageSelector';
import { BrandMark, SectionLabel } from '../components/shared';

export default function HealthcareDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  
  // Date filter for clinical report
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const clinician = authService.getCurrentUser() || { name: 'Dr. Barua', role: 'HealthcareWorker' };
  const clinicianId = clinician._id || clinician.id || '33333333-3333-3333-3333-333333333333';

  // 1. Fetch Authorized Patients for this Clinician
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const list = await caregiverService.getAuthorizedPatients(clinicianId);
        setPatients(list);
        if (list.length > 0) {
          setSelectedPatientId(list[0]._id || list[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch authorized patients:", err);
      }
    };
    fetchPatients();
  }, [clinicianId]);

  // 2. Generate Clinical Care Report
  const handleGenerateReport = async () => {
    if (!selectedPatientId || !fromDate || !toDate) {
      setErrorMsg("Please select a patient and valid date range.");
      return;
    }

    setIsGenerating(true);
    setReport(null);
    setErrorMsg('');

    try {
      const data = await aiService.generateClinicalReport(selectedPatientId, {
        totalGames: 8,
        avgAccuracy: 79,
        adherenceRate: 85
      }, fromDate, toDate);

      setReport(data);
    } catch (err) {
      setErrorMsg("Failed to generate clinical observations.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const selectedPatient = patients.find(p => (p._id || p.id) === selectedPatientId) || { name: 'Selected Patient' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <BrandMark light />
          <div className="h-6 w-px bg-slate-700 hidden sm:block" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <Stethoscope className="w-3.5 h-3.5" />
            Clinical Portal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 hidden md:inline">
            Logged in as <strong className="text-white">{clinician.name}</strong>
          </span>
          <LanguageSelector />
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div>
            <SectionLabel>Authorized Clinician Portal</SectionLabel>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 mt-1">
              Cognitive Care Observation
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review cognitive trajectory and generate DPDP-compliant observational summaries.
            </p>
          </div>

          {report && (
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Export PDF</span>
            </button>
          )}
        </div>

        {/* Controls Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Authorized Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {patients.map(p => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white text-sm font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white text-sm font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || !selectedPatientId}
              className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing observations...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Generate Observation Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Generated Clinical Report (Printable) */}
        {report && (
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-md space-y-8 print:border-none print:shadow-none print:p-0">
            {/* Report Header */}
            <div className="border-b border-slate-200 pb-6 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                  Observational Summary
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-2">
                  Cognitive Care & Adherence Report
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Patient: <strong className="text-slate-800">{selectedPatient.name}</strong> · Range: {fromDate} to {toDate}
                </p>
              </div>

              <div className="text-right text-xs text-slate-400">
                <p>Reviewed by: <strong>{clinician.name}</strong></p>
                <p>Generated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Cognitive Exercises</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {report.metrics?.totalGames ?? 8}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Average Accuracy</span>
                <span className="text-2xl font-bold text-teal-700 mt-1 block">
                  {report.metrics?.avgAccuracy ?? 79}%
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Care Plan Tasks</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {report.metrics?.totalReminders ?? 12}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Schedule Adherence</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                  {report.metrics?.adherenceRate ?? 85}%
                </span>
              </div>
            </div>

            {/* Clinical Observational Narrative */}
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-bold text-slate-900">Clinical Narrative Observation</h3>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm leading-relaxed text-slate-800 space-y-2">
                <p>{report.aiNarrative}</p>
              </div>
            </div>

            {/* Compliance Disclaimer (Mandatory) */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Clinical Compliance Notice:</strong> {report.disclaimer || "This report is generated from application usage telemetry and structured AI observation. It is intended solely as an assistive dashboard observation for authorized care teams and does NOT constitute a clinical or medical diagnosis."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}