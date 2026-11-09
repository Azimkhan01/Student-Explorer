
"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setAll, setIsLoading } from "@/redux/user/User.Slice";

type UserRole = "student" | "teacher";

export default function Login() {
  const router = useRouter(); 
  const dispatch = useDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("student");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);

    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    // Basic validation
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);
      dispatch(setIsLoading(true))
      const response = await fetch(
        "/server/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            password,
            role,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid credentials.");
      }
      
      dispatch(
        setAll({
          email,
          username: "Azim khan ",
          role,
          isLoading: false,
          isError: false,
        })
      );

      dispatch(setIsLoading(false))
      setSuccess("Login successful!");
       
      // Redirect according to selected role
      if (role === "student") {
        router.push("/student/dashboard");
      } else {
        router.push("/teacher/dashboard");
      }

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid md:grid-cols-2 bg-white">

      {/* Login Form */}
      <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-24">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-blue-600 mb-12"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
            S
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            Student-Explorer
          </h1>
        </Link>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back
          </h2>

          <p className="text-gray-500 mt-2">
            Log in to your account to continue exploring.
          </p>

          <p className="text-sm text-gray-500 mt-4">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Account Type Selection */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">
            Continue as
          </label>

          <div className="grid grid-cols-2 gap-3">

            {/* Student */}
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
              <p className="font-semibold text-gray-900">
                Student
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Access your learning space
              </p>
            </button>

            {/* Teacher */}
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
              <p className="font-semibold text-gray-900">
                Class Teacher
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Manage your classroom
              </p>
            </button>

          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">

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
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
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
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {/* Success Message */}
          {success && (
            <p className="text-sm text-green-600" role="status">
              {success}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Logging in..."
              : `Login as ${
                  role === "student" ? "Student" : "Class Teacher"
                }`}
          </button>

        </form>

        {/* Footer */}
        <p className="mt-10 text-center text-xs text-gray-400">
          © 2026 Student-Explorer. All rights reserved.
        </p>

      </section>

      {/* Image Section */}
      <section className="relative hidden md:block min-h-screen bg-blue-50">

        <Image
          src="https://images.unsplash.com/photo-1769116404486-9cb6ed1c444b?w=600&auto=format&fit=crop&q=60"
          alt="Student learning and exploring"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-900/20 to-transparent" />

        <div className="absolute bottom-16 left-12 right-12 text-white">
          <h2 className="text-4xl font-bold leading-tight">
            Discover. Learn.
            <br />
            Explore your future.
          </h2>

          <p className="mt-4 max-w-md text-white/80 leading-relaxed">
            Your journey towards knowledge and opportunities
            starts here. Explore new possibilities with
            Student-Explorer.
          </p>
        </div>

      </section>

    </main>
  );
}
