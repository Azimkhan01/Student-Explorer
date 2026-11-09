
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setAll } from "@/redux/user/User.Slice";

function AdminLogin() {
  const router = useRouter();
  const dispatch = useDispatch();

  // Wizard states
  const [step, setStep] = useState<"email" | "otp">("email");

  // Form states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Loading and messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // OTP timer states
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // ==========================================
  // COUNTDOWN TIMER
  // ==========================================

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((expiresAt - Date.now()) / 1000)
      );

      setTimeLeft(remaining);

      if (remaining <= 0) {
        setError("Your OTP has expired. Please request a new one.");
        setSuccess("");
      }
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // ==========================================
  // STEP 1: SEND OTP
  // ==========================================

  const handleSendOTP = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/server/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send OTP.");
      }

      if (!data.expiresAt || !Number.isFinite(Number(data.expiresAt))) {
        throw new Error("Invalid OTP expiry information received.");
      }

      // Set expiry using backend timestamp
      setExpiresAt(Number(data.expiresAt));

      setEmail(email.trim().toLowerCase());
      setOtp("");
      setStep("otp");

      setSuccess(data.message || "OTP sent successfully.");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 2: VERIFY OTP
  // ==========================================

  const handleVerifyOTP = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (timeLeft <= 0) {
      setError("OTP has expired. Please request a new OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/server/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid or expired OTP.");
      }

      setSuccess("OTP verified successfully!");

      // Clear timer
      setExpiresAt(null);
      setTimeLeft(0);
dispatch(
        setAll({
          email,
          username: "admin",
          role:"admin",
          isLoading: false,
          isError: false,
        })
      );
      // Redirect after successful verification
      router.push("/admin/dashboard");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid or expired OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 3: RESEND OTP
  // ==========================================

  const handleResendOTP = async () => {
    if (timeLeft > 0 || loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/server/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to resend OTP.");
      }

      if (!data.expiresAt || !Number.isFinite(Number(data.expiresAt))) {
        throw new Error("Invalid OTP expiry information received.");
      }

      // Reset timer from backend expiry timestamp
      setExpiresAt(Number(data.expiresAt));

      setOtp("");
      setSuccess("A new verification code has been sent.");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 4: BACK TO EMAIL
  // ==========================================

  const handleBack = () => {
    setStep("email");
    setOtp("");
    setError("");
    setSuccess("");
    setExpiresAt(null);
    setTimeLeft(0);
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">

      <div className="w-full max-w-6xl min-h-[650px] grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl border border-gray-100">

        {/* LEFT SIDE */}
        <div className="flex flex-col justify-center px-8 sm:px-14 py-12">

          {/* LOGO */}
          <div className="mb-16">
            <div className="flex items-center gap-2">

              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>

              <span className="text-2xl font-bold text-gray-900">
                Admin<span className="text-blue-600">Panel</span>
              </span>

            </div>
          </div>

          {/* STEP 1: EMAIL */}
          {step === "email" && (
            <>
              <div className="mb-8">

                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  Admin sign in
                </h1>

                <p className="text-gray-500 text-sm leading-6">
                  Enter your registered admin email address.
                  We'll send you a one-time verification code.
                </p>

              </div>

              <form onSubmit={handleSendOTP} className="space-y-6">

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />

                </div>

                {error && (
                  <p className="text-sm text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition"
                >
                  {loading ? "Sending OTP..." : "Continue with email"}
                </button>

              </form>
            </>
          )}

          {/* STEP 2: OTP */}
          {step === "otp" && (
            <>
              <div className="mb-8">

                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm text-blue-600 hover:text-blue-700 mb-7"
                >
                  ← Change email
                </button>

                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6">

                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-600"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>

                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  Check your email
                </h1>

                <p className="text-gray-500 text-sm leading-6">
                  We've sent a 6-digit verification code to
                  <br />

                  <span className="font-semibold text-gray-800">
                    {email}
                  </span>
                </p>

              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-6">

                {/* OTP INPUT */}
                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Verification code
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="000000"
                    required
                    className="w-full px-4 py-4 border border-gray-300 rounded-lg text-center text-2xl tracking-[0.6em] font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                {/* OTP COUNTDOWN TIMER */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <div className="flex items-center justify-between mb-3">

                    <span className="text-sm font-medium text-gray-600">
                      OTP expires in
                    </span>

                    <span
                      className={`text-lg font-bold tabular-nums ${
                        timeLeft <= 30
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {formatTime(timeLeft)}
                    </span>

                  </div>

                  {/* PROGRESS BAR */}
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">

                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        timeLeft <= 30
                          ? "bg-red-500"
                          : "bg-blue-600"
                      }`}
                      style={{
                        width: `${(timeLeft / 120) * 100}%`,
                      }}
                    />

                  </div>

                  <p className="mt-3 text-xs text-gray-500">

                    {timeLeft > 0
                      ? "Please enter the verification code before it expires."
                      : "Your OTP has expired. Request a new verification code."}

                  </p>

                </div>

                {/* ERROR MESSAGE */}
                {error && (
                  <p className="text-sm text-red-600">
                    {error}
                  </p>
                )}

                {/* SUCCESS MESSAGE */}
                {success && (
                  <p className="text-sm text-green-600">
                    {success}
                  </p>
                )}

                {/* VERIFY BUTTON */}
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6 || timeLeft === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition"
                >
                  {loading ? "Verifying..." : "Verify & Sign in"}
                </button>

              </form>

              {/* RESEND OTP */}
              <div className="mt-6 text-center">

                <p className="text-sm text-gray-500">
                  Didn't receive the code?
                </p>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading || timeLeft > 0}
                  className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Sending..."
                    : timeLeft > 0
                      ? `Resend OTP in ${formatTime(timeLeft)}`
                      : "Resend OTP"}
                </button>

              </div>
            </>
          )}

          {/* FOOTER */}
          <div className="mt-12 text-center">

            <p className="text-xs text-gray-400">
              Protected administrative access.
            </p>

          </div>

        </div>

        {/* RIGHT SIDE - BRANDING */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-12 text-white relative overflow-hidden">

          <div className="absolute w-80 h-80 rounded-full border border-blue-400/20 -top-24 -right-20" />

          <div className="absolute w-96 h-96 rounded-full border border-blue-400/20 -bottom-40 -left-20" />

          <div className="relative z-10">

            <span className="text-blue-200 text-sm font-semibold tracking-widest uppercase">
              Administration Portal
            </span>

          </div>

          <div className="relative z-10">

            <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-8">

              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>

            </div>

            <h2 className="text-4xl font-bold leading-tight mb-5">
              Secure access.
              <br />
              Complete control.
            </h2>

            <p className="text-blue-100/80 leading-7 max-w-sm">
              Your centralized administration workspace.
              Manage users, monitor activities, and control
              your platform with confidence.
            </p>

          </div>

          <div className="relative z-10 border-t border-white/20 pt-6">

            <p className="text-sm text-blue-200">
              Secure access · Admin workspace
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default AdminLogin;
