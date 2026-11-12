"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { EMAIL_RE, loadProfile, savePlayer } from "@/components/quiz/player";

interface FieldErrors {
  code?: string;
  username?: string;
  email?: string;
}

export default function JoinQuickzyPage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from ?code= and from the last session on this device.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("code");
    if (fromUrl && /^\d{1,6}$/.test(fromUrl)) setCode(fromUrl);

    const profile = loadProfile();
    if (profile) {
      setUsername(profile.username);
      setEmail(profile.email);
    }
  }, []);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const name = username.trim();
    const mail = email.trim();

    if (!/^\d{6}$/.test(code)) next.code = "Enter the 6-digit room code.";
    if (name.length < 2) next.username = "Name must be at least 2 characters.";
    else if (name.length > 24) next.username = "Name must be 24 characters or fewer.";
    if (!EMAIL_RE.test(mail)) next.email = "Enter a valid email address.";

    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    savePlayer({ username: username.trim(), email: email.trim().toLowerCase() });
    router.push(`/quickzy/${code}`);
  };

  const inputClass = (hasError?: string) =>
    `w-full rounded-xl border p-3 outline-none transition focus:ring-2 ${
      hasError
        ? "border-red-400 focus:ring-red-200"
        : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-200"
    }`;

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-5">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl shadow-lg">
            ⚡
          </div>
          <h1 className="text-3xl font-extrabold">Join a live quiz</h1>
          <p className="mt-1 text-gray-500">
            Enter the code your teacher shared with you.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          noValidate
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium">
              Room code
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-invalid={!!errors.code}
              className={`${inputClass(errors.code)} text-center text-2xl font-bold tracking-[0.5em]`}
            />
            <FieldError message={errors.code} />
          </div>

          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium">
              Your name
            </label>
            <input
              id="username"
              autoComplete="nickname"
              maxLength={24}
              placeholder="e.g. Aarav"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!errors.username}
              className={inputClass(errors.username)}
            />
            <FieldError message={errors.username} />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              className={inputClass(errors.email)}
            />
            <FieldError message={errors.email} />
          </div>

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={submitting ? undefined : { scale: 1.02 }}
            whileTap={submitting ? undefined : { scale: 0.97 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {submitting && (
              <motion.span
                className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
              />
            )}
            {submitting ? "Joining..." : "Continue"}
          </motion.button>
        </motion.form>

        <p className="text-center text-xs text-gray-400">
          Your name and email are visible to the teacher running this quiz.
        </p>
      </main>
    </MotionConfig>
  );
}

function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0, x: 0 }}
          animate={{ opacity: 1, height: "auto", x: [0, -6, 6, -4, 4, 0] }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-1 overflow-hidden text-sm text-red-600"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}