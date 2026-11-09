"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
type Role = "student" | "teacher";

type Step = "email" | "otp" | "verified";

function ForgotPassword() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [step, setStep] = useState<Step>("email");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // API HELPER
  const apiRequest = async (
    endpoint: string,
    method: string,
    body?: object,
  ) => {
    const response = await fetch(`/server/${endpoint.replace(/^\/+/, "")}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  };

  // STEP 1: SEND FORGOT PASSWORD OTP
  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiRequest("auth/forgot-password-otp", "POST", {
        email: email.trim(),
        role,
      });

      if (response.status === true) {
        setSuccess(response.message || "OTP has been sent to your email.");

        setStep("otp");
      } else {
        setError(response.message || "Unable to send OTP.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY OTP
  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiRequest(
        "auth/check-forgot-password-otp",
        "POST",
        {
          email: email.trim(),
          role,
          resetCode: otp.trim(),
        },
      );

      if (response.status === true) {
        setSuccess("OTP verified successfully. Redirecting...");

        router.push(
          `/resetpassword?email=${encodeURIComponent(email.trim())}&role=${role}`,
        );
      } else {
        setError(response.message || "Invalid or expired OTP.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // CHANGE EMAIL
  const handleChangeEmail = () => {
    setStep("email");
    setOtp("");

    setError("");
    setSuccess("");
  };

  // RESEND OTP
  const handleResendOtp = async () => {
    setError("");
    setSuccess("");

    try {
      setLoading(true);

      const response = await apiRequest("auth/forgot-password-otp", "POST", {
        email: email.trim(),
        role,
      });

      if (response.status === true) {
        setSuccess("A new OTP has been sent to your email.");

        setOtp("");
      } else {
        setError(response.message || "Unable to resend OTP.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-7 shadow-2xl">
        {/* HEADER */}

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-2xl text-blue-400">
            🔐
          </div>

          <h1 className="text-2xl font-bold text-white">Forgot Password?</h1>

          <p className="mt-2 text-sm text-gray-400">
            Recover your account using email verification.
          </p>
        </div>

        {/* STEP INDICATOR */}

        <div className="mb-8 flex items-center justify-center gap-3">
          <div
            className={`h-2 w-12 rounded-full ${
              step === "email" ? "bg-blue-500" : "bg-green-500"
            }`}
          />

          <div
            className={`h-2 w-12 rounded-full ${
              step === "email"
                ? "bg-gray-700"
                : step === "otp"
                  ? "bg-blue-500"
                  : "bg-green-500"
            }`}
          />

          <div
            className={`h-2 w-12 rounded-full ${
              step === "verified" ? "bg-green-500" : "bg-gray-700"
            }`}
          />
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {success && (
          <div className="mb-5 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {success}
          </div>
        )}

        {/* STEP 1: EMAIL */}

        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Select Account Type
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`rounded-lg border p-3 text-sm font-medium transition ${
                    role === "student"
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  Student
                </button>

                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`rounded-lg border p-3 text-sm font-medium transition ${
                    role === "teacher"
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  Teacher
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {/* STEP 2: OTP */}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center">
              <p className="text-sm text-gray-400">Enter the OTP sent to</p>

              <p className="mt-1 font-medium text-white">{email}</p>

              <p className="mt-2 text-xs capitalize text-gray-500">
                Account type: {role}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Enter OTP
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit OTP"
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-center text-xl tracking-[0.5em] text-white outline-none transition placeholder:text-gray-500 placeholder:tracking-normal focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full text-sm text-blue-400 transition hover:text-blue-300 disabled:opacity-50"
            >
              Resend OTP
            </button>

            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={loading}
              className="w-full text-sm text-gray-400 transition hover:text-white"
            >
              Change email address
            </button>
          </form>
        )}

        {/* STEP 3: VERIFIED */}

        {step === "verified" && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-3xl text-green-400">
              ✓
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                OTP Verified!
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Your email has been verified successfully.
              </p>
            </div>

            <p className="text-sm text-gray-400">
              You can now proceed to create a new password once the password
              reset endpoint is connected.
            </p>
          </div>
        )}

        {/* FOOTER */}

        <div className="mt-8 border-t border-gray-800 pt-5 text-center">
          <a
            href="/login"
            className="text-sm text-gray-400 transition hover:text-blue-400"
          >
            ← Back to Login
          </a>
        </div>
      </div>
    </main>
  );
}

export default ForgotPassword;
