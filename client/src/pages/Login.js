import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ArrowRight, RefreshCcw, ShieldCheck, AlertCircle, HeartHandshake, UserRound, Stethoscope } from "lucide-react";
import { SectionLabel, SoftButton, BrandMark } from "../components/shared";
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import authService, { normalizeIndianPhone } from "../services/authService";

export default function Login() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState("Patient");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const roleCards = [
    {
      id: "Patient",
      label: t('rolePatient') || "Patient",
      sub: t('rolePatientSub') || "Elderly user",
      icon: UserRound
    },
    {
      id: "Caregiver",
      label: t('roleCaregiver') || "Caregiver",
      sub: t('roleCaregiverSub') || "Family member",
      icon: HeartHandshake
    },
    {
      id: "HealthcareWorker",
      label: t('roleClinician') || "Healthcare Worker",
      sub: t('roleClinicianSub') || "Authorized professional",
      icon: Stethoscope
    },
  ];

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const { isValid, normalized, error } = normalizeIndianPhone(phoneNumber);
    if (!isValid) {
      setErrorMsg(error || "Please enter a valid 10-digit Indian phone number.");
      return;
    }

    setSubmitting(true);

    try {
      await authService.sendPhoneOtp(normalized);
      navigate("/verify", {
        state: {
          phone: normalized,
          role: selectedRole
        }
      });
    } catch (err) {
      setErrorMsg(err.message || "Failed to send verification code. Please check your number.");
      setSubmitting(false);
    }
  };

  // Quick Demo Access for Testing / Evaluation
  const handleQuickDemo = (role) => {
    const demoUser = {
      _id: role === 'Patient' ? '11111111-1111-1111-1111-111111111111' : (role === 'Caregiver' ? '22222222-2222-2222-2222-222222222222' : '33333333-3333-3333-3333-333333333333'),
      id: role === 'Patient' ? '11111111-1111-1111-1111-111111111111' : (role === 'Caregiver' ? '22222222-2222-2222-2222-222222222222' : '33333333-3333-3333-3333-333333333333'),
      name: role === 'Patient' ? 'Chetan Sharma' : (role === 'Caregiver' ? 'Ananya Sharma' : 'Dr. Barua'),
      role: role,
      phone: '+919876543210',
      isVerified: true
    };
    authService.persistSession(demoUser, 'demo-session-token');

    if (role === 'Patient') navigate('/patient');
    else if (role === 'Caregiver') navigate('/caregiver');
    else navigate('/healthcare');
  };

  return (
    <div className="min-h-screen bg-[#FAFBFB] text-[#222B32]">
      <div className="grid min-h-screen w-full lg:grid-cols-[0.9fr_1.1fr]">
        
        {/* Left Side Visual Banner */}
        <section className="relative hidden overflow-hidden bg-[#162D3D] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(183,216,206,0.15),transparent_32%),radial-gradient(circle_at_90%_80%,rgba(15,118,115,0.35),transparent_35%)]" />
          
          <div className="relative z-10 flex items-center justify-between">
            <BrandMark light />
            <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              {t('privateBadge') || "Private by design"}
            </div>
          </div>

          <div className="relative z-10 max-w-lg space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium text-[#B7D8CE]">
              <ShieldCheck className="h-4 w-4" />
              <span>{t('regionNote') || "Built for thoughtful care in Northeast India."}</span>
            </div>
            <h1 className="font-serif text-5xl leading-[1.1] tracking-[-0.04em] text-white xl:text-6xl">
              {t('heroTitle1') || "Memory is a"}<br />
              <em className="text-[#84CBC1] italic">{t('heroTitle2') || "place we can return to."}</em>
            </h1>
            <p className="text-base font-normal leading-7 text-white/70">
              {t('heroDesc') || "AI helps families and care teams make everyday moments feel familiar, supported, and deeply human."}
            </p>
          </div>

          <div className="relative z-10 text-xs text-white/50">
            {t('privacyFooter') || "Your information stays safe. HIPAA & DPDP Compliant."}
          </div>
        </section>

        {/* Right Side Login Form */}
        <main className="flex flex-col justify-between p-6 sm:p-10 lg:p-14">
          <div className="flex items-center justify-between">
            <div className="lg:hidden">
              <BrandMark />
            </div>
            <div className="ml-auto">
              <LanguageSelector />
            </div>
          </div>

          <div className="mx-auto my-auto w-full max-w-md py-8">
            <SectionLabel>{t('welcomeBack') || "Welcome back"}</SectionLabel>
            <h2 className="mt-2 font-serif text-3xl font-normal tracking-[-0.04em] text-[#162D3D] sm:text-4xl">
              {t('loginSubtitle') || "Sign in to your care space."}
            </h2>

            {/* Role Selection */}
            <div className="mt-8">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6F858D] mb-3 block">
                {t('continueAs') || "Select your role"}
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {roleCards.map((rc) => {
                  const Icon = rc.icon;
                  const isSelected = selectedRole === rc.id;
                  return (
                    <button
                      key={rc.id}
                      type="button"
                      onClick={() => setSelectedRole(rc.id)}
                      className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? "border-[#0F7673] bg-[#E5F0EE] text-[#0F7673] shadow-sm ring-1 ring-[#0F7673]"
                          : "border-[#DCE5E3] bg-white text-[#47616A] hover:bg-[#F3F6F5]"
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1.5" />
                      <span className="text-xs font-bold">{rc.label}</span>
                      <span className="text-[10px] text-[#78909A] mt-0.5">{rc.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-6 p-4 rounded-xl text-sm font-semibold bg-[#F6E9E6] text-[#9B4D45] border border-[#9B4D45]/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Phone Number Input Form */}
            <form onSubmit={handlePhoneSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6F858D] mb-2">
                  Mobile Number (+91)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-sm font-semibold text-[#162D3D] gap-1.5">
                    <Phone className="w-4 h-4 text-[#0F7673]" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="98765 43210"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value.replace(/\D/g, ""));
                      setErrorMsg("");
                    }}
                    className="w-full h-14 pl-20 pr-4 rounded-2xl border border-[#DCE5E3] bg-white text-lg font-medium text-[#162D3D] outline-none transition focus:border-[#0F7673] focus:ring-2 focus:ring-[#0F7673]/10"
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#78909A]">
                  We will send a 6-digit verification code to your phone.
                </p>
              </div>

              <SoftButton
                type="submit"
                className="w-full h-13 text-base"
                disabled={submitting || phoneNumber.length < 10}
                icon={submitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              >
                {submitting ? "Sending verification code..." : "Send Verification Code"}
              </SoftButton>
            </form>

            {/* Quick Demo Shortcuts for Testing */}
            <div className="mt-8 border-t border-slate-200/80 pt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#78909A] block mb-3 text-center">
                Quick Evaluation Mode
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('Patient')}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Demo Patient
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('Caregiver')}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Demo Caregiver
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('HealthcareWorker')}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Demo Clinician
                </button>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-[#6F858D]">
              New to AI Memory Care?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-[#0F7673] font-semibold hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-[#78909A]">
            {t('copyright') || "© 2026 AI Memory Care"} · {t('footerLinks') || "Privacy · Accessibility"}
          </div>
        </main>
      </div>
    </div>
  );
}