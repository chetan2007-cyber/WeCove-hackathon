import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Mail, ArrowRight, RefreshCcw, ShieldCheck, AlertCircle, HeartHandshake, UserRound, Stethoscope } from "lucide-react";
import { SectionLabel, SoftButton, BrandMark } from "../components/shared";
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import authService, { normalizeIndianPhone, isValidEmail } from "../services/authService";

export default function Register() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [authMethod, setAuthMethod] = useState("phone"); // 'phone' | 'email'
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState("Patient");
  const [termsAgreed, setTermsAgreed] = useState(true);
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    if (!termsAgreed) {
      setErrorMsg("Please accept the terms of care to continue.");
      return;
    }

    if (authMethod === "phone") {
      const { isValid, normalized, error } = normalizeIndianPhone(phoneNumber);
      if (!isValid) {
        setErrorMsg(error || "Please enter a valid 10-digit Indian mobile number.");
        return;
      }

      setSubmitting(true);
      try {
        const res = await authService.sendPhoneOtp(normalized, selectedRole);
        navigate("/verify", {
          state: {
            phone: normalized,
            role: selectedRole,
            name: name.trim(),
            authMethod: "phone",
            smsDelivered: res.smsDelivered,
            devOtp: res.devOtp,
            providerNotice: res.message
          }
        });
      } catch (err) {
        setErrorMsg(err.message || "Failed to send verification code. Please check your number.");
        setSubmitting(false);
      }
    } else {
      const cleanEmail = emailAddress.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        setErrorMsg("Please enter a valid email address (e.g. name@domain.com).");
        return;
      }

      setSubmitting(true);
      try {
        const res = await authService.sendEmailOtp(cleanEmail, selectedRole);
        navigate("/verify", {
          state: {
            email: cleanEmail,
            role: selectedRole,
            name: name.trim(),
            authMethod: "email",
            emailDelivered: res.emailDelivered,
            devOtp: res.devOtp,
            providerNotice: res.message
          }
        });
      } catch (err) {
        setErrorMsg(err.message || "Failed to send verification email. Please check your address.");
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFB] text-[#222B32]">
      <div className="grid min-h-screen w-full lg:grid-cols-[0.9fr_1.1fr]">
        
        {/* Left Side Presentation Banner */}
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
              {t('beginSpace') || "Begin your"}<br />
              <em className="text-[#84CBC1] italic">{t('togetherEm') || "care space."}</em>
            </h1>
            <p className="text-base font-normal leading-7 text-white/70">
              {t('signupSubtitle') || "Create a private, protected space for your family and authorized care team."}
            </p>
          </div>

          <div className="relative z-10 text-xs text-white/50">
            {t('privacyFooter') || "Your information stays safe. HIPAA & DPDP Compliant."}
          </div>
        </section>

        {/* Right Side Registration Form */}
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
            <SectionLabel>{t('createAccountTab') || "Create account"}</SectionLabel>
            <h2 className="mt-2 font-serif text-3xl font-normal tracking-[-0.04em] text-[#162D3D] sm:text-4xl">
              {t('togetherTitle') || "A little more together."}
            </h2>

            {/* Role Selection */}
            <div className="mt-8">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6F858D] mb-3 block">
                {t('createAs') || "Account type"}
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

            {/* Auth Method Switcher: Phone vs Email */}
            <div className="mt-6 flex rounded-xl bg-[#EFEFEF]/70 p-1 border border-[#DCE5E3]">
              <button
                type="button"
                onClick={() => { setAuthMethod("phone"); setErrorMsg(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  authMethod === "phone"
                    ? "bg-white text-[#0F7673] shadow-sm"
                    : "text-[#6F858D] hover:text-[#162D3D]"
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Register with Phone</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod("email"); setErrorMsg(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  authMethod === "email"
                    ? "bg-white text-[#0F7673] shadow-sm"
                    : "text-[#6F858D] hover:text-[#162D3D]"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Register with Email</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-6 p-4 rounded-xl text-sm font-semibold bg-[#F6E9E6] text-[#9B4D45] border border-[#9B4D45]/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleRegister} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6F858D] mb-2">
                  {t('nameLabel') || "Full Name"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('namePlaceholder') || "Priya Devi"}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg("");
                  }}
                  className="w-full h-14 px-4 rounded-2xl border border-[#DCE5E3] bg-white text-base font-medium text-[#162D3D] outline-none transition focus:border-[#0F7673] focus:ring-2 focus:ring-[#0F7673]/10"
                />
              </div>

              {authMethod === "phone" && (
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
                </div>
              )}

              {authMethod === "email" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6F858D] mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-sm font-semibold text-[#162D3D]">
                      <Mail className="w-4 h-4 text-[#0F7673]" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="name@smriti.care"
                      value={emailAddress}
                      onChange={(e) => {
                        setEmailAddress(e.target.value);
                        setErrorMsg("");
                      }}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl border border-[#DCE5E3] bg-white text-base font-medium text-[#162D3D] outline-none transition focus:border-[#0F7673] focus:ring-2 focus:ring-[#0F7673]/10"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0F7673] focus:ring-[#0F7673]"
                />
                <label htmlFor="terms" className="text-xs leading-5 text-[#6F858D]">
                  {t('termsText') || "I agree to the thoughtful care terms and understand this is a cognitive support tool, not a medical diagnosis."}
                </label>
              </div>

              <SoftButton
                type="submit"
                className="w-full h-13 text-base"
                disabled={submitting || !name.trim() || (authMethod === 'phone' ? phoneNumber.length < 10 : !emailAddress.trim()) || !termsAgreed}
                icon={submitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              >
                {submitting ? "Sending verification code..." : "Create Care Space"}
              </SoftButton>
            </form>

            <div className="mt-8 text-center text-xs text-[#6F858D]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-[#0F7673] font-semibold hover:underline cursor-pointer"
              >
                Sign in
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