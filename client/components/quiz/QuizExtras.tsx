"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedNumber, type LeaderboardEntry } from "./QuizMotion";

export type RankedEntry = LeaderboardEntry;

export const AVATARS = [
  "🦊", "🐼", "🦁", "🐯", "🐸", "🐵", "🦄", "🐙",
  "🐧", "🦉", "🐳", "🦋", "🚀", "⭐", "🔥", "🎮",
];

// --------------------------------
// Countdown synced to the SERVER clock
// --------------------------------
export function useServerCountdown(
  endsAt: number | null,
  offsetMs: number,
  active: boolean,
) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!active || !endsAt) return;
    const i = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(i);
  }, [active, endsAt]);

  if (!active || !endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - (Date.now() + offsetMs)) / 1000));
}

// --------------------------------
// Avatars
// --------------------------------
export function AvatarBadge({
  avatar,
  name,
  size = 40,
}: {
  avatar?: string;
  name: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 shadow-sm ring-2 ring-white"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {avatar || name.charAt(0).toUpperCase()}
    </span>
  );
}

export function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (avatar: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose avatar"
      className="grid grid-cols-4 gap-2 sm:grid-cols-8"
    >
      {AVATARS.map((a) => {
        const selected = value === a;
        return (
          <motion.button
            key={a}
            type="button"
            role="radio"
            aria-checked={selected}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(a)}
            className={`flex h-12 items-center justify-center rounded-xl border text-2xl ${
              selected
                ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-300"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            {a}
          </motion.button>
        );
      })}
    </div>
  );
}

// --------------------------------
// Rolling timer (digits roll like a ticker)
// --------------------------------
function RollingDigit({ digit }: { digit: string }) {
  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{ height: "1.1em", width: "0.64em", lineHeight: 1.1 }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={digit}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 38 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function QuizTimer({
  remaining,
  total,
  endsAt,
  offsetMs,
  ended,
  size = 96,
}: {
  remaining: number;
  total: number;
  endsAt: number;
  offsetMs: number;
  ended: boolean;
  size?: number;
}) {
  const ratio = total > 0 ? remaining / total : 0;
  const danger = !ended && remaining > 0 && remaining <= 5;

  const color =
    ended || remaining === 0
      ? "#9ca3af"
      : ratio > 0.5
        ? "#4f46e5"
        : ratio > 0.25
          ? "#f59e0b"
          : "#ef4444";

  // Ring animation is computed once per question (smooth, linear).
  const { startRatio, durationSec } = useMemo(() => {
    const left = Math.max(0, endsAt - (Date.now() + offsetMs));
    return {
      startRatio: Math.min(1, left / (total * 1000)),
      durationSec: left / 1000,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  const digits = String(remaining).padStart(2, "0").split("");

  return (
    <motion.div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      animate={danger ? { scale: [1, 1.07, 1] } : { scale: 1 }}
      transition={danger ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
      role="timer"
      aria-label={`${remaining} seconds remaining`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <motion.circle
          key={endsAt}
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ pathLength: startRatio }}
          // The target changes slightly when the question ends, so an early
          // "End question now" re-triggers the animation and stops the ring.
          animate={{ pathLength: ended ? 0.0001 : 0 }}
          transition={
            ended ? { duration: 0.3 } : { duration: durationSec, ease: "linear" }
          }
          style={{ stroke: color, transition: "stroke 0.4s" }}
        />
      </svg>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center font-extrabold tabular-nums"
        style={{ color, fontSize: size * 0.34 }}
      >
        <span className="flex">
          {digits.map((d, i) => (
            <RollingDigit key={i} digit={d} />
          ))}
        </span>
        <span
          className="font-medium uppercase text-gray-400"
          style={{ fontSize: size * 0.1 }}
        >
          sec
        </span>
      </div>
    </motion.div>
  );
}

// --------------------------------
// Leaderboard + Podium with avatars
// --------------------------------
const MEDALS = ["🥇", "🥈", "🥉"];

export function AvatarLeaderboard({
  entries,
  highlightId,
  showTime,
}: {
  entries: RankedEntry[];
  highlightId?: string;
  showTime?: boolean;
}) {
  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {entries.map((e) => {
          const mine = !!highlightId && e.socketId === highlightId;
          return (
            <motion.li
              key={e.socketId}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                mine ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white"
              }`}
            >
              <span className="w-8 text-center text-lg font-bold text-gray-600">
                {e.rank <= 3 ? MEDALS[e.rank - 1] : `#${e.rank}`}
              </span>
              <AvatarBadge avatar={e.avatar} name={e.username} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {e.username}
                  {mine && (
                    <span className="ml-2 text-xs font-medium text-indigo-600">You</span>
                  )}
                </p>
                {showTime && (
                  <p className="text-xs text-gray-500">
                    {(e.totalTimeMs / 1000).toFixed(1)}s total
                  </p>
                )}
              </div>
              <p className="text-lg font-extrabold text-indigo-600">
                <AnimatedNumber value={e.score} />
                <span className="ml-1 text-xs font-medium text-gray-400">pts</span>
              </p>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

export function AvatarPodium({ entries }: { entries: RankedEntry[] }) {
  const top = entries.slice(0, 3);
  if (top.length === 0) return null;

  // visual order: 2nd, 1st, 3rd
  const order = [top[1], top[0], top[2]].filter(Boolean) as RankedEntry[];
  const heights: Record<number, number> = { 1: 130, 2: 95, 3: 70 };
  const colors: Record<number, string> = {
    1: "bg-amber-400",
    2: "bg-gray-300",
    3: "bg-orange-300",
  };

  return (
    <div className="flex items-end justify-center gap-3 pt-6">
      {order.map((e) => (
        <motion.div
          key={e.socketId}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 18,
            delay: e.rank === 1 ? 0.5 : e.rank === 2 ? 0.25 : 0,
          }}
          className="flex w-24 flex-col items-center sm:w-28"
        >
          <AvatarBadge avatar={e.avatar} name={e.username} size={e.rank === 1 ? 64 : 52} />
          <p className="mt-1 w-full truncate text-center text-sm font-semibold">
            {e.username}
          </p>
          <p className="text-xs text-gray-500">{e.score} pts</p>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: heights[e.rank] }}
            transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.2 }}
            className={`mt-2 flex w-full items-start justify-center rounded-t-xl pt-2 text-2xl ${colors[e.rank]}`}
          >
            {MEDALS[e.rank - 1]}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}