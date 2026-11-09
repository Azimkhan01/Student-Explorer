"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
type UserRole = "student" | "teacher";

export default function Signup() {
  // =====================================
  // STATES
  // =====================================
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("student");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    creatorCode: "",
    password: "",
    confirmPassword: "",
  });

  const [termsAccepted, setTermsAccepted] = useState(false);

  // Loading states
  const [sendingCode, setSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  // =====================================
  // HANDLE INPUT CHANGES
  // =====================================
  const checkCreatorCode = async () => {
    if (
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.creatorCode.trim()
    ) {
      return;
    }

    try {
      setIsCheckingCode(true);
      setError("");
      setSuccess("");

      const response = await fetch("/server/auth/creator-code/check", {
        method: "QUERY",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          creatorCode: formData.creatorCode,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Invalid creator code.");
      }
      data.status
        ? setSuccess(data.message || "Creator code verified successfully!")
        : setError(data.message);
      toast.success(data.message || "Creator code verified!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to verify creator code.";

      toast.error(message);
    } finally {
      setIsCheckingCode(false);
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkCreatorCode();
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.creatorCode]);

  // =====================================
  // SEND CREATOR CODE API
  // =====================================

  const handleSendCode = async () => {
    if (!formData.email.trim()) {
      setError("Please enter your email address first.");
      return;
    }

    setSendingCode(true);
    setError("");
    setSuccess("");
    const sendCodePromise = fetch("/server/auth/creator-code/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.email,
        username: formData.username,
        role:role,
      }),
    }).then(async (response) => {
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send creator code.");
      }
      return data;
    });

    try {
      const data: any = await toast.promise(sendCodePromise, {
        loading: "Preparing your creator verification code...",
        success: (data) => data.message || "Creator code sent successfully!",
        error: (err) =>
          err instanceof Error ? err.message : "Unable to send creator code.",
      });

      setSuccess(data?.message || "Creator code sent successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while sending the code.",
      );
    } finally {
      setSendingCode(false);
    }
  };

  // =====================================
  // SIGNUP API
  // =====================================

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // Password validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!termsAccepted) {
      setError("Please accept the Terms and Conditions.");
      return;
    }

    setIsSubmitting(true);

    try {
      const signupPromise = fetch("/server/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          creatorCode: formData.creatorCode,
          password: formData.password,
          role,
        }),
      }).then(async (response) => {
        const data = await response.json();

        // Check HTTP status and backend response
        if (!response.ok || data.status === false) {
          throw new Error(data.message || "Signup failed.");
        }

        return data;
      });

      const data = await toast.promise(signupPromise, {
        loading: "Creating your account...",

        success: (data) => {
          const message = data.message || "Account created successfully.";

          setSuccess(message);
          setError("");

          return message;
        },

        error: (err) => {
          const message =
            err instanceof Error
              ? err.message
              : "Something went wrong during signup.";

          setError(message);
          setSuccess("");

          return message;
        },
      });

      // Reset form only after successful signup
      setFormData({
        username: "",
        email: "",
        creatorCode: "",
        password: "",
        confirmPassword: "",
      });

      setTermsAccepted(false);

      // Redirect after successful signup
      router.replace("/login");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong during signup.";

      setError(message);
      setSuccess("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================
  // UI
  // =====================================

  return (
    <main className="min-h-screen grid md:grid-cols-2 bg-white">
      {/* Signup Form Section */}
      <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-24">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-blue-600 mb-8">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
            S
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            Student-Explorer
          </h1>
        </Link>

        {/* Heading */}
        <div className="mb-7">
          <h2 className="text-3xl font-bold text-gray-900">
            Create your account
          </h2>

          <p className="text-gray-500 mt-2">
            Join Student-Explorer and start your journey.
          </p>

          <p className="text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Log in
            </Link>
          </p>
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">
            Create account as
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("student")}
              aria-pressed={role === "student"}
              className={`rounded-xl border p-4 text-left transition ${
                role === "student"
                  ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <p className="font-semibold text-gray-900">Student</p>

              <p className="text-xs text-gray-500 mt-1">Join as a student</p>
            </button>

            <button
              type="button"
              onClick={() => setRole("teacher")}
              aria-pressed={role === "teacher"}
              className={`rounded-xl border p-4 text-left transition ${
                role === "teacher"
                  ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <p className="font-semibold text-gray-900">Class Teacher</p>

              <p className="text-xs text-gray-500 mt-1">
                Register as a teacher
              </p>
            </button>
          </div>
        </div>

        {/* Signup Form */}
        <form className="space-y-4" onSubmit={handleSignup}>
          {/* Full Name */}
          {/* <div className="flex flex-col gap-2">
            <label
              htmlFor="fullName"
              className="text-sm font-medium text-gray-700"
            >
              Full Name
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Enter your full name"
              autoComplete="name"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div> */}

          {/* Username */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="username"
              className="text-sm font-medium text-gray-700"
            >
              Username
            </label>

            <input
              id="username"
              name="username"
              type="text"
              placeholder="Choose a username"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Creator Code */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="creatorCode"
              className="text-sm font-medium text-gray-700"
            >
              Creator Code <span className="text-red-500">*</span>
            </label>

            <div className="flex gap-2">
              <input
                id="creatorCode"
                name="creatorCode"
                type="text"
                placeholder="Enter your creator code"
                value={formData.creatorCode}
                onChange={handleChange}
                required
                autoComplete="off"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode || !formData.email.trim()}
                className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {sendingCode ? "Sending..." : "Send Code"}
              </button>
            </div>

            <p className="text-xs text-gray-500">
              A valid creator code is required to create your account. Contact
              your administrator if you don't have one.
            </p>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-20 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-blue-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Password must contain at least 8 characters.
            </p>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Terms */}
          <div className="flex items-start gap-2 pt-1">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="h-4 w-4 mt-0.5 accent-blue-600"
            />

            <label htmlFor="terms" className="text-sm text-gray-600">
              I agree to the{" "}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms and Conditions
              </Link>
              .
            </label>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Success Message */}
          {success && <p className="text-sm text-green-600">{success}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting
              ? "Creating Account..."
              : `Create ${role === "student" ? "Student" : "Teacher"} Account`}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          © 2026 Student-Explorer. All rights reserved.
        </p>
      </section>

      {/* Image Section */}
      <section className="relative hidden md:block min-h-screen bg-blue-50">
        <Image
          src="https://images.unsplash.com/photo-1793450795419-b6e2ae37e0be?w=1200&auto=format&fit=crop&q=85"
          alt="Students learning together"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-900/20 to-transparent" />

        <div className="absolute bottom-16 left-12 right-12 text-white">
          <h2 className="text-4xl font-bold leading-tight">
            Your journey.
            <br />
            Your knowledge.
            <br />
            Your future.
          </h2>

          <p className="mt-4 max-w-md text-white/80 leading-relaxed">
            Connect, collaborate and grow with Student-Explorer. A platform
            designed to make learning more accessible.
          </p>
        </div>
      </section>
    </main>
  );
}
