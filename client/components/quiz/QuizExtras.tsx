"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Socket } from "socket.io-client";
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
  const topScore = Math.max(1, ...entries.map((e) => e.score));

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
              className={`relative overflow-hidden rounded-xl border ${
                mine ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white"
              }`}
            >
              {/* score bar, grows with the score relative to the leader */}
              <motion.div
                aria-hidden
                className={`absolute inset-y-0 left-0 ${
                  mine ? "bg-indigo-100" : "bg-gray-50"
                }`}
                initial={false}
                animate={{ width: `${(e.score / topScore) * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 22 }}
              />

              <div className="relative flex items-center gap-3 p-3">
                <span className="w-8 text-center text-lg font-bold text-gray-600">
                  {e.rank <= 3 ? MEDALS[e.rank - 1] : `#${e.rank}`}
                </span>
                <AvatarBadge avatar={e.avatar} name={e.username} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {e.username}
                    {mine && (
                      <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        You
                      </span>
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
              </div>
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

// ============================================================
// PER-QUESTION RESULTS: who got it right / wrong / didn't answer
// ============================================================
export type QuestionResultStatus = "correct" | "wrong" | "unanswered";

export interface QuestionResult {
  socketId: string;
  username: string;
  avatar?: string;
  status: QuestionResultStatus;
  selectedOptionIndex: number | null;
  responseTimeMs: number | null;
  earnedMarks: number;
}

const RESULT_GROUPS = {
  correct: {
    label: "Got it right",
    icon: "✅",
    chip: "border-green-200 bg-green-50 text-green-800",
    bar: "bg-green-500",
  },
  wrong: {
    label: "Got it wrong",
    icon: "❌",
    chip: "border-red-200 bg-red-50 text-red-800",
    bar: "bg-red-500",
  },
  unanswered: {
    label: "Didn't answer",
    icon: "⏳",
    chip: "border-gray-200 bg-gray-50 text-gray-600",
    bar: "bg-gray-300",
  },
} as const;

const RESULT_ORDER = ["correct", "wrong", "unanswered"] as const;

const chipVariants = {
  hidden: { opacity: 0, scale: 0.7, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 22 },
  },
};

export function QuestionResultsPanel({
  results,
  distribution,
  options,
  correctOptionIndex,
  highlightId,
}: {
  results: QuestionResult[];
  distribution?: number[];
  options?: string[];
  correctOptionIndex?: number | null;
  highlightId?: string;
}) {
  const grouped = useMemo(
    () => ({
      correct: results.filter((r) => r.status === "correct"),
      wrong: results.filter((r) => r.status === "wrong"),
      unanswered: results.filter((r) => r.status === "unanswered"),
    }),
    [results],
  );

  if (results.length === 0) return null;

  const total = Math.max(1, results.length);
  const fastestId = grouped.correct[0]?.socketId;
  const maxVotes = Math.max(1, ...(distribution ?? [0]));

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Question results</h2>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
          <AnimatedNumber value={grouped.correct.length} /> / {results.length} correct
        </span>
      </div>

      {/* segmented bar: right / wrong / no answer */}
      <div
        role="img"
        aria-label={`${grouped.correct.length} correct, ${grouped.wrong.length} wrong, ${grouped.unanswered.length} unanswered`}
        className="flex h-3 overflow-hidden rounded-full bg-gray-100"
      >
        {RESULT_ORDER.map((key) => (
          <motion.div
            key={key}
            className={RESULT_GROUPS[key].bar}
            initial={{ width: 0 }}
            animate={{ width: `${(grouped[key].length / total) * 100}%` }}
            transition={{ type: "spring", stiffness: 110, damping: 20, delay: 0.1 }}
          />
        ))}
      </div>

      {/* how many picked each option */}
      {distribution && options && options.length > 0 && (
        <div className="mt-5 space-y-2">
          {options.map((option, i) => {
            const votes = distribution[i] ?? 0;
            const isCorrect = correctOptionIndex === i;
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isCorrect ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-gray-100">
                  <motion.div
                    className={`h-full rounded-md ${isCorrect ? "bg-green-400" : "bg-indigo-300"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(votes / maxVotes) * 100}%` }}
                    transition={{
                      type: "spring",
                      stiffness: 110,
                      damping: 20,
                      delay: 0.15 + i * 0.05,
                    }}
                  />
                  <span className="absolute inset-y-0 left-2 flex max-w-[85%] items-center truncate text-xs font-medium text-gray-700">
                    {option}
                  </span>
                </div>
                <span className="w-6 text-right font-semibold tabular-nums text-gray-600">
                  {votes}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* people, grouped */}
      <div className="mt-6 space-y-5">
        {RESULT_ORDER.map((key) => {
          const list = grouped[key];
          if (list.length === 0) return null;
          const group = RESULT_GROUPS[key];

          return (
            <div key={key}>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span aria-hidden>{group.icon}</span>
                {group.label}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {list.length}
                </span>
              </p>

              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } } }}
                className="flex flex-wrap gap-2"
              >
                {list.map((r) => {
                  const mine = !!highlightId && r.socketId === highlightId;
                  const fastest = key === "correct" && r.socketId === fastestId;

                  let detail = "no answer";
                  if (key === "correct") {
                    detail = `${((r.responseTimeMs ?? 0) / 1000).toFixed(1)}s · +${r.earnedMarks}`;
                  } else if (key === "wrong" && r.selectedOptionIndex !== null) {
                    detail = `chose ${String.fromCharCode(65 + r.selectedOptionIndex)}`;
                  }

                  return (
                    <motion.li
                      key={r.socketId}
                      variants={chipVariants}
                      whileHover={{ scale: 1.04 }}
                      className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm ${group.chip} ${
                        mine ? "ring-2 ring-indigo-400" : ""
                      }`}
                    >
                      <AvatarBadge avatar={r.avatar} name={r.username} size={28} />
                      <span className="max-w-[9rem] truncate font-semibold">
                        {r.username}
                        {mine && <span className="ml-1 text-[10px] uppercase">(you)</span>}
                      </span>
                      <span className="text-xs opacity-75">{detail}</span>
                      {fastest && (
                        <span title="Fastest correct answer" className="text-xs font-semibold">
                          ⚡ Fastest
                        </span>
                      )}
                    </motion.li>
                  );
                })}
              </motion.ul>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

// ============================================================
// TEACHER BROADCASTS: floating reactions + message banner
// (only the teacher can send these; everyone in the room sees them)
// ============================================================
export const TEACHER_REACTIONS = ["👏", "🔥", "🎉", "😮", "💡", "❤️", "😂", "🚀"];

export const TEACHER_MESSAGE_MAX = 140;

export interface TeacherReactionEvent {
  id: string;
  emoji: string;
}

export interface TeacherMessageEvent {
  id: string;
  text: string;
  sentAt: number;
}

interface FloatingReaction extends TeacherReactionEvent {
  x: number;
  drift: number;
  size: number;
}

export function useTeacherBroadcasts(socket: Socket | null | undefined) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [message, setMessage] = useState<TeacherMessageEvent | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onReaction = (data: TeacherReactionEvent) => {
      const floating: FloatingReaction = {
        ...data,
        x: 8 + Math.random() * 84,
        drift: (Math.random() - 0.5) * 120,
        size: 32 + Math.random() * 28,
      };
      setReactions((prev) => [...prev.slice(-24), floating]);
    };

    const onMessage = (data: TeacherMessageEvent) => setMessage(data);

    socket.on("teacher-reaction", onReaction);
    socket.on("teacher-message", onMessage);

    return () => {
      socket.off("teacher-reaction", onReaction);
      socket.off("teacher-message", onMessage);
    };
  }, [socket]);

  const removeReaction = useCallback(
    (id: string) => setReactions((prev) => prev.filter((r) => r.id !== id)),
    [],
  );

  const dismissMessage = useCallback(() => setMessage(null), []);

  return { reactions, message, removeReaction, dismissMessage };
}

export function TeacherBroadcastLayer({
  reactions,
  message,
  onReactionDone,
  onDismissMessage,
}: {
  reactions: FloatingReaction[];
  message: TeacherMessageEvent | null;
  onReactionDone: (id: string) => void;
  onDismissMessage: () => void;
}) {
  // Auto-hide the message banner after a few seconds.
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismissMessage, 7000);
    return () => clearTimeout(t);
  }, [message, onDismissMessage]);

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {reactions.map((r) => (
          <motion.span
            key={r.id}
            className="absolute bottom-0 select-none"
            style={{ left: `${r.x}%`, fontSize: r.size }}
            initial={{ y: "0vh", x: 0, opacity: 0, scale: 0.4 }}
            animate={{
              y: "-72vh",
              x: r.drift,
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1.3, 1, 0.9],
            }}
            transition={{ duration: 2.6, ease: "easeOut" }}
            onAnimationComplete={() => onReactionDone(r.id)}
          >
            {r.emoji}
          </motion.span>
        ))}
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            key={message.id}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="fixed inset-x-0 top-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-lg"
          >
            <div className="flex items-start gap-3 rounded-2xl bg-indigo-600 p-4 text-white shadow-2xl ring-4 ring-indigo-200">
              <motion.span
                aria-hidden
                className="text-2xl"
                animate={{ rotate: [0, -14, 14, -8, 8, 0] }}
                transition={{ duration: 0.7, delay: 0.15 }}
              >
                📢
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                  Message from the teacher
                </p>
                <p className="break-words font-semibold">{message.text}</p>
              </div>
              <button
                type="button"
                onClick={onDismissMessage}
                aria-label="Dismiss message"
                className="rounded-md px-2 py-1 text-indigo-200 hover:bg-indigo-500 hover:text-white"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}