"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useSocket } from "@/context/SocketContext";
import { AnimatedNumber, Confetti } from "@/components/quiz/QuizMotion";
import {
  AvatarBadge,
  AvatarLeaderboard,
  AvatarPodium,
  QuestionResultsPanel,
  QuizTimer,
  TEACHER_MESSAGE_MAX,
  TEACHER_REACTIONS,
  TeacherBroadcastLayer,
  useServerCountdown,
  useTeacherBroadcasts,
  type QuestionResult,
  type QuestionResultStatus,
  type RankedEntry,
} from "@/components/quiz/QuizExtras";

const API_URL = "/server/quickzy";

// 👇 Change this to the real route of your teacher dashboard.
const DASHBOARD_PATH = "/teacher/quickzy";

// Keep in sync with the gateway scoring constants.
const POINTS_PER_MARK = 100;
const MAX_SPEED_BONUS_RATIO = 0.5;

const AUTO_NEXT_OPTIONS = [3, 5, 8, 10, 15, 30];

const QUICK_MESSAGES = [
  "Read the question carefully 👀",
  "10 seconds left! ⏱️",
  "Great job, everyone! 🎉",
  "Keep going, you've got this 💪",
];

interface Question {
  id?: string;
  question: string;
  options: string[];
  correct_answer: string | number;
  marks: number;
}

interface Quickzy {
  id: string;
  quickzy_name: string;
  teacher_id: number;
  questions: Question[];
}

interface Student {
  id: string;
  socketId: string;
  username: string;
  email: string;
  avatar?: string;
  score: number;
  totalTimeMs: number;
  answeredQuestions: number;
  connected: boolean;
}

interface LiveQuestion {
  question: {
    id?: string;
    question: string;
    options: string[];
    marks: number;
    basePoints?: number;
    maxBonusPoints?: number;
  };
  questionIndex: number;
  totalQuestions: number;
  durationSeconds: number;
  startedAt: number;
  endsAt: number;
  serverNow?: number;
}

const optionContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const optionItem = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

const STATUS_BADGE: Record<
  QuestionResultStatus,
  { label: string; cls: string }
> = {
  correct: {
    label: "✅ Correct",
    cls: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
  },
  wrong: {
    label: "❌ Wrong",
    cls: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30",
  },
  unanswered: {
    label: "⏳ No answer",
    cls: "bg-white/5 text-slate-300 ring-1 ring-white/10",
  },
};

// --------------------------------
// CSV helpers (download results before the data is deleted)
// --------------------------------
function csvCell(value: string | number) {
  let text = String(value);
  // Stop spreadsheet formula injection from student-typed names.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

// --------------------------------
// Ambient background
// --------------------------------
function StudioBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-[#0b1120]"
    >
      {/* Subtle top gradient */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#17243a]/40 to-transparent" />
    </div>
  );
}

// --------------------------------
// Glassy panel wrapper
// --------------------------------
function Glass({
  children,
  className = "",
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "blue" | "emerald" | "rose" | "amber" | "none";
}) {
  const glowMap = {
    blue: "shadow-[0_0_80px_-20px_rgba(59,130,246,0.55)] ring-blue-400/25",
    emerald:
      "shadow-[0_0_80px_-20px_rgba(16,185,129,0.55)] ring-emerald-400/25",
    rose: "shadow-[0_0_80px_-20px_rgba(244,63,94,0.55)] ring-rose-400/25",
    amber: "shadow-[0_0_80px_-20px_rgba(245,158,11,0.55)] ring-amber-400/25",
    none: "ring-white/10",
  } as const;

  return (
    <div
      className={`relative rounded-3xl bg-white/[0.04] ring-1 backdrop-blur-xl ${glowMap[glow ?? "none"]} ${className}`}
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      {children}
    </div>
  );
}

// --------------------------------
// Live "on air" pill
// --------------------------------
type AirState = "live" | "paused" | "idle" | "offline" | "ended";

function OnAirPill({ state }: { state: AirState }) {
  const styles = {
    live: "bg-rose-500/15 text-rose-200 ring-rose-400/40",
    paused: "bg-violet-500/15 text-violet-200 ring-violet-400/40",
    idle: "bg-amber-500/15 text-amber-200 ring-amber-400/40",
    offline: "bg-white/5 text-slate-300 ring-white/10",
    ended: "bg-blue-500/15 text-blue-300 ring-blue-400/40",
  } as const;
  const dot = {
    live: "bg-rose-400",
    paused: "bg-violet-400",
    idle: "bg-amber-400",
    offline: "bg-slate-400",
    ended: "bg-blue-400",
  } as const;
  const label = {
    live: "ON AIR",
    paused: "PAUSED",
    idle: "STANDBY",
    offline: "OFFLINE",
    ended: "FINISHED",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.18em] ring-1 ${styles[state]}`}
    >
      <motion.span
        className={`h-2 w-2 rounded-full ${dot[state]}`}
        animate={
          state === "live" ? { scale: [1, 1.7, 1], opacity: [1, 0.4, 1] } : {}
        }
        transition={{ duration: 1.4, repeat: Infinity }}
      />
      {label[state]}
    </span>
  );
}

// --------------------------------
// Frozen timer shown while paused
// --------------------------------
function PausedClock({
  remaining,
  total,
  size = 104,
}: {
  remaining: number;
  total: number;
  size?: number;
}) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const circumference = 2 * Math.PI * 45;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`Paused with ${remaining} seconds remaining`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center font-extrabold tabular-nums text-violet-300"
        style={{ fontSize: size * 0.32 }}
      >
        <span>{String(remaining).padStart(2, "0")}</span>
        <span
          className="font-semibold uppercase text-violet-400"
          style={{ fontSize: size * 0.1 }}
        >
          ⏸ paused
        </span>
      </div>
    </div>
  );
}

// --------------------------------
// Teacher-only stage: reactions + messages
// --------------------------------
function TeacherStage({
  disabled,
  onReact,
  onMessage,
}: {
  disabled: boolean;
  onReact: (emoji: string) => void;
  onMessage: (text: string) => void;
}) {
  const [text, setText] = useState("");

  const send = (value: string) => {
    const clean = value.trim().slice(0, TEACHER_MESSAGE_MAX);
    if (!clean) return;
    onMessage(clean);
    setText("");
  };

  return (
    <Glass className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">Teacher stage</h2>
          <p className="text-sm text-slate-400">
            Only you can send these. Every student sees them live.
          </p>
        </div>
        <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400 ring-1 ring-blue-400/30">
          🎤 Teacher only
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {TEACHER_REACTIONS.map((emoji) => (
          <motion.button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => onReact(emoji)}
            whileHover={{ scale: 1.25, rotate: -8 }}
            whileTap={{ scale: 0.75 }}
            aria-label={`Send ${emoji} reaction`}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-2xl shadow-inner ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50"
          >
            {emoji}
          </motion.button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={text}
          maxLength={TEACHER_MESSAGE_MAX}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message for everyone..."
          aria-label="Message to students"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder-slate-500 outline-none transition focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/30"
        />
        <motion.button
          type="submit"
          disabled={disabled || !text.trim()}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-5 font-semibold text-white shadow-lg shadow-blue-500/25 disabled:opacity-40"
        >
          Send
        </motion.button>
      </form>
      <p className="mt-1 text-right text-xs text-slate-500">
        {text.length}/{TEACHER_MESSAGE_MAX}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK_MESSAGES.map((m) => (
          <motion.button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => send(m)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
          >
            {m}
          </motion.button>
        ))}
      </div>
    </Glass>
  );
}

// --------------------------------
// Question flow: auto next question (editable any time)
// --------------------------------
function FlowControls({
  autoNext,
  delay,
  endOnAllAnswered,
  live,
  disabled,
  onToggle,
  onDelay,
  onEndOnAllAnswered,
}: {
  autoNext: boolean;
  delay: number;
  endOnAllAnswered: boolean;
  live: boolean;
  disabled: boolean;
  onToggle: (value: boolean) => void;
  onDelay: (seconds: number) => void;
  onEndOnAllAnswered: (value: boolean) => void;
}) {
  return (
    <Glass className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">Question flow</h2>
          <p className="text-sm text-slate-400">
            Move to the next question automatically, or do it yourself.
          </p>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
          {live ? "Changes apply instantly" : "Applied when you start"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <div>
          <p className="font-semibold text-white">⏭️ Auto next question</p>
          <p className="text-sm text-slate-400">
            {autoNext
              ? `After results, the next question starts in ${delay}s.`
              : "You press “Next Question” after every question."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={autoNext}
          aria-label="Auto next question"
          disabled={disabled}
          onClick={() => onToggle(!autoNext)}
          className={`relative h-8 w-14 shrink-0 rounded-full ring-1 transition disabled:opacity-50 ${
            autoNext
              ? "bg-gradient-to-r from-blue-500 to-blue-700 ring-blue-400/50"
              : "bg-white/10 ring-white/20"
          }`}
        >
          <motion.span
            className="absolute top-1 h-6 w-6 rounded-full bg-white shadow"
            animate={{ left: autoNext ? 28 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
          />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <div>
          <p className="font-semibold text-white">
            ✅ End early when everyone answers
          </p>
          <p className="text-sm text-slate-400">
            End 1 second after every online student answers. Offline students
            won&apos;t block it.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={endOnAllAnswered}
          aria-label="End early when everyone answers"
          disabled={disabled}
          onClick={() => onEndOnAllAnswered(!endOnAllAnswered)}
          className={`relative h-8 w-14 shrink-0 rounded-full ring-1 transition disabled:opacity-50 ${
            endOnAllAnswered
              ? "bg-gradient-to-r from-blue-500 to-blue-700 ring-blue-400/50"
              : "bg-white/10 ring-white/20"
          }`}
        >
          <motion.span
            className="absolute top-1 h-6 w-6 rounded-full bg-white shadow"
            animate={{ left: endOnAllAnswered ? 28 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
          />
        </button>
      </div>

      <div
        className={`mt-4 transition ${autoNext ? "opacity-100" : "opacity-40"}`}
      >
        <p className="mb-2 text-sm font-medium text-slate-300">
          Wait before the next question
        </p>
        <div className="flex flex-wrap gap-2">
          {AUTO_NEXT_OPTIONS.map((s) => (
            <motion.button
              key={s}
              type="button"
              disabled={disabled || !autoNext}
              onClick={() => onDelay(s)}
              whileTap={{ scale: 0.95 }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed ${
                delay === s
                  ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white ring-blue-400/40 shadow-lg shadow-blue-500/25"
                  : "bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10"
              }`}
            >
              {s}s
            </motion.button>
          ))}
        </div>
      </div>
    </Glass>
  );
}

export default function TeacherLiveQuizPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const storageKey = `quickzy-teacher-room:${id}`;

  const { socket, isConnected } = useSocket();

  const [quickzy, setQuickzy] = useState<Quickzy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [roomCode, setRoomCode] = useState<number | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resuming, setResuming] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [leaderboard, setLeaderboard] = useState<RankedEntry[]>([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const [durationSeconds, setDurationSeconds] = useState(20);

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isQuestionEnded, setIsQuestionEnded] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);

  const [liveQuestion, setLiveQuestion] = useState<LiveQuestion | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(
    null,
  );
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [distribution, setDistribution] = useState<number[]>([]);
  const [testError, setTestError] = useState("");

  // pause / auto-next
  const [isPaused, setIsPaused] = useState(false);
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number | null>(
    null,
  );
  const [autoNext, setAutoNext] = useState(false);
  const [autoNextDelay, setAutoNextDelay] = useState(5);
  const [endOnAllAnswered, setEndOnAllAnswered] = useState(true);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [nextIsLast, setNextIsLast] = useState(false);

  // end quiz / dashboard
  const [confirmEnd, setConfirmEnd] = useState<null | "end" | "dashboard">(
    null,
  );
  const [isEnding, setIsEnding] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const goDashboardRef = useRef(false);

  const { reactions, message, removeReaction, dismissMessage } =
    useTeacherBroadcasts(socket);

  const liveRemaining = useServerCountdown(
    liveQuestion?.endsAt ?? null,
    serverOffset,
    !!liveQuestion && !isQuestionEnded && !isTestFinished && !isPaused,
  );

  // While paused the timer is frozen at what the server reported.
  const remainingSeconds = isPaused
    ? Math.ceil((pausedRemainingMs ?? 0) / 1000)
    : liveRemaining;

  const nextRemaining = useServerCountdown(
    nextAt,
    serverOffset,
    nextAt !== null && isQuestionEnded && !isTestFinished,
  );

  const resultById = useMemo(
    () => new Map(results.map((r) => [r.id, r] as const)),
    [results],
  );

  // total points available across the whole quiz (with max speed bonus)
  const maxTotalPoints = useMemo(() => {
    if (!quickzy) return 0;
    return quickzy.questions.reduce((sum, q) => {
      const marks = Number(q.marks);
      const m = Number.isFinite(marks) && marks > 0 ? marks : 1;
      const base = Math.round(m * POINTS_PER_MARK);
      return sum + base + Math.round(base * MAX_SPEED_BONUS_RATIO);
    }, 0);
  }, [quickzy]);

  const fetchQuickzy = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const result = await response.json();
      const rawData = result.data ?? result;
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      if (!data || !Array.isArray(data.questions))
        throw new Error("Invalid Quickzy data.");
      setQuickzy(data as Quickzy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load quiz.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchQuickzy();
  }, [fetchQuickzy]);

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  const stopResuming = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = null;
    setResuming(false);
  }, []);

  // Wipes every piece of live-room state (used when a room is gone or ended).
  const resetRoomState = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    setRoomId(null);
    setRoomCode(null);
    setStudents([]);
    setLeaderboard([]);
    setLiveQuestion(null);
    setCorrectOptionIndex(null);
    setAnsweredCount(0);
    setAnsweredIds([]);
    setResults([]);
    setDistribution([]);
    setIsTestStarted(false);
    setIsQuestionEnded(false);
    setIsTestFinished(false);
    setIsStarting(false);
    setIsPaused(false);
    setPausedRemainingMs(null);
    setNextAt(null);
    setConfirmRemoveId(null);
    setTestError("");
    stopResuming();
  }, [storageKey, stopResuming]);

  // --------------------------------
  // SOCKET EVENTS
  // --------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data: {
      roomId: string;
      code: number;
      teacherToken?: string;
    }) => {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            roomId: data.roomId,
            teacherToken: data.teacherToken,
          }),
        );
      } catch {}
      setRoomId(data.roomId);
      setRoomCode(data.code);
      setStudents([]);
      setLeaderboard([]);
      setIsCreatingRoom(false);
      setSessionEnded(false);
      setError("");
    };

    const handleRoomResumed = (data: {
      roomId: string;
      code: number;
      status: "waiting" | "running" | "question-ended" | "finished";
      durationSeconds: number;
      paused?: boolean;
      pausedRemainingMs?: number | null;
      autoNext?: boolean;
      autoNextDelaySeconds?: number;
      endOnAllAnswered?: boolean;
      students: Student[];
      leaderboard: RankedEntry[];
      answeredIds: string[];
      answeredCount: number;
    }) => {
      setRoomId(data.roomId);
      setRoomCode(data.code);
      setStudents(data.students);
      setLeaderboard(data.leaderboard);
      setDurationSeconds(data.durationSeconds);
      setIsTestStarted(data.status !== "waiting");
      setAnsweredIds(data.answeredIds);
      setAnsweredCount(data.answeredCount);
      setSessionEnded(false);

      setIsPaused(!!data.paused && data.status === "running");
      setPausedRemainingMs(data.paused ? (data.pausedRemainingMs ?? 0) : null);
      if (typeof data.autoNext === "boolean") setAutoNext(data.autoNext);
      if (typeof data.autoNextDelaySeconds === "number") {
        setAutoNextDelay(data.autoNextDelaySeconds);
      }
      setEndOnAllAnswered(data.endOnAllAnswered !== false);

      // Trust the server status over the order the replayed events arrived in.
      setIsQuestionEnded(
        data.status === "question-ended" || data.status === "finished",
      );
      setIsTestFinished(data.status === "finished");

      stopResuming();
      setError("");
    };

    const handleRoomError = (data: { message?: string; code?: string }) => {
      if (data?.code === "ROOM_GONE") {
        resetRoomState();
        return;
      }
      setError(data?.message || "Unable to create room.");
      setIsCreatingRoom(false);
      stopResuming();
    };

    const handleRoomUsers = (users: Student[]) => setStudents(users);

    const handleQuestionStarted = (data: LiveQuestion) => {
      if (typeof data.serverNow === "number") {
        setServerOffset(data.serverNow - Date.now());
      }
      setLiveQuestion(data);
      setIsTestStarted(true);
      setIsStarting(false);
      setIsQuestionEnded(false);
      setIsTestFinished(false);
      setCorrectOptionIndex(null);
      setAnsweredCount(0);
      setAnsweredIds([]);
      setResults([]);
      setDistribution([]);
      setTestError("");
      // (a paused question is re-announced with "test-paused" right after)
      setIsPaused(false);
      setPausedRemainingMs(null);
      setNextAt(null);
    };

    const handleTestPaused = (data: {
      remainingMs?: number;
      serverNow?: number;
    }) => {
      if (typeof data?.serverNow === "number") {
        setServerOffset(data.serverNow - Date.now());
      }
      setIsPaused(true);
      setPausedRemainingMs(Math.max(0, data?.remainingMs ?? 0));
    };

    const handleTestResumed = () => {
      setIsPaused(false);
      setPausedRemainingMs(null);
    };

    const handleAutoNextScheduled = (data: {
      nextAt: number;
      serverNow?: number;
      isLast?: boolean;
    }) => {
      if (typeof data?.serverNow === "number") {
        setServerOffset(data.serverNow - Date.now());
      }
      setNextAt(data.nextAt);
      setNextIsLast(!!data.isLast);
    };

    const handleAutoNextCancelled = () => setNextAt(null);

    const handleSettingsUpdated = (data: {
      autoNext?: boolean;
      autoNextDelaySeconds?: number;
      endOnAllAnswered?: boolean;
    }) => {
      if (typeof data?.autoNext === "boolean") setAutoNext(data.autoNext);
      if (typeof data?.autoNextDelaySeconds === "number") {
        setAutoNextDelay(data.autoNextDelaySeconds);
      }
      if (typeof data?.endOnAllAnswered === "boolean") {
        setEndOnAllAnswered(data.endOnAllAnswered);
      }
    };

    const handleQuestionEnded = (data: {
      questionIndex: number;
      correctOptionIndex: number;
      leaderboard: RankedEntry[];
      results?: QuestionResult[];
      distribution?: number[];
    }) => {
      setIsQuestionEnded(true);
      setIsPaused(false);
      setPausedRemainingMs(null);
      setCorrectOptionIndex(data.correctOptionIndex);
      setLeaderboard(data.leaderboard);
      setResults(data.results ?? []);
      setDistribution(data.distribution ?? []);
    };

    const handleLeaderboard = (data: RankedEntry[]) => setLeaderboard(data);

    const handleAnswerReceived = (data: {
      id?: string;
      answeredCount: number;
    }) => {
      setAnsweredCount(data.answeredCount);
      if (data.id) {
        setAnsweredIds((prev) =>
          prev.includes(data.id!) ? prev : [...prev, data.id!],
        );
      }
    };

    const handleStudentRemoved = (data: {
      id: string;
      answeredCount: number;
    }) => {
      setAnsweredCount(data.answeredCount);
      setAnsweredIds((prev) => prev.filter((sid) => sid !== data.id));
      setResults((prev) => prev.filter((r) => r.id !== data.id));
      setConfirmRemoveId((cur) => (cur === data.id ? null : cur));
    };

    const handleTestFinished = (data: { leaderboard: RankedEntry[] }) => {
      setIsTestFinished(true);
      setIsQuestionEnded(true);
      setIsPaused(false);
      setPausedRemainingMs(null);
      setNextAt(null);
      setLeaderboard(data.leaderboard);
    };

    const handleTestError = (data: { message?: string }) => {
      setIsStarting(false);
      setIsEnding(false);
      setTestError(data?.message || "Live test error.");
    };

    // The server deleted the room and all its data.
    const handleQuizEnded = () => {
      resetRoomState();
      setIsEnding(false);
      setConfirmEnd(null);
      setSessionEnded(true);
      setError("");

      if (goDashboardRef.current) {
        goDashboardRef.current = false;
        router.push(DASHBOARD_PATH);
      }
    };

    socket.on("room-created", handleRoomCreated);
    socket.on("room-resumed", handleRoomResumed);
    socket.on("room-error", handleRoomError);
    socket.on("room-users", handleRoomUsers);
    socket.on("question-started", handleQuestionStarted);
    socket.on("test-paused", handleTestPaused);
    socket.on("test-resumed", handleTestResumed);
    socket.on("auto-next-scheduled", handleAutoNextScheduled);
    socket.on("auto-next-cancelled", handleAutoNextCancelled);
    socket.on("settings-updated", handleSettingsUpdated);
    socket.on("question-ended", handleQuestionEnded);
    socket.on("leaderboard-updated", handleLeaderboard);
    socket.on("answer-received", handleAnswerReceived);
    socket.on("student-removed", handleStudentRemoved);
    socket.on("test-finished", handleTestFinished);
    socket.on("test-error", handleTestError);
    socket.on("quiz-ended", handleQuizEnded);

    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("room-resumed", handleRoomResumed);
      socket.off("room-error", handleRoomError);
      socket.off("room-users", handleRoomUsers);
      socket.off("question-started", handleQuestionStarted);
      socket.off("test-paused", handleTestPaused);
      socket.off("test-resumed", handleTestResumed);
      socket.off("auto-next-scheduled", handleAutoNextScheduled);
      socket.off("auto-next-cancelled", handleAutoNextCancelled);
      socket.off("settings-updated", handleSettingsUpdated);
      socket.off("question-ended", handleQuestionEnded);
      socket.off("leaderboard-updated", handleLeaderboard);
      socket.off("answer-received", handleAnswerReceived);
      socket.off("student-removed", handleStudentRemoved);
      socket.off("test-finished", handleTestFinished);
      socket.off("test-error", handleTestError);
      socket.off("quiz-ended", handleQuizEnded);
    };
  }, [socket, storageKey, stopResuming, resetRoomState, router]);

  // Resume the room after refresh / every reconnect.
  useEffect(() => {
    if (!socket || !isConnected) return;
    let saved: { roomId?: string; teacherToken?: string } | null = null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch {}
    if (!saved?.roomId || !saved?.teacherToken) return;

    setResuming(true);
    socket.emit("resume-room", saved);

    // Fallback so the UI can never get stuck on "Restoring...".
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setResuming(false), 8000);
  }, [socket, isConnected, storageKey]);

  // --------------------------------
  // ACTIONS
  // --------------------------------
  const createRoom = () => {
    if (!socket || !isConnected || !quickzy) {
      setError("Socket is disconnected or quiz information is missing.");
      return;
    }
    if (!quickzy.questions.length) {
      setError("This quiz does not contain any questions.");
      return;
    }
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    setIsCreatingRoom(true);
    setSessionEnded(false);
    setError("");
    const code = Math.floor(100000 + Math.random() * 900000);
    socket.emit("create-room", {
      code,
      quickzyId: quickzy.id,
      teacher_id: quickzy.teacher_id,
      questions: quickzy.questions,
    });
  };

  const startTest = () => {
    if (!socket || !roomId || isStarting) return;
    setTestError("");
    setIsStarting(true);
    socket.emit("start-test", {
      durationSeconds,
      autoNext,
      autoNextDelaySeconds: autoNextDelay,
      endOnAllAnswered,
    });
  };

  const pauseTest = () => {
    if (!socket || !roomId) return;
    setTestError("");
    socket.emit("pause-test");
  };

  const resumeTest = () => {
    if (!socket || !roomId) return;
    setTestError("");
    socket.emit("resume-test");
  };

  const endQuestionNow = () => {
    if (!socket || !roomId) return;
    socket.emit("end-question");
  };

  const nextQuestion = () => {
    if (!socket || !roomId) return;
    setTestError("");
    socket.emit("next-question");
  };

  const toggleAutoNext = (value: boolean) => {
    setAutoNext(value);
    if (socket && roomId && isTestStarted) {
      socket.emit("update-settings", {
        autoNext: value,
        autoNextDelaySeconds: autoNextDelay,
        endOnAllAnswered,
      });
    }
  };

  const changeAutoDelay = (seconds: number) => {
    setAutoNextDelay(seconds);
    if (socket && roomId && isTestStarted) {
      socket.emit("update-settings", {
        autoNext,
        autoNextDelaySeconds: seconds,
        endOnAllAnswered,
      });
    }
  };

  const toggleEndOnAllAnswered = (value: boolean) => {
    setEndOnAllAnswered(value);
    if (socket && roomId && isTestStarted) {
      socket.emit("update-settings", {
        autoNext,
        autoNextDelaySeconds: autoNextDelay,
        endOnAllAnswered: value,
      });
    }
  };

  const removeStudent = (studentId: string) => {
    if (!socket || !roomId) return;
    setConfirmRemoveId(null);
    setTestError("");
    socket.emit("remove-student", { studentId });
  };

  const sendReaction = (emoji: string) => {
    if (!socket || !roomId) return;
    socket.emit("teacher-reaction", { emoji });
  };

  const sendMessage = (text: string) => {
    if (!socket || !roomId) return;
    socket.emit("teacher-message", { text });
  };

  const copyCode = async () => {
    if (roomCode === null) return;
    try {
      await navigator.clipboard.writeText(String(roomCode));
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  // ----- end quiz / dashboard -----
  const requestEndQuiz = () => {
    setTestError("");
    setConfirmEnd("end");
  };

  const requestDashboard = () => {
    if (roomCode === null) {
      router.push(DASHBOARD_PATH);
      return;
    }
    setConfirmEnd("dashboard");
  };

  const confirmEndQuiz = () => {
    if (!socket || !isConnected || !roomId) {
      setConfirmEnd(null);
      setError("Reconnect to the server before ending the quiz.");
      return;
    }
    goDashboardRef.current = confirmEnd === "dashboard";
    setIsEnding(true);
    socket.emit("end-quiz");
  };

  const downloadResults = () => {
    if (!quickzy || leaderboard.length === 0) return;

    const emailById = new Map(students.map((s) => [s.id, s.email] as const));
    const header = [
      "Rank",
      "Name",
      "Email",
      "Score",
      "Total time (s)",
      "Questions answered",
    ];
    const rows = leaderboard.map((e) => [
      e.rank,
      e.username,
      emailById.get(e.id) ?? "",
      e.score,
      (e.totalTimeMs / 1000).toFixed(1),
      e.answeredQuestions,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = quickzy.quickzy_name
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    a.href = url;
    a.download = `${safeName || "quiz"}-results.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // --------------------------------
  // LOADING
  // --------------------------------
  if (loading) {
    return (
      <>
        <StudioBackdrop />
        <div className="relative flex min-h-screen items-center justify-center gap-3 text-slate-300">
          <motion.span
            className="h-6 w-6 rounded-full border-4 border-blue-400 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
          Loading quiz...
        </div>
      </>
    );
  }

  if (error && !quickzy) {
    return (
      <>
        <StudioBackdrop />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex min-h-screen flex-col items-center justify-center gap-4"
        >
          <p className="text-rose-300">{error}</p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => void fetchQuickzy()}
            className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 px-5 py-2 font-semibold text-white shadow-lg shadow-blue-500/30"
          >
            Try Again
          </motion.button>
        </motion.div>
      </>
    );
  }

  if (!quickzy) return null;

  // Offline students can't answer, so they shouldn't hold the bar below 100%.
  const onlineCount = students.filter((s) => s.connected).length;
  const answeredPct =
    onlineCount > 0 ? Math.min(100, (answeredCount / onlineCount) * 100) : 0;

  const isLastQuestion =
    liveQuestion !== null &&
    liveQuestion.questionIndex + 1 === liveQuestion.totalQuestions;
  const isRunning =
    liveQuestion !== null && !isQuestionEnded && !isTestFinished;
  const autoCountdownActive =
    isQuestionEnded && !isTestFinished && nextAt !== null;

  const onAirState: AirState = !isConnected
    ? "offline"
    : isTestFinished
      ? "ended"
      : isPaused
        ? "paused"
        : isTestStarted
          ? "live"
          : "idle";

  const basePoints = liveQuestion
    ? (liveQuestion.question.basePoints ??
      Math.round(liveQuestion.question.marks * POINTS_PER_MARK))
    : 0;
  const maxBonus = liveQuestion
    ? (liveQuestion.question.maxBonusPoints ??
      Math.round(basePoints * MAX_SPEED_BONUS_RATIO))
    : 0;

  return (
    <MotionConfig reducedMotion="user">
      <StudioBackdrop />
      <TeacherBroadcastLayer
        reactions={reactions}
        message={message}
        onReactionDone={removeReaction}
        onDismissMessage={dismissMessage}
      />

      {/* END QUIZ / LEAVE CONFIRMATION */}
      <AnimatePresence>
        {confirmEnd && (
          <motion.div
            key="confirm-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isEnding) setConfirmEnd(null);
            }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="end-quiz-title"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Glass glow="rose" className="bg-[#0f172a]/95 p-6">
                <div className="mb-3 text-4xl">
                  {isTestFinished ? "🧹" : "🛑"}
                </div>
                <h2
                  id="end-quiz-title"
                  className="text-2xl font-bold text-white"
                >
                  {confirmEnd === "dashboard"
                    ? "Leave and close this room?"
                    : isTestFinished
                      ? "Close this room?"
                      : "End this quiz now?"}
                </h2>
                <p className="mt-2 text-slate-300">
                  {isTestFinished
                    ? "The room closes right away instead of waiting for the automatic cleanup."
                    : `Every student (${onlineCount} online) is disconnected immediately.`}{" "}
                  The room code, scores, answers and the leaderboard are{" "}
                  <span className="font-semibold text-rose-300">
                    permanently deleted
                  </span>
                  .
                </p>

                {leaderboard.length > 0 && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={downloadResults}
                    className="mt-4 w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-blue-300 ring-1 ring-blue-400/30 hover:bg-white/10"
                  >
                    ⬇️ Download results (CSV) first
                  </motion.button>
                )}

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    disabled={isEnding}
                    onClick={() => setConfirmEnd(null)}
                    className="rounded-xl bg-white/5 px-5 py-2.5 font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                  >
                    Keep going
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={isEnding}
                    onClick={confirmEndQuiz}
                    className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-700 px-5 py-2.5 font-bold text-white shadow-lg shadow-rose-500/30 disabled:opacity-60"
                  >
                    {isEnding
                      ? "Ending..."
                      : confirmEnd === "dashboard"
                        ? "End & go to dashboard"
                        : isTestFinished
                          ? "Close room"
                          : "End quiz"}
                  </motion.button>
                </div>
              </Glass>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-5 sm:p-8">
        {isTestFinished && <Confetti />}

        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 text-xl shadow-lg shadow-blue-500/30">
              ⚡
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-white via-white to-blue-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
                {quickzy.quickzy_name}
              </h1>
              <p className="text-sm text-slate-400">
                Live quiz contest · Broadcast studio
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OnAirPill state={onAirState} />
            <span className="hidden rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-white/10 sm:inline-flex">
              {isConnected
                ? "Realtime · connected"
                : roomCode !== null
                  ? "Reconnecting… room kept for 60s"
                  : "Realtime · disconnected"}
            </span>

            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={requestDashboard}
              className="rounded-full bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
            >
              ← Dashboard
            </motion.button>

            {roomCode !== null && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={requestEndQuiz}
                className="rounded-full bg-rose-500/10 px-4 py-1.5 text-xs font-bold text-rose-300 ring-1 ring-rose-400/40 hover:bg-rose-500/20"
              >
                {isTestFinished ? "🧹 Close room" : "🛑 End quiz"}
              </motion.button>
            )}
          </div>
        </motion.header>

        <AnimatePresence>
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-xl bg-rose-500/10 p-3 text-rose-300 ring-1 ring-rose-400/30"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {resuming && !roomCode && (
            <motion.p
              key="resuming"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-blue-500/10 p-3 text-blue-300 ring-1 ring-blue-400/30"
            >
              Restoring your live room...
            </motion.p>
          )}
        </AnimatePresence>

        {/* SESSION ENDED */}
        <AnimatePresence>
          {sessionEnded && !roomCode && !resuming && (
            <motion.div
              key="ended"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <Glass className="p-8">
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                    className="mb-4 text-5xl"
                  >
                    🏁
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white">
                    Quiz ended
                  </h2>
                  <p className="mt-1 max-w-md text-slate-400">
                    The room and all of its data were deleted. You can start a
                    fresh session of this quiz right away, or head back to your
                    dashboard.
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={createRoom}
                      disabled={!isConnected || isCreatingRoom}
                      className="rounded-2xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-7 py-3 font-bold text-white shadow-xl shadow-blue-500/30 disabled:opacity-50"
                    >
                      {isCreatingRoom ? "Creating room..." : "🎬 Start a new session"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => router.push(DASHBOARD_PATH)}
                      className="rounded-2xl bg-white/5 px-7 py-3 font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                    >
                      Go to dashboard
                    </motion.button>
                  </div>
                </div>
              </Glass>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CREATE ROOM */}
        <AnimatePresence>
          {!roomCode && !resuming && !sessionEnded && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <Glass className="p-8">
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    animate={{ rotate: [0, 6, -6, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="mb-4 text-5xl"
                  >
                    🎬
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white">
                    Set the stage
                  </h2>
                  <p className="mt-1 max-w-md text-slate-400">
                    Spawn a live room, share the code, and broadcast the contest
                    to every student in real time.
                  </p>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={createRoom}
                    disabled={!isConnected || isCreatingRoom}
                    className="mt-6 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-blue-500/40 disabled:opacity-50"
                  >
                    {isCreatingRoom && (
                      <motion.span
                        className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}
                    {isCreatingRoom ? "Creating room..." : "Create Live Room"}
                  </motion.button>
                </div>
              </Glass>
            </motion.div>
          )}
        </AnimatePresence>

        {roomCode !== null && (
          <>
            {/* ROOM CODE — the showpiece */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
            >
              <Glass className="overflow-hidden p-8 text-center">
                {/* glow ring */}
                <div className="pointer-events-none absolute inset-0 opacity-40">
                  <motion.div
                    className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 60%)",
                    }}
                    animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.5] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>

                <p className="relative text-sm font-medium uppercase tracking-[0.22em] text-blue-400">
                  Share this room code
                </p>

                <div className="relative my-5 flex justify-center gap-2 sm:gap-4">
                  {String(roomCode)
                    .split("")
                    .map((digit, i) => (
                      <motion.span
                        key={i}
                        initial={{ y: 30, opacity: 0, rotateX: -90 }}
                        animate={{ y: 0, opacity: 1, rotateX: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 18,
                          delay: 0.1 + i * 0.08,
                        }}
                        className="flex h-20 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-5xl font-black text-white shadow-[0_10px_40px_-10px_rgba(59,130,246,0.8)] ring-1 ring-white/20 sm:h-24 sm:w-20 sm:text-6xl"
                      >
                        {digit}
                      </motion.span>
                    ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => void copyCode()}
                  className="relative rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/20"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={copied ? "copied" : "copy"}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="block"
                    >
                      {copied ? "✓ Copied!" : "Copy code"}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </Glass>
            </motion.div>

            {/* TEACHER STAGE */}
            <TeacherStage
              disabled={!isConnected}
              onReact={sendReaction}
              onMessage={sendMessage}
            />

            {/* QUESTION FLOW (auto next) */}
            {!isTestFinished && (
              <FlowControls
                autoNext={autoNext}
                delay={autoNextDelay}
                endOnAllAnswered={endOnAllAnswered}
                live={isTestStarted}
                disabled={!isConnected}
                onToggle={toggleAutoNext}
                onDelay={changeAutoDelay}
                onEndOnAllAnswered={toggleEndOnAllAnswered}
              />
            )}

            {/* SETTINGS */}
            <AnimatePresence>
              {!isTestStarted && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Glass className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white">
                        Contest settings
                      </h2>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
                        {quickzy.questions.length} questions
                      </span>
                    </div>

                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Time per question
                    </label>

                    <div className="mb-5 flex flex-wrap gap-2">
                      {[10, 15, 20, 30, 45, 60].map((s) => (
                        <motion.button
                          key={s}
                          type="button"
                          onClick={() => setDurationSeconds(s)}
                          whileTap={{ scale: 0.95 }}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition ${
                            durationSeconds === s
                              ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white ring-blue-400/40 shadow-lg shadow-blue-500/25"
                              : "bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10"
                          }`}
                        >
                          {s}s
                        </motion.button>
                      ))}
                    </div>

                    {/* SCORING RULE */}
                    <div className="mb-5 rounded-2xl bg-blue-500/10 p-4 text-sm text-slate-300 ring-1 ring-blue-400/25">
                      <p className="mb-1 font-semibold text-blue-400">
                        ⚡ How scoring works
                      </p>
                      <p>
                        A correct answer earns{" "}
                        <span className="font-semibold text-white">
                          marks × {POINTS_PER_MARK} points
                        </span>{" "}
                        plus a speed bonus of up to{" "}
                        <span className="font-semibold text-amber-300">
                          {Math.round(MAX_SPEED_BONUS_RATIO * 100)}%
                        </span>
                        . The faster a student answers, the bigger the bonus. It
                        shrinks to zero at the end of the {durationSeconds}s
                        timer. Wrong or missing answers earn 0.
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Maximum possible total:{" "}
                        <span className="font-semibold text-white">
                          {maxTotalPoints} pts
                        </span>
                      </p>
                    </div>

                    <motion.button
                      whileHover={students.length ? { scale: 1.03 } : undefined}
                      whileTap={students.length ? { scale: 0.97 } : undefined}
                      animate={
                        students.length > 0 && isConnected && !isStarting
                          ? {
                              boxShadow: [
                                "0 0 0 0 rgba(59,130,246,0.55)",
                                "0 0 0 16px rgba(59,130,246,0)",
                              ],
                            }
                          : { boxShadow: "0 0 0 0 rgba(59,130,246,0)" }
                      }
                      transition={
                        students.length > 0 && isConnected && !isStarting
                          ? { duration: 1.6, repeat: Infinity }
                          : {}
                      }
                      onClick={startTest}
                      disabled={
                        !isConnected || students.length === 0 || isStarting
                      }
                      className="rounded-2xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-500/30 disabled:opacity-40"
                    >
                      {isStarting ? "Starting..." : "🚀 Start Live Test"}
                    </motion.button>

                    {students.length === 0 && (
                      <p className="mt-2 text-sm text-slate-400">
                        Waiting for at least one student to join.
                      </p>
                    )}
                  </Glass>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LIVE QUESTION */}
            <AnimatePresence mode="wait">
              {liveQuestion && !isTestFinished && (
                <motion.div
                  key={liveQuestion.questionIndex}
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                >
                  <Glass
                    glow={isPaused ? "amber" : "none"}
                    className="p-6 sm:p-8"
                  >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                          Question {liveQuestion.questionIndex + 1} /{" "}
                          {liveQuestion.totalQuestions}
                        </p>
                        <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                            initial={false}
                            animate={{
                              width: `${((liveQuestion.questionIndex + 1) / liveQuestion.totalQuestions) * 100}%`,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 120,
                              damping: 20,
                            }}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
                        {isPaused && !isQuestionEnded ? (
                          <PausedClock
                            remaining={remainingSeconds}
                            total={liveQuestion.durationSeconds}
                            size={104}
                          />
                        ) : (
                          <QuizTimer
                            remaining={remainingSeconds}
                            total={liveQuestion.durationSeconds}
                            endsAt={liveQuestion.endsAt}
                            offsetMs={serverOffset}
                            ended={isQuestionEnded}
                            size={104}
                          />
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isPaused && isRunning && (
                        <motion.div
                          key="paused-banner"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-5 overflow-hidden rounded-2xl bg-violet-500/10 px-4 py-3 text-violet-200 ring-1 ring-violet-400/40"
                        >
                          ⏸ Quiz paused. Students can&apos;t answer and the
                          timer is frozen at {remainingSeconds}s. Press Resume
                          to continue.
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <h2 className="mb-5 bg-gradient-to-br from-white to-blue-400 bg-clip-text text-3xl font-extrabold leading-tight text-transparent">
                      {liveQuestion.question.question}
                    </h2>

                    <motion.div
                      variants={optionContainer}
                      initial="hidden"
                      animate="show"
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      {liveQuestion.question.options.map((option, index) => {
                        const isCorrect =
                          isQuestionEnded && correctOptionIndex === index;
                        const isDimmed = isQuestionEnded && !isCorrect;

                        return (
                          <motion.div key={index} variants={optionItem}>
                            <motion.div
                              animate={
                                isCorrect
                                  ? { scale: [1, 1.03, 1], opacity: 1 }
                                  : { scale: 1, opacity: isDimmed ? 0.4 : 1 }
                              }
                              transition={{ duration: 0.5 }}
                              className={`relative overflow-hidden rounded-2xl p-4 ring-1 transition ${
                                isCorrect
                                  ? "bg-emerald-500/15 text-emerald-100 ring-emerald-400/50 shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)]"
                                  : "bg-white/5 text-slate-200 ring-white/10"
                              }`}
                            >
                              <span className="mr-2 font-bold text-blue-400">
                                {String.fromCharCode(65 + index)}.
                              </span>
                              {option}
                              {isCorrect && (
                                <motion.span
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="ml-2 text-sm font-semibold text-emerald-300"
                                >
                                  ✓ Correct answer
                                </motion.span>
                              )}
                            </motion.div>
                          </motion.div>
                        );
                      })}
                    </motion.div>

                    {/* ANSWER PROGRESS */}
                    <div className="mt-6">
                      <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm text-slate-400">
                        <span>
                          Points:{" "}
                          <span className="font-semibold text-amber-300">
                            {basePoints}
                            {maxBonus > 0 && ` + up to ⚡${maxBonus}`}
                          </span>
                        </span>
                        <span>
                          Answers: <AnimatedNumber value={answeredCount} />
                          {onlineCount > 0 && ` / ${onlineCount}`}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"
                          initial={false}
                          animate={{ width: `${answeredPct}%` }}
                          transition={{
                            type: "spring",
                            stiffness: 140,
                            damping: 20,
                          }}
                        />
                      </div>
                    </div>

                    {/* AUTO-NEXT COUNTDOWN */}
                    <AnimatePresence>
                      {autoCountdownActive && (
                        <motion.div
                          key="auto-countdown"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-500/10 px-4 py-3 ring-1 ring-blue-400/30"
                        >
                          <p className="font-semibold text-blue-200">
                            ⏱️{" "}
                            {nextIsLast
                              ? "Final results in "
                              : "Next question in "}
                            <span className="tabular-nums text-white">
                              {Math.max(0, nextRemaining)}s
                            </span>
                          </p>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => toggleAutoNext(false)}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-slate-100 ring-1 ring-white/15 hover:bg-white/20"
                          >
                            Cancel auto
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <AnimatePresence mode="popLayout">
                        {isRunning && !isPaused && (
                          <motion.button
                            key="pause"
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={pauseTest}
                            className="rounded-xl bg-violet-500/10 px-5 py-3 font-semibold text-violet-200 ring-1 ring-violet-400/40 hover:bg-violet-500/20"
                          >
                            ⏸ Pause
                          </motion.button>
                        )}
                        {isRunning && isPaused && (
                          <motion.button
                            key="resume"
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={resumeTest}
                            className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 px-6 py-3 font-bold text-white shadow-lg shadow-emerald-500/30"
                          >
                            ▶ Resume
                          </motion.button>
                        )}
                        {isRunning && (
                          <motion.button
                            key="end"
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={endQuestionNow}
                            className="rounded-xl bg-rose-500/10 px-5 py-3 font-semibold text-rose-300 ring-1 ring-rose-400/40 hover:bg-rose-500/20"
                          >
                            End question now
                          </motion.button>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {isQuestionEnded && (
                          <motion.button
                            key="next"
                            initial={{ opacity: 0, y: 16, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={nextQuestion}
                            className="rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-7 py-3 font-bold text-white shadow-lg shadow-blue-500/30"
                          >
                            {isLastQuestion
                              ? autoCountdownActive
                                ? "Show Final Results now"
                                : "Show Final Results"
                              : autoCountdownActive
                                ? "Next Question now →"
                                : "Next Question →"}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </Glass>
                </motion.div>
              )}
            </AnimatePresence>

            {/* RESULTS */}
            {liveQuestion &&
              isQuestionEnded &&
              !isTestFinished &&
              results.length > 0 && (
                <QuestionResultsPanel
                  key={`results-${liveQuestion.questionIndex}`}
                  results={results}
                  distribution={distribution}
                  options={liveQuestion.question.options}
                  correctOptionIndex={correctOptionIndex}
                />
              )}

            <AnimatePresence>
              {testError && (
                <motion.p
                  key="test-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-xl bg-rose-500/10 p-3 text-rose-300 ring-1 ring-rose-400/30"
                >
                  {testError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* PARTICIPANTS */}
            <Glass glow="none" className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-white">Participants</h2>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                    <AnimatedNumber value={onlineCount} /> online
                  </span>
                  {students.length !== onlineCount && (
                    <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-slate-300 ring-1 ring-white/10">
                      {students.length} total
                    </span>
                  )}
                </div>
              </div>

              {students.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                  Waiting for students
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-blue-400"
                      animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  <AnimatePresence initial={false} mode="popLayout">
                    {students.map((student) => {
                      const answered =
                        isRunning && answeredIds.includes(student.id);
                      const result =
                        isQuestionEnded && !isTestFinished
                          ? resultById.get(student.id)
                          : undefined;
                      const status = result?.status;
                      const confirming = confirmRemoveId === student.id;

                      return (
                        <motion.li
                          key={student.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8, x: -30 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.6, x: 40 }}
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 26,
                          }}
                          className={`flex items-center gap-3 rounded-2xl p-3 ring-1 transition ${
                            confirming
                              ? "bg-rose-500/10 ring-rose-400/50"
                              : "bg-white/5 ring-white/10"
                          } ${student.connected ? "" : "opacity-70"}`}
                        >
                          <AvatarBadge
                            avatar={student.avatar}
                            name={student.username}
                            size={44}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-white">
                              {student.username}
                            </p>
                            <p className="truncate text-sm text-slate-400">
                              {student.email}
                            </p>
                          </div>

                          {!student.connected && (
                            <span className="whitespace-nowrap rounded-full bg-white/5 px-2 py-1 text-xs font-semibold text-slate-400 ring-1 ring-white/10">
                              ⚪ Offline
                            </span>
                          )}

                          <AnimatePresence mode="popLayout">
                            {answered && (
                              <motion.span
                                key="answered"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30"
                              >
                                ✓ Answered
                              </motion.span>
                            )}
                            {status && (
                              <motion.span
                                key="status"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${STATUS_BADGE[status].cls}`}
                              >
                                {STATUS_BADGE[status].label}
                                {status === "correct" && result
                                  ? ` +${result.earnedMarks}`
                                  : ""}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {confirming ? (
                            <div className="flex items-center gap-1">
                              <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={() => removeStudent(student.id)}
                                className="rounded-md bg-rose-500 px-2 py-1 text-xs font-semibold text-white shadow shadow-rose-500/30"
                              >
                                Remove
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={() => setConfirmRemoveId(null)}
                                className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-200 ring-1 ring-white/10"
                              >
                                Cancel
                              </motion.button>
                            </div>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.85 }}
                              onClick={() => setConfirmRemoveId(student.id)}
                              aria-label={`Remove ${student.username} from the quiz`}
                              title="Remove from quiz"
                              className="rounded-md p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                            >
                              ✕
                            </motion.button>
                          )}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}

              {students.length > 0 && (
                <p className="mt-3 text-xs text-slate-500">
                  Removed students are blocked from rejoining this room with the
                  same email. Students who lose connection stay on the list and
                  keep their score.
                </p>
              )}
            </Glass>

            {/* LEADERBOARD */}
            <AnimatePresence>
              {(isTestStarted || isTestFinished) && (
                <motion.div
                  key="leaderboard"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Glass className="p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-2xl font-bold text-white">
                        {isTestFinished
                          ? "🏆 Final Leaderboard"
                          : "Leaderboard"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        {leaderboard.length > 0 && (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={downloadResults}
                            className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-300 ring-1 ring-blue-400/30 hover:bg-white/10"
                          >
                            ⬇️ Download CSV
                          </motion.button>
                        )}
                        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30">
                          Live
                        </span>
                      </div>
                    </div>

                    {isTestFinished && <AvatarPodium entries={leaderboard} />}

                    {leaderboard.length === 0 ? (
                      <p className="text-slate-400">No scores yet.</p>
                    ) : (
                      <div className="mt-4">
                        <AvatarLeaderboard entries={leaderboard} showTime />
                      </div>
                    )}

                    {isTestFinished && (
                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                        <p className="text-sm text-slate-400">
                          Done? Download the results, then close the room to
                          delete its data and start a new session.
                        </p>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={requestEndQuiz}
                          className="rounded-xl bg-rose-500/10 px-5 py-2.5 font-semibold text-rose-300 ring-1 ring-rose-400/40 hover:bg-rose-500/20"
                        >
                          🧹 Close room & delete data
                        </motion.button>
                      </div>
                    )}
                  </Glass>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        <footer className="mt-auto pt-4 text-center text-xs text-slate-500">
          Quickzy Studio · Realtime contest broadcasting
        </footer>
      </main>
    </MotionConfig>
  );
}