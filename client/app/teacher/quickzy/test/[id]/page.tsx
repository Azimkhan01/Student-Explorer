"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useSocket } from "@/context/SocketContext";
import { AnimatedNumber, Confetti } from "@/components/quiz/QuizMotion";
import {
  AvatarBadge,
  AvatarLeaderboard,
  AvatarPodium,
  QuizTimer,
  useServerCountdown,
  type RankedEntry,
} from "@/components/quiz/QuizExtras";

const API_URL = "/server/quickzy";

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
  socketId: string;
  username: string;
  email: string;
  avatar?: string;
  score: number;
  totalTimeMs: number;
  answeredQuestions: number;
}

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

export default function TeacherLiveQuizPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { socket, isConnected } = useSocket();

  const [quickzy, setQuickzy] = useState<Quickzy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [roomCode, setRoomCode] = useState<number | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [leaderboard, setLeaderboard] = useState<RankedEntry[]>([]);

  const [durationSeconds, setDurationSeconds] = useState(20);

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isQuestionEnded, setIsQuestionEnded] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);

  const [liveQuestion, setLiveQuestion] = useState<LiveQuestion | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [testError, setTestError] = useState("");

  const remainingSeconds = useServerCountdown(
    liveQuestion?.endsAt ?? null,
    serverOffset,
    !!liveQuestion && !isQuestionEnded && !isTestFinished,
  );

  // --------------------------------
  // FETCH QUIZ
  // --------------------------------

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

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const result = await response.json();
      const rawData = result.data ?? result;

      // Your API returns an array containing the Quickzy object.
      const data = Array.isArray(rawData) ? rawData[0] : rawData;

      if (!data || !Array.isArray(data.questions)) {
        throw new Error("Invalid Quickzy data.");
      }

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

  // --------------------------------
  // SOCKET EVENTS
  // --------------------------------

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data: { roomId: string; code: number }) => {
      setRoomId(data.roomId);
      setRoomCode(data.code);
      setStudents([]);
      setLeaderboard([]);
      setIsCreatingRoom(false);
      setError("");
    };

    const handleRoomError = (data: { message?: string }) => {
      setError(data?.message || "Unable to create room.");
      setIsCreatingRoom(false);
    };

    const handleRoomUsers = (users: Student[]) => setStudents(users);

    const handleQuestionStarted = (data: LiveQuestion) => {
      if (typeof data.serverNow === "number") {
        setServerOffset(data.serverNow - Date.now());
      }
      setLiveQuestion(data);
      setIsTestStarted(true);
      setIsQuestionEnded(false);
      setIsTestFinished(false);
      setCorrectOptionIndex(null);
      setAnsweredCount(0);
      setAnsweredIds([]);
      setTestError("");
    };

    const handleQuestionEnded = (data: {
      questionIndex: number;
      correctOptionIndex: number;
      leaderboard: RankedEntry[];
    }) => {
      setIsQuestionEnded(true);
      setCorrectOptionIndex(data.correctOptionIndex);
      setLeaderboard(data.leaderboard);
    };

    const handleLeaderboard = (data: RankedEntry[]) => setLeaderboard(data);

    const handleAnswerReceived = (data: { socketId?: string; answeredCount: number }) => {
      setAnsweredCount(data.answeredCount);
      if (data.socketId) {
        setAnsweredIds((prev) =>
          prev.includes(data.socketId!) ? prev : [...prev, data.socketId!],
        );
      }
    };

    const handleTestFinished = (data: { leaderboard: RankedEntry[] }) => {
      setIsTestFinished(true);
      setIsQuestionEnded(true);
      setLeaderboard(data.leaderboard);
    };

    const handleTestError = (data: { message?: string }) => {
      setTestError(data?.message || "Live test error.");
    };

    socket.on("room-created", handleRoomCreated);
    socket.on("room-error", handleRoomError);
    socket.on("room-users", handleRoomUsers);
    socket.on("question-started", handleQuestionStarted);
    socket.on("question-ended", handleQuestionEnded);
    socket.on("leaderboard-updated", handleLeaderboard);
    socket.on("answer-received", handleAnswerReceived);
    socket.on("test-finished", handleTestFinished);
    socket.on("test-error", handleTestError);

    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("room-error", handleRoomError);
      socket.off("room-users", handleRoomUsers);
      socket.off("question-started", handleQuestionStarted);
      socket.off("question-ended", handleQuestionEnded);
      socket.off("leaderboard-updated", handleLeaderboard);
      socket.off("answer-received", handleAnswerReceived);
      socket.off("test-finished", handleTestFinished);
      socket.off("test-error", handleTestError);
    };
  }, [socket]);

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

    setIsCreatingRoom(true);
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
    if (!socket || !roomId) return;
    setTestError("");
    socket.emit("start-test", { durationSeconds });
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

  const copyCode = async () => {
    if (roomCode === null) return;
    try {
      await navigator.clipboard.writeText(String(roomCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; ignore silently.
    }
  };

  // --------------------------------
  // LOADING / ERROR
  // --------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-gray-600">
        <motion.span
          className="h-6 w-6 rounded-full border-4 border-indigo-500 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
        Loading quiz...
      </div>
    );
  }

  if (error && !quickzy) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-screen flex-col items-center justify-center gap-4"
      >
        <p className="text-red-500">{error}</p>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => void fetchQuickzy()}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-white"
        >
          Try Again
        </motion.button>
      </motion.div>
    );
  }

  if (!quickzy) return null;

  const answeredPct =
    students.length > 0 ? Math.min(100, (answeredCount / students.length) * 100) : 0;

  const isLastQuestion =
    liveQuestion !== null && liveQuestion.questionIndex + 1 === liveQuestion.totalQuestions;

  const isRunning = liveQuestion !== null && !isQuestionEnded && !isTestFinished;

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-5">
        {isTestFinished && <Confetti />}

        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <h1 className="text-3xl font-bold">{quickzy.quickzy_name}</h1>
            <p className="text-gray-500">Live quiz contest</p>
          </div>

          <span
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
              isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            <motion.span
              className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              animate={isConnected ? { scale: [1, 1.6, 1], opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            {isConnected ? "Socket connected" : "Socket disconnected"}
          </span>
        </motion.header>

        <AnimatePresence>
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-lg bg-red-50 p-3 text-red-600"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* CREATE ROOM */}
        <AnimatePresence>
          {!roomCode && (
            <motion.section
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <p className="mb-4 text-gray-600">Create a live room for students to join.</p>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={createRoom}
                disabled={!isConnected || isCreatingRoom}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {isCreatingRoom && (
                  <motion.span
                    className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                  />
                )}
                {isCreatingRoom ? "Creating room..." : "Create Live Room"}
              </motion.button>
            </motion.section>
          )}
        </AnimatePresence>

        {roomCode !== null && (
          <>
            {/* ROOM CODE */}
            <motion.section
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="rounded-2xl border bg-white p-6 text-center shadow-sm"
            >
              <p className="text-gray-500">Share this room code with students</p>

              <div className="my-4 flex justify-center gap-2 sm:gap-3">
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
                      className="flex h-16 w-12 items-center justify-center rounded-xl bg-indigo-600 text-4xl font-extrabold text-white shadow-lg sm:h-20 sm:w-16 sm:text-5xl"
                    >
                      {digit}
                    </motion.span>
                  ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => void copyCode()}
                className="rounded-full border px-4 py-1.5 text-sm font-medium text-gray-700"
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
                    {copied ? "Copied!" : "Copy code"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </motion.section>

            {/* SETTINGS */}
            <AnimatePresence>
              {!isTestStarted && (
                <motion.section
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-2xl border bg-white p-6 shadow-sm"
                >
                  <h2 className="mb-3 text-xl font-bold">Contest settings</h2>

                  <label className="mb-2 block text-sm font-medium">Time per question</label>

                  <select
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    className="mb-5 rounded-lg border p-3"
                  >
                    {[10, 15, 20, 30, 45, 60].map((s) => (
                      <option key={s} value={s}>
                        {s} seconds
                      </option>
                    ))}
                  </select>

                  <p className="mb-4 text-gray-500">
                    {quickzy.questions.length} questions available
                  </p>

                  <motion.button
                    whileHover={students.length ? { scale: 1.03 } : undefined}
                    whileTap={students.length ? { scale: 0.97 } : undefined}
                    animate={
                      students.length > 0 && isConnected
                        ? {
                            boxShadow: [
                              "0 0 0 0 rgba(22,163,74,0.5)",
                              "0 0 0 14px rgba(22,163,74,0)",
                            ],
                          }
                        : { boxShadow: "0 0 0 0 rgba(22,163,74,0)" }
                    }
                    transition={
                      students.length > 0 && isConnected
                        ? { duration: 1.6, repeat: Infinity }
                        : {}
                    }
                    onClick={startTest}
                    disabled={!isConnected || students.length === 0}
                    className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    Start Live Test
                  </motion.button>

                  {students.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">
                      Waiting for at least one student to join.
                    </p>
                  )}
                </motion.section>
              )}
            </AnimatePresence>

            {/* LIVE QUESTION */}
            <AnimatePresence mode="wait">
              {liveQuestion && !isTestFinished && (
                <motion.section
                  key={liveQuestion.questionIndex}
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  className="rounded-2xl border bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <span className="font-semibold">
                      Question {liveQuestion.questionIndex + 1} of {liveQuestion.totalQuestions}
                    </span>

                    <QuizTimer
                      remaining={remainingSeconds}
                      total={liveQuestion.durationSeconds}
                      endsAt={liveQuestion.endsAt}
                      offsetMs={serverOffset}
                      ended={isQuestionEnded}
                      size={104}
                    />
                  </div>

                  <h2 className="mb-5 text-2xl font-bold">{liveQuestion.question.question}</h2>

                  <motion.div
                    variants={optionContainer}
                    initial="hidden"
                    animate="show"
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {liveQuestion.question.options.map((option, index) => {
                      const isCorrect = isQuestionEnded && correctOptionIndex === index;
                      const isDimmed = isQuestionEnded && !isCorrect;

                      return (
                        <motion.div key={index} variants={optionItem}>
                          <motion.div
                            animate={
                              isCorrect
                                ? { scale: [1, 1.04, 1], opacity: 1 }
                                : { scale: 1, opacity: isDimmed ? 0.45 : 1 }
                            }
                            transition={{ duration: 0.5 }}
                            className={`rounded-xl border p-4 ${
                              isCorrect
                                ? "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-300"
                                : "border-gray-200"
                            }`}
                          >
                            <span className="mr-2 font-bold">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            {option}
                            {isCorrect && (
                              <motion.span
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="ml-2 text-sm font-semibold"
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
                    <div className="mb-1 flex justify-between text-sm text-gray-500">
                      <span>Marks: {liveQuestion.question.marks}</span>
                      <span>
                        Answers received: <AnimatedNumber value={answeredCount} />
                        {students.length > 0 && ` / ${students.length}`}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        className="h-full rounded-full bg-indigo-500"
                        initial={false}
                        animate={{ width: `${answeredPct}%` }}
                        transition={{ type: "spring", stiffness: 140, damping: 20 }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <AnimatePresence>
                      {isRunning && (
                        <motion.button
                          key="end"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={endQuestionNow}
                          className="rounded-lg border border-red-300 px-5 py-3 font-semibold text-red-600"
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
                          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white"
                        >
                          {isLastQuestion ? "Show Final Results" : "Next Question"}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {testError && (
                <motion.p
                  key="test-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-lg bg-red-50 p-3 text-red-600"
                >
                  {testError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* PARTICIPANTS */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Participants</h2>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                  <AnimatedNumber value={students.length} /> online
                </span>
              </div>

              {students.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-5 text-gray-500">
                  Waiting for students
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-gray-400"
                      animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  <AnimatePresence initial={false} mode="popLayout">
                    {students.map((student) => {
                      const answered = isRunning && answeredIds.includes(student.socketId);
                      return (
                        <motion.li
                          key={student.socketId}
                          layout
                          initial={{ opacity: 0, scale: 0.8, x: -30 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.8, x: 30 }}
                          transition={{ type: "spring", stiffness: 350, damping: 26 }}
                          className="flex items-center gap-3 rounded-xl border p-3"
                        >
                          <AvatarBadge
                            avatar={student.avatar}
                            name={student.username}
                            size={44}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{student.username}</p>
                            <p className="truncate text-sm text-gray-500">{student.email}</p>
                          </div>
                          <AnimatePresence>
                            {answered && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700"
                              >
                                ✓ Answered
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </section>

            {/* LEADERBOARD */}
            <AnimatePresence>
              {(isTestStarted || isTestFinished) && (
                <motion.section
                  key="leaderboard"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border bg-white p-6 shadow-sm"
                >
                  <h2 className="mb-4 text-2xl font-bold">
                    {isTestFinished ? "Final Leaderboard" : "Leaderboard"}
                  </h2>

                  {isTestFinished && <AvatarPodium entries={leaderboard} />}

                  {leaderboard.length === 0 ? (
                    <p className="text-gray-500">No scores yet.</p>
                  ) : (
                    <div className="mt-4">
                      <AvatarLeaderboard entries={leaderboard} showTime />
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </MotionConfig>
  );
}