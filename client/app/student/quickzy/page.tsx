"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

const CODE_LENGTH = 6;

export default function Page() {
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isComplete = code.length === CODE_LENGTH;

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold">Join a live quiz</h1>
          <p className="mt-2 text-gray-500">
            Enter the 6-digit code shown on your teacher&apos;s screen.
          </p>
        </motion.div>

        {/* One real input sits invisibly over six display boxes */}
        <div
          className="relative cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            autoFocus
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            value={code}
            aria-label="6-digit room code"
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))
            }
            className="absolute inset-0 z-10 h-full w-full opacity-0"
          />

          <motion.div
            animate={isComplete ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
            className="flex gap-2 sm:gap-3"
          >
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const digit = code[i];
              const isActive = i === code.length && !isComplete;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: i * 0.06,
                  }}
                  className={`relative flex h-16 w-11 items-center justify-center rounded-xl border-2 text-3xl font-extrabold sm:h-20 sm:w-14 sm:text-4xl ${
                    isComplete
                      ? "border-green-500 bg-green-50 text-green-700"
                      : digit
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : isActive
                          ? "border-indigo-400 bg-white"
                          : "border-gray-200 bg-white"
                  }`}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {digit && (
                      <motion.span
                        key={`${i}-${digit}`}
                        initial={{ scale: 0.4, opacity: 0, y: -10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      >
                        {digit}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {isActive && (
                    <motion.span
                      aria-hidden
                      className="absolute h-8 w-0.5 rounded bg-indigo-500"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        <div className="h-14">
          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="join"
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
              >
                <Link
                  href={`/student/quickzy/${code}`}
                  className="block rounded-xl bg-indigo-600 px-8 py-3.5 text-lg font-semibold text-white shadow-lg"
                >
                  Join Room
                </Link>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pt-3 text-sm text-gray-400"
              >
                {CODE_LENGTH - code.length} digit
                {CODE_LENGTH - code.length === 1 ? "" : "s"} to go
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </main>
    </MotionConfig>
  );
}