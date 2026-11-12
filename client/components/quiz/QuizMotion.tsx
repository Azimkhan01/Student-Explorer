"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useMemo } from "react";

export interface LeaderboardEntry {
  rank: number;
  socketId: string;
  username: string;
  score: number;
  totalTimeMs: number;
  answeredQuestions: number;
}

// ------------------------------------------------------------
// Number that counts up/down to its new value
// ------------------------------------------------------------
export function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

// ------------------------------------------------------------
// Circular countdown. Turns red and pulses in the last 5 seconds.
// ------------------------------------------------------------
export function CountdownRing({
  remaining,
  total,
  ended,
  size = 96,
}: {
  remaining: number;
  total: number;
  ended: boolean;
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = ended ? 0 : Math.min(1, remaining / Math.max(total, 1));
  const urgent = !ended && remaining <= 5;

  return (
    <motion.div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      animate={urgent ? { scale: [1, 1.07, 1] } : { scale: 1 }}
      transition={
        urgent ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : {}
      }
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-200"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - progress) }}
          transition={{ duration: 0.6, ease: "linear" }}
          className={urgent ? "stroke-red-500" : "stroke-indigo-600"}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={ended ? "end" : remaining}
            initial={{ y: -14, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.22 }}
            className={`font-extrabold tabular-nums ${
              urgent ? "text-red-600" : "text-gray-900"
            }`}
            style={{ fontSize: size * 0.36 }}
          >
            {ended ? "0" : remaining}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------
// Leaderboard. Rows glide to their new rank when scores change.
// ------------------------------------------------------------
const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({
  entries,
  highlightId,
  highlightName,
  showTime = false,
}: {
  entries: LeaderboardEntry[];
  highlightId?: string | null;
  highlightName?: string | null;
  showTime?: boolean;
}) {
  const maxScore = Math.max(1, ...entries.map((e) => e.score));

  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          const isMe =
            (highlightId && entry.socketId === highlightId) ||
            (!highlightId && highlightName && entry.username === highlightName);

          return (
            <motion.li
              key={entry.socketId}
              layout="position"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className={`relative overflow-hidden rounded-xl border px-4 py-3 ${
                isMe ? "border-indigo-400 ring-2 ring-indigo-200" : "border-gray-200"
              }`}
            >
              <motion.div
                aria-hidden
                className="absolute inset-y-0 left-0 bg-indigo-50"
                initial={{ width: 0 }}
                animate={{ width: `${(entry.score / maxScore) * 100}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 text-center text-lg font-bold">
                    {entry.rank <= 3 ? MEDALS[entry.rank - 1] : `#${entry.rank}`}
                  </span>
                  <div>
                    <p className="font-semibold">
                      {entry.username}
                      {isMe && (
                        <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.answeredQuestions} answered
                      {showTime &&
                        ` · ${(entry.totalTimeMs / 1000).toFixed(2)}s`}
                    </p>
                  </div>
                </div>

                <p className="text-lg font-bold text-indigo-600">
                  <AnimatedNumber value={entry.score} />
                  <span className="ml-1 text-xs font-medium text-gray-500">
                    pts
                  </span>
                </p>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

// ------------------------------------------------------------
// Podium for the final results. 3rd rises first, then 2nd, then 1st.
// ------------------------------------------------------------
export function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const top = entries.slice(0, 3);
  if (top.length === 0) return null;

  const visualOrder = [1, 0, 2]; // 2nd, 1st, 3rd
  const heights = [150, 108, 76];
  const delays = [0.9, 0.5, 0.1];
  const colors = ["bg-amber-400", "bg-slate-300", "bg-orange-300"];

  return (
    <div className="flex items-end justify-center gap-3 pt-6">
      {visualOrder.map((i) => {
        const entry = top[i];
        if (!entry) return <div key={i} className="w-24 sm:w-28" />;

        return (
          <div key={entry.socketId} className="flex w-24 flex-col items-center sm:w-28">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 14,
                delay: delays[i] + 0.45,
              }}
              className="text-center"
            >
              <div className="text-3xl">{MEDALS[i]}</div>
              <p className="max-w-full truncate text-sm font-semibold">
                {entry.username}
              </p>
              <p className="text-xs font-bold text-indigo-600">
                {entry.score} pts
              </p>
            </motion.div>

            <motion.div
              initial={{ height: 0 }}
              animate={{ height: heights[i] }}
              transition={{ type: "spring", stiffness: 120, damping: 16, delay: delays[i] }}
              className={`mt-2 flex w-full items-start justify-center rounded-t-xl pt-2 text-2xl font-extrabold text-white ${colors[i]}`}
            >
              {i + 1}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// Confetti burst (skipped when the user prefers reduced motion)
// ------------------------------------------------------------
const CONFETTI_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
];

export function Confetti({ count = 56 }: { count?: number }) {
  const reduce = useReducedMotion();

  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        duration: 2.4 + Math.random() * 1.8,
        rotate: Math.random() * 720 - 360,
        drift: (Math.random() - 0.5) * 180,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [count],
  );

  if (reduce) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            backgroundColor: p.color,
          }}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: "105vh",
            x: p.drift,
            rotate: p.rotate,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}