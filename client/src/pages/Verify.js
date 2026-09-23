import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Phone, RefreshCcw, AlertCircle, ArrowLeft } from "lucide-react";
import { SectionLabel, SoftButton } from "../components/shared";
import authService, { normalizeIndianPhone } from "../services/authService";
import { useLanguage } from "../context/LanguageContext";

export default function Verify() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve phone, role, and name passed from Login or Register
  const rawPhone = location.state?.phone || "";
  const role = location.state?.role || "Patient";
  const name = location.state?.name || "";

  const { normalized: phone } = normalizeIndianPhone(rawPhone);

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const inputRefs = useRef([]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus the first input box on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleDigitChange = (index, value) => {
    // Only allow numbers
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue && value !== "") return;

    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue.slice(-1); // Take the latest single digit
    setOtpDigits(newDigits);
    setErrorMsg("");

    // Auto-advance to next box if digit is entered
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits are filled
    if (newDigits.every(d => d !== "") && index === 5) {
      triggerVerification(newDigits.join(""));
    }
  };

  const handleKeyDown = (index, e) => {
    // On Backspace on an empty box, move back to previous box
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);

    // Focus last filled box
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();

    if (pasted.length === 6) {
      triggerVerification(pasted);
    }
  };

  const triggerVerification = async (tokenString) => {
    const code = tokenString || otpDigits.join("");
    if (code.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const user = await authService.verifyPhoneOtp(phone, code, role, name);
      setSuccessMsg("Verification successful! Preparing your care space...");

      setTimeout(() => {
        const userRole = (user.role || role).toLowerCase();
        if (userRole === "patient") navigate("/patient");
        else if (userRole === "caregiver") navigate("/caregiver");
        else if (userRole.includes("health") || userRole.includes("clinic")) navigate("/healthcare");
        else navigate("/patient");
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || "Invalid verification code. Please check and try again.");
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await authService.sendPhoneOtp(phone);
      setSuccessMsg("A new verification code has been sent.");
      setCountdown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setErrorMsg(err.message || "Failed to resend code. Please try again shortly.");
    } finally {
      setResending(false);
    }
  };

  // If accessed directly without a phone number
  if (!phone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFBFB] p-5 text-[#222B32]">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F6E9E6] text-[#9B4D45] mb-6">
            <AlertCircle className="h-7 w-7" />
          </div>
          <SectionLabel>Missing Information</SectionLabel>
          <h2 className="font-serif text-3xl text-[#162D3D] mb-4 mt-2">No phone number found</h2>
          <p className="text-sm text-[#6F858D] mb-8">Please start with your phone number to sign in or register.</p>
          <SoftButton onClick={() => navigate("/login")}>Go to Sign In</SoftButton>
        </div>
      </div>
    );
  }

  // Format phone display nicely: +91 XXXXX XXXXX
  const formattedDisplay = phone.length >= 13
    ? `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}`
    : phone;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFBFB] px-5 py-12 text-[#222B32]">
      <div className="mx-auto flex w-full max-w-md flex-col justify-center text-center">
        
        {/* Icon Header */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E5F0EE] text-[#0F7673]">
          <Phone className="h-7 w-7" />
        </div>

        {/* Copy */}
        <div className="mt-7">
          <SectionLabel>{t('verifyTitle') || "Verify your identity"}</SectionLabel>
          <h1 className="font-serif text-4xl tracking-[-0.045em] text-[#162D3D]">
            One small step<br />
            <em className="text-[#0F7673]">to keep you safe.</em>
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#6F858D]">
            Enter the 6-digit code sent to <br />
            <span className="font-semibold text-[#162D3D] tracking-wide">{formattedDisplay}</span>
          </p>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl text-sm font-semibold bg-[#F6E9E6] text-[#9B4D45] border border-[#9B4D45]/20 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-6 p-4 rounded-xl text-sm font-semibold bg-[#E5F0EE] text-[#0F7673] border border-[#0F7673]/20 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auto-advancing 6-Box OTP Input */}
        <form onSubmit={(e) => { e.preventDefault(); triggerVerification(); }} className="mt-8 space-y-6">
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={submitting}
                className="h-14 w-12 sm:h-16 sm:w-14 rounded-xl border border-[#DCE5E3] bg-white text-center text-2xl font-bold text-[#162D3D] outline-none transition focus:border-[#0F7673] focus:ring-2 focus:ring-[#0F7673]/20 disabled:bg-[#F3F6F5]"
              />
            ))}
          </div>

          <SoftButton
            type="submit"
            className="w-full h-12"
            disabled={submitting || otpDigits.some((d) => d === "")}
            icon={submitting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          >
            {submitting ? "Verifying code..." : "Verify & Continue"}
          </SoftButton>
        </form>

        {/* Resend & Change Phone Number */}
        <div className="mt-8 flex flex-col items-center gap-4 text-xs font-medium text-[#78909A]">
          <div>
            Didn't receive a code?{" "}
            {countdown > 0 ? (
              <span className="text-[#0F7673] font-semibold ml-1">Resend code in {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-[#0F7673] font-semibold hover:underline ml-1 cursor-pointer"
              >
                {resending ? "Sending..." : "Resend code"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-1 text-[#47616A] hover:text-[#162D3D] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change phone number</span>
          </button>
        </div>
      </div>
    </div>
  );
}