"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useSocket } from "@/context/SocketContext";
import { AnimatedNumber, Confetti } from "@/components/quiz/QuizMotion";
import {
  AVATARS,
  AvatarBadge,
  AvatarLeaderboard,
  AvatarPicker,
  AvatarPodium,
  QuestionResultsPanel,
  QuizTimer,
  TeacherBroadcastLayer,
  useServerCountdown,
  useTeacherBroadcasts,
  type QuestionResult,
  type RankedEntry,
} from "@/components/quiz/QuizExtras";

interface LiveQuestion {
  question: {
    id?: string;
    question: string;
    options: string[];
    marks: number;
  };
  questionIndex: number;
  totalQuestions: number;
  durationSeconds: number;
  startedAt: number;
  endsAt: number;
  serverNow?: number;
}

interface AnswerResult {
  answered: boolean;
  isCorrect: boolean;
  earnedMarks: number;
  selectedOptionIndex: number | null;
  responseTimeMs: number | null;
}

export interface StudentLiveQuizProps {
  code: string;
  username: string;
  email: string;
  headerTitle: string;
  exitLabel: string;
  onExit: () => void;
  onChangeUser?: () => void;
  onChangeCode?: () => void;
}

const optionContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const optionItem = {
  hidden: { opacity: 0, x: -24 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

const toneClass = {
  info: "bg-indigo-50 text-indigo-700",
  success: "bg-green-50 text-green-700",
  error: "bg-red-50 text-red-700",
  warn: "bg-amber-50 text-amber-700",
};

const STORAGE_PREFIX = "quiz-live";

function storageKey(code: string, email: string) {
  return `${STORAGE_PREFIX}:${code}:${email.toLowerCase()}`;
}

interface PersistedSession {
  myId: string | null;
  avatar: string;
  confirmed: boolean;
}

function loadSession(code: string, email: string): PersistedSession | null {
  try {
    const raw = localStorage.getItem(storageKey(code, email));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (typeof parsed?.avatar !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(code: string, email: string, session: PersistedSession) {
  try {
    localStorage.setItem(storageKey(code, email), JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

function Spinner({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <motion.div
          className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
        <p>{label}</p>
      </div>
    </main>
  );
}

function Notice({
  icon,
  iconClass,
  title,
  titleClass,
  message,
  actionLabel,
  onAction,
  rotateFrom = -90,
}: {
  icon: string;
  iconClass: string;
  title: string;
  titleClass: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  rotateFrom?: number;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-5">
        <motion.div
          initial={{ scale: 0, rotate: rotateFrom }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className={`rounded-full p-5 text-3xl ${iconClass}`}
        >
          {icon}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`text-2xl font-bold ${titleClass}`}
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-md text-center text-gray-500"
        >
          {message}
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onAction}
          className="rounded-lg bg-indigo-600 px-5 py-3 text-white"
        >
          {actionLabel}
        </motion.button>
      </main>
    </MotionConfig>
  );
}

export default function StudentLiveQuiz({
  code,
  username,
  email,
  headerTitle,
  exitLabel,
  onExit,
  onChangeUser,
  onChangeCode,
}: StudentLiveQuizProps) {
  const { socket, isConnected } = useSocket();

  // Stable id assigned by the server. Same on every reconnect.
  const [myId, setMyId] = useState<string | null>(null);

  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [confirmed, setConfirmed] = useState(false);

  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const joinedRef = useRef(false); // true once we've ever been joined

  const [pageError, setPageError] = useState("");
  const [roomEnded, setRoomEnded] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [replaced, setReplaced] = useState(false);

  const [liveQuestion, setLiveQuestion] = useState<LiveQuestion | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(
    null,
  );

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [questionEnded, setQuestionEnded] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);

  const [answeredCount, setAnsweredCount] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [distribution, setDistribution] = useState<number[]>([]);

  const [leaderboard, setLeaderboard] = useState<RankedEntry[]>([]);
  const [testFinished, setTestFinished] = useState(false);

  const { reactions, message, removeReaction, dismissMessage } =
    useTeacherBroadcasts(socket);

  const remainingSeconds = useServerCountdown(
    liveQuestion?.endsAt ?? null,
    serverOffset,
    !!liveQuestion && !questionEnded && !testFinished,
  );

  // --------------------------------
  // WARN BEFORE RELOAD / CLOSE while a live quiz is active
  // --------------------------------
  useEffect(() => {
    // Warn only while the student is inside a live, unfinished quiz.
    // - confirmed: they chose an avatar and pressed "Join Room"
    // - isJoined:  the server acknowledged the join (so score exists)
    // - not finished / removed / replaced / roomEnded
    const isActiveQuiz =
      confirmed &&
      isJoined &&
      !testFinished &&
      !removed &&
      !replaced &&
      !roomEnded;

    if (!isActiveQuiz) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Modern browsers ignore the message but still need preventDefault()
      // + returnValue truthy to show their native confirm dialog.
      e.preventDefault();
      e.returnValue =
        "Your live quiz is in progress. Reloading may interrupt your session — your score is saved, but any answer in this question could be missed.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [confirmed, isJoined, testFinished, removed, replaced, roomEnded]);

  // ---- restore persisted session (myId / avatar / confirmed) once ----
  useEffect(() => {
    const saved = loadSession(code, email);
    if (saved) {
      if (saved.myId) setMyId(saved.myId);
      if (AVATARS.includes(saved.avatar)) setAvatar(saved.avatar);
      if (saved.confirmed) setConfirmed(true);
      return;
    }
    // First visit: pick a random avatar.
    setAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, email]);

  // Persist on change so a full page reload is seamless.
  useEffect(() => {
    if (!confirmed) return;
    saveSession(code, email, { myId, avatar, confirmed });
  }, [code, email, myId, avatar, confirmed]);

  // --------------------------------
  // JOIN ROOM
  // --------------------------------

  const joinRoom = useCallback(() => {
    if (!socket || !socket.connected) return;
    if (!joinedRef.current) setIsJoining(true);
    setPageError("");

    socket.emit("join-room", {
      code: Number(code),
      email,
      username,
      avatar,
    });
  }, [socket, code, email, username, avatar]);

  const confirmJoin = () => {
    saveSession(code, email, { myId, avatar, confirmed: true });
    setIsJoining(true);
    setConfirmed(true);
  };

  // --------------------------------
  // SOCKET EVENTS
  // --------------------------------

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (data: { id?: string }) => {
      if (data?.id) {
        setMyId(data.id);
        saveSession(code, email, {
          myId: data.id,
          avatar,
          confirmed: true,
        });
      }
      joinedRef.current = true;
      setIsJoined(true);
      setIsJoining(false);
      setPageError("");
    };

    const handleRoomError = (data: { code?: string; message?: string }) => {
      const code = data?.code;

      // Fatal errors: this room is gone / we're not allowed.
      if (code === "ROOM_GONE" || code === "FINISHED" || code === "BANNED") {
        joinedRef.current = false;
        setPageError(data?.message || "Unable to join room.");
        setIsJoining(false);
        setIsJoined(false);
        return;
      }

      // Non-fatal (transient) error during a reconnect: keep the UI as is.
      if (joinedRef.current) {
        setIsJoining(false);
        return;
      }

      joinedRef.current = false;
      setPageError(data?.message || "Unable to join room.");
      setIsJoining(false);
      setIsJoined(false);
    };

    const handleQuestionStarted = (data: LiveQuestion) => {
      if (typeof data.serverNow === "number") {
        setServerOffset(data.serverNow - Date.now());
      }

      // Only reset per-question state when it's actually a NEW question.
      const isNewQuestion =
        !liveQuestion || liveQuestion.questionIndex !== data.questionIndex;

      setLiveQuestion(data);

      if (isNewQuestion) {
        setSelectedOption(null);
        setCorrectOptionIndex(null);
        setHasSubmitted(false);
        setQuestionEnded(false);
        setAnswerFeedback("");
        setResult(null);
        setResults([]);
        setDistribution([]);
        setAnsweredCount(0);
      }
    };

    const handleAnswerLocked = (data: { selectedOptionIndex?: number }) => {
      if (typeof data?.selectedOptionIndex === "number") {
        setSelectedOption(data.selectedOptionIndex);
      }
      setHasSubmitted(true);
      setAnswerFeedback("");
    };

    const handleAnswerResult = (data: AnswerResult) => {
      setResult(data);
      if (typeof data.selectedOptionIndex === "number") {
        setSelectedOption(data.selectedOptionIndex);
      }
    };

    const handleAnswerError = (data: { code?: string; message?: string }) => {
      setHasSubmitted(data?.code === "ALREADY_ANSWERED");
      setAnswerFeedback(data?.message || "Unable to submit answer.");
    };

    const handleAnswerReceived = (data: { answeredCount: number }) => {
      setAnsweredCount(data.answeredCount);
    };

    const handleStudentRemoved = (data: { answeredCount: number }) => {
      setAnsweredCount(data.answeredCount);
    };

    const handleQuestionEnded = (data: {
      correctOptionIndex?: number;
      leaderboard?: RankedEntry[];
      results?: QuestionResult[];
      distribution?: number[];
    }) => {
      setQuestionEnded(true);
      if (typeof data?.correctOptionIndex === "number") {
        setCorrectOptionIndex(data.correctOptionIndex);
      }
      if (data?.leaderboard) setLeaderboard(data.leaderboard);
      setResults(data?.results ?? []);
      setDistribution(data?.distribution ?? []);
    };

    const handleLeaderboard = (data: RankedEntry[]) => {
      if (Array.isArray(data)) setLeaderboard(data);
    };

    const handleTestFinished = (data: { leaderboard: RankedEntry[] }) => {
      if (data?.leaderboard) setLeaderboard(data.leaderboard);
      setTestFinished(true);
      setQuestionEnded(true);
    };

    const handleRoomEnded = (data: { message?: string }) => {
      setRoomEnded(true);
      setPageError(data?.message || "The teacher has closed this room.");
    };

    const handleRemoved = (data: { message?: string }) => {
      setRemoved(true);
      setIsJoining(false);
      setPageError(data?.message || "The teacher removed you from this quiz.");
    };

    const handleReplaced = (data: { message?: string }) => {
      setReplaced(true);
      setIsJoining(false);
      setPageError(
        data?.message || "You joined this quiz from another tab or device.",
      );
    };

    socket.on("room-joined", handleRoomJoined);
    socket.on("room-error", handleRoomError);
    socket.on("question-started", handleQuestionStarted);
    socket.on("answer-locked", handleAnswerLocked);
    socket.on("answer-result", handleAnswerResult);
    socket.on("answer-error", handleAnswerError);
    socket.on("answer-received", handleAnswerReceived);
    socket.on("student-removed", handleStudentRemoved);
    socket.on("question-ended", handleQuestionEnded);
    socket.on("leaderboard-updated", handleLeaderboard);
    socket.on("test-finished", handleTestFinished);
    socket.on("room-ended", handleRoomEnded);
    socket.on("removed-from-room", handleRemoved);
    socket.on("session-replaced", handleReplaced);

    return () => {
      socket.off("room-joined", handleRoomJoined);
      socket.off("room-error", handleRoomError);
      socket.off("question-started", handleQuestionStarted);
      socket.off("answer-locked", handleAnswerLocked);
      socket.off("answer-result", handleAnswerResult);
      socket.off("answer-error", handleAnswerError);
      socket.off("answer-received", handleAnswerReceived);
      socket.off("student-removed", handleStudentRemoved);
      socket.off("question-ended", handleQuestionEnded);
      socket.off("leaderboard-updated", handleLeaderboard);
      socket.off("test-finished", handleTestFinished);
      socket.off("room-ended", handleRoomEnded);
      socket.off("removed-from-room", handleRemoved);
      socket.off("session-replaced", handleReplaced);
    };
    // liveQuestion is read inside the handler; we deliberately don't re-bind
    // every time it changes (the handler closes over the *first* value).
    // Re-binding is unnecessary because `questionIndex` is all we need and
    // the reset logic is idempotent if it fires twice for the same question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, code, email]);

  // --------------------------------
  // (RE)JOIN whenever the socket (re)connects
  // --------------------------------

  useEffect(() => {
    if (!socket) return;
    if (!confirmed) return;
    if (removed || replaced || roomEnded) return;

    const tryJoin = () => {
      if (!socket.connected) return;
      joinRoom();
    };

    // First mount / already-connected socket.
    tryJoin();

    // Every reconnection.
    socket.on("connect", tryJoin);
    return () => {
      socket.off("connect", tryJoin);
    };
  }, [socket, confirmed, removed, replaced, roomEnded, joinRoom]);

  // --------------------------------
  // SUBMIT ANSWER
  // --------------------------------

  const submitAnswer = () => {
    if (!socket || !liveQuestion) return;

    if (selectedOption === null) {
      setAnswerFeedback("Please select an answer first.");
      return;
    }

    if (hasSubmitted || questionEnded || remainingSeconds <= 0) return;

    setHasSubmitted(true);
    setAnswerFeedback("");

    socket.emit("submit-answer", {
      questionIndex: liveQuestion.questionIndex,
      selectedOptionIndex: selectedOption,
    });
  };

  const me = myId ? leaderboard.find((s) => s.id === myId) : undefined;

  const broadcastLayer = (
    <TeacherBroadcastLayer
      reactions={reactions}
      message={message}
      onReactionDone={removeReaction}
      onDismissMessage={dismissMessage}
    />
  );

  // --------------------------------
  // TERMINAL SCREENS
  // --------------------------------

  if (roomEnded) {
    return (
      <Notice
        icon="✕"
        iconClass="bg-red-100 text-red-600"
        title="Room Closed"
        titleClass="text-red-500"
        message={pageError}
        actionLabel={exitLabel}
        onAction={onExit}
      />
    );
  }

  if (replaced) {
    return (
      <Notice
        icon="🔀"
        iconClass="bg-indigo-100"
        title="Opened somewhere else"
        titleClass="text-indigo-600"
        message={pageError}
        actionLabel={exitLabel}
        onAction={onExit}
      />
    );
  }

  if (removed) {
    return (
      <Notice
        icon="🚪"
        iconClass="bg-amber-100"
        title="You were removed from this quiz"
        titleClass="text-amber-600"
        message={pageError}
        actionLabel={exitLabel}
        onAction={onExit}
        rotateFrom={90}
      />
    );
  }

  // --------------------------------
  // CONNECTING / RECONNECTING
  // --------------------------------

  if (!isConnected) {
    return (
      <Spinner
        label={
          isJoined
            ? "Connection lost. Reconnecting, your score is safe..."
            : "Connecting to server..."
        }
      />
    );
  }

  // --------------------------------
  // LOBBY: PICK AVATAR
  // --------------------------------

  if (!confirmed) {
    return (
      <MotionConfig reducedMotion="user">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-5">
          <div className="text-center">
            <motion.div
              key={avatar}
              initial={{ scale: 0.4, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 14 }}
              className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-indigo-100 text-6xl shadow-inner"
            >
              {avatar}
            </motion.div>
            <h1 className="mt-4 text-2xl font-bold">Almost there!</h1>
            <p className="text-gray-500">
              Room <span className="font-bold tracking-widest">{code}</span>
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Playing as <span className="font-semibold">{username}</span>
              {onChangeUser && (
                <>
                  {" "}
                  <button
                    onClick={onChangeUser}
                    className="text-indigo-600 underline"
                  >
                    Not you?
                  </button>
                </>
              )}
            </p>
          </div>

          <section className="w-full rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold">Pick your avatar</h2>
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </section>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={confirmJoin}
            className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white"
          >
            Join Room
          </motion.button>
        </main>
      </MotionConfig>
    );
  }

  if (isJoining) {
    return <Spinner label="Joining live quiz..." />;
  }

  if (pageError && !isJoined) {
    return (
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-5"
      >
        <h1 className="text-xl font-bold text-red-500">Unable to join room</h1>
        <p className="text-center text-gray-500">{pageError}</p>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setPageError("");
              joinRoom();
            }}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-white"
          >
            Try Again
          </motion.button>
          {onChangeCode && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onChangeCode}
              className="rounded-lg border px-5 py-2 text-gray-700"
            >
              Change code
            </motion.button>
          )}
        </div>
      </motion.main>
    );
  }

  // --------------------------------
  // FINAL RESULT
  // --------------------------------

  if (testFinished) {
    return (
      <MotionConfig reducedMotion="user">
        {broadcastLayer}
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-5">
          <Confetti />

          <motion.section
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="rounded-2xl border bg-white p-8 text-center shadow-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 12,
                delay: 0.2,
              }}
              className="mb-3 text-5xl"
            >
              🏆
            </motion.div>
            <h1 className="text-3xl font-bold">Test Completed!</h1>
            <p className="mt-2 text-gray-500">
              Here are the final contest results.
            </p>

            {me && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.5,
                  type: "spring",
                  stiffness: 200,
                  damping: 18,
                }}
                className="mt-6 rounded-xl bg-indigo-50 p-5"
              >
                <div className="mb-2 flex justify-center">
                  <AvatarBadge
                    avatar={me.avatar ?? avatar}
                    name={me.username}
                    size={56}
                  />
                </div>
                <p className="text-gray-500">Your final position</p>
                <p className="text-5xl font-extrabold text-indigo-600">
                  #<AnimatedNumber value={me.rank} />
                </p>
                <p className="mt-2 font-semibold">
                  <AnimatedNumber value={me.score} /> points
                </p>
              </motion.div>
            )}
          </motion.section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-xl font-bold">Final Leaderboard</h2>
            <AvatarPodium entries={leaderboard} />
            <div className="mt-6">
              <AvatarLeaderboard
                entries={leaderboard}
                highlightId={myId ?? undefined}
                showTime
              />
            </div>
          </section>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExit}
            className="rounded-lg bg-indigo-600 px-5 py-3 text-white"
          >
            {exitLabel}
          </motion.button>
        </main>
      </MotionConfig>
    );
  }

  // --------------------------------
  // WAITING FOR TEACHER
  // --------------------------------

  if (!liveQuestion) {
    return (
      <MotionConfig reducedMotion="user">
        {broadcastLayer}
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-5">
          <div className="relative flex h-28 w-28 items-center justify-center">
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute h-full w-full rounded-full bg-green-400"
                initial={{ scale: 0.6, opacity: 0.4 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i,
                  ease: "easeOut",
                }}
              />
            ))}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              className="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl"
            >
              {avatar}
            </motion.div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-green-600"
          >
            You&apos;re in, {username}!
          </motion.h1>

          <p className="text-gray-500">
            Room code: <span className="font-bold tracking-widest">{code}</span>
          </p>

          <p className="flex items-center gap-2 text-center text-gray-500">
            Waiting for the teacher to start the live test
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-gray-400"
                animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </p>

          <p className="text-sm text-gray-400">
            <AnimatedNumber value={leaderboard.length} /> participants in the
            room
          </p>
        </main>
      </MotionConfig>
    );
  }

  // --------------------------------
  // LIVE QUESTION
  // --------------------------------

  const locked = hasSubmitted || questionEnded || remainingSeconds <= 0;

  let banner: {
    tone: keyof typeof toneClass;
    title: string;
    detail?: string;
  } | null = null;
  if (questionEnded && result) {
    if (!result.answered) {
      banner = {
        tone: "warn",
        title: "Time ran out",
        detail: "You didn't submit an answer for this question.",
      };
    } else if (result.isCorrect) {
      banner = {
        tone: "success",
        title: `Correct! +${result.earnedMarks} marks`,
        detail:
          result.responseTimeMs !== null
            ? `Answered in ${(result.responseTimeMs / 1000).toFixed(2)} seconds.`
            : undefined,
      };
    } else {
      banner = {
        tone: "error",
        title: "Incorrect",
        detail: "Better luck on the next one.",
      };
    }
  } else if (hasSubmitted && !questionEnded) {
    banner = {
      tone: "info",
      title: "Answer locked in 🔒",
      detail: "Results are revealed when the timer ends.",
    };
  } else if (answerFeedback) {
    banner = { tone: "warn", title: answerFeedback };
  }

  return (
    <MotionConfig reducedMotion="user">
      {broadcastLayer}
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-5">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AvatarBadge avatar={avatar} name={username} size={44} />
              <div>
                <h1 className="text-xl font-bold">{headerTitle}</h1>
                <p className="text-sm text-gray-500">Room {code}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {me && (
                <div className="overflow-hidden rounded-xl bg-indigo-50 px-3 py-1.5 text-center">
                  <p className="text-xs text-gray-500">Your rank</p>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.p
                      key={me.rank}
                      initial={{ y: -16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 16, opacity: 0 }}
                      className="text-lg font-extrabold text-indigo-600"
                    >
                      #{me.rank}
                    </motion.p>
                  </AnimatePresence>
                </div>
              )}

              <QuizTimer
                remaining={remainingSeconds}
                total={liveQuestion.durationSeconds}
                endsAt={liveQuestion.endsAt}
                offsetMs={serverOffset}
                ended={questionEnded}
                size={84}
              />
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.section
              key={liveQuestion.questionIndex}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
                <span>
                  Question {liveQuestion.questionIndex + 1} of{" "}
                  {liveQuestion.totalQuestions}
                </span>
                <span>{liveQuestion.question.marks} marks</span>
              </div>

              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  className="h-full rounded-full bg-indigo-500"
                  initial={false}
                  animate={{
                    width: `${((liveQuestion.questionIndex + 1) / liveQuestion.totalQuestions) * 100}%`,
                  }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>

              {leaderboard.length > 0 && !questionEnded && (
                <p className="mb-4 text-xs text-gray-500">
                  👥 <AnimatedNumber value={answeredCount} /> of{" "}
                  {leaderboard.length} answered
                </p>
              )}

              <h2 className="mb-6 text-2xl font-bold">
                {liveQuestion.question.question}
              </h2>

              <motion.div
                variants={optionContainer}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {liveQuestion.question.options.map((option, index) => {
                  const isSelected = selectedOption === index;
                  const showCorrect =
                    questionEnded && correctOptionIndex === index;
                  const showWrong =
                    questionEnded &&
                    isSelected &&
                    correctOptionIndex !== null &&
                    correctOptionIndex !== index;

                  let style = "border-gray-200";
                  if (showCorrect)
                    style =
                      "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-300";
                  else if (showWrong)
                    style =
                      "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-300";
                  else if (isSelected)
                    style = "border-indigo-600 bg-indigo-50 text-indigo-700";

                  return (
                    <motion.div key={index} variants={optionItem}>
                      <motion.button
                        disabled={locked}
                        onClick={() => setSelectedOption(index)}
                        whileHover={locked ? undefined : { scale: 1.015 }}
                        whileTap={locked ? undefined : { scale: 0.97 }}
                        animate={
                          showCorrect
                            ? { scale: [1, 1.04, 1], opacity: 1 }
                            : showWrong
                              ? { x: [0, -8, 8, -6, 6, 0], opacity: 1 }
                              : {
                                  scale: 1,
                                  x: 0,
                                  opacity:
                                    questionEnded && !isSelected ? 0.5 : 1,
                                }
                        }
                        transition={{ duration: 0.45 }}
                        className={`w-full rounded-xl border p-4 text-left disabled:cursor-not-allowed ${style}`}
                      >
                        <span className="mr-3 font-bold">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        {option}
                        {showCorrect && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="float-right font-bold"
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </motion.div>

              <AnimatePresence>
                {!hasSubmitted && !questionEnded && (
                  <motion.button
                    key="submit"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: selectedOption === null ? 0.5 : 1,
                      y: 0,
                    }}
                    exit={{ opacity: 0, y: -10 }}
                    whileHover={
                      selectedOption === null ? undefined : { scale: 1.02 }
                    }
                    whileTap={
                      selectedOption === null ? undefined : { scale: 0.97 }
                    }
                    onClick={submitAnswer}
                    disabled={selectedOption === null || remainingSeconds <= 0}
                    className="mt-6 w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white"
                  >
                    Submit Answer
                  </motion.button>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {banner && (
                  <motion.div
                    key={banner.title}
                    initial={{ opacity: 0, scale: 0.92, y: 10 }}
                    animate={
                      banner.tone === "error"
                        ? {
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            x: [0, -8, 8, -6, 6, 0],
                          }
                        : { opacity: 1, scale: 1, y: 0, x: 0 }
                    }
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`mt-5 rounded-lg p-4 ${toneClass[banner.tone]}`}
                  >
                    <p className="text-lg font-bold">{banner.title}</p>
                    {banner.detail && (
                      <p className="text-sm">{banner.detail}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {questionEnded && (
                  <motion.p
                    key="ended"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-5 text-center font-semibold text-gray-500"
                  >
                    Question ended. Waiting for the next question...
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.section>
          </AnimatePresence>

          {questionEnded && results.length > 0 && (
            <QuestionResultsPanel
              key={`results-${liveQuestion.questionIndex}`}
              results={results}
              distribution={distribution}
              options={liveQuestion.question.options}
              correctOptionIndex={correctOptionIndex}
              highlightId={myId ?? undefined}
            />
          )}

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">Leaderboard</h2>

            {leaderboard.length === 0 ? (
              <p className="text-gray-500">
                Scores will appear here after each question.
              </p>
            ) : (
              <AvatarLeaderboard
                entries={leaderboard}
                highlightId={myId ?? undefined}
              />
            )}
          </section>
        </main>
      </div>
    </MotionConfig>
  );
}
