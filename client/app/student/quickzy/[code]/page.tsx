"use client";

import { useSocket } from "@/context/SocketContext";
import { useAppSelector } from "@/redux/hooks";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  AnimatedNumber,
  Confetti,
  CountdownRing,
  Leaderboard,
  Podium,
  type LeaderboardEntry,
} from "@/components/quiz/QuizMotion";

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
}

const optionContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const optionItem = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function StudentLiveQuizPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();

  const code = params.code;
  const role = useAppSelector((state) => state.role);

  const { socket, isConnected } = useSocket();

  const [isJoining, setIsJoining] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [pageError, setPageError] = useState("");

  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomEnded, setRoomEnded] = useState(false);

  const [liveQuestion, setLiveQuestion] = useState<LiveQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(
    null,
  );

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [questionEnded, setQuestionEnded] = useState(false);

  const [answerFeedback, setAnswerFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [earnedMarks, setEarnedMarks] = useState(0);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [testFinished, setTestFinished] = useState(false);

  // --------------------------------
  // JOIN ROOM
  // --------------------------------

  const joinRoom = useCallback(() => {
    if (!socket || !socket.connected) return;

    if (!/^\d{6}$/.test(code)) {
      setPageError("Invalid room code.");
      setIsJoining(false);
      return;
    }

    if (!role?.email || !role?.username) {
      setPageError("Student information is missing. Please log in again.");
      setIsJoining(false);
      return;
    }

    setIsJoining(true);
    setPageError("");

    socket.emit("join-room", {
      code: Number(code),
      email: role.email,
      username: role.username,
    });
  }, [socket, code, role?.email, role?.username]);

  // --------------------------------
  // SOCKET EVENTS
  // --------------------------------

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (data: { roomId: string; code: number }) => {
      setRoomId(data.roomId);
      setIsJoined(true);
      setIsJoining(false);
      setPageError("");
    };

    const handleRoomError = (data: { message?: string }) => {
      setPageError(data?.message || "Unable to join room.");
      setIsJoining(false);
      setIsJoined(false);
    };

    const handleQuestionStarted = (data: LiveQuestion) => {
      setLiveQuestion(data);
      setSelectedOption(null);
      setCorrectOptionIndex(null);
      setHasSubmitted(false);
      setQuestionEnded(false);
      setAnswerFeedback("");
      setIsCorrect(null);
      setEarnedMarks(0);
    };

    const handleAnswerResult = (data: {
      isCorrect: boolean;
      earnedMarks: number;
      responseTimeMs: number;
      message: string;
    }) => {
      setHasSubmitted(true);
      setIsCorrect(data.isCorrect);
      setEarnedMarks(data.earnedMarks);
      setAnswerFeedback(
        `${data.message} Response time: ${(data.responseTimeMs / 1000).toFixed(2)} seconds.`,
      );
    };

    const handleAnswerError = (data: { message?: string }) => {
      setAnswerFeedback(data?.message || "Unable to submit answer.");
    };

    // The server already sends correctOptionIndex to the whole room.
    const handleQuestionEnded = (data: { correctOptionIndex?: number }) => {
      setQuestionEnded(true);
      if (typeof data?.correctOptionIndex === "number") {
        setCorrectOptionIndex(data.correctOptionIndex);
      }
    };

    const handleLeaderboard = (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    };

    const handleTestFinished = (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
      setTestFinished(true);
      setQuestionEnded(true);
    };

    const handleRoomEnded = (data: { message?: string }) => {
      setRoomEnded(true);
      setPageError(data?.message || "The teacher has closed this room.");
    };

    socket.on("room-joined", handleRoomJoined);
    socket.on("room-error", handleRoomError);
    socket.on("question-started", handleQuestionStarted);
    socket.on("answer-result", handleAnswerResult);
    socket.on("answer-error", handleAnswerError);
    socket.on("question-ended", handleQuestionEnded);
    socket.on("leaderboard-updated", handleLeaderboard);
    socket.on("test-finished", handleTestFinished);
    socket.on("room-ended", handleRoomEnded);

    if (isConnected) {
      joinRoom();
    } else {
      setIsJoining(true);
      setIsJoined(false);
    }

    return () => {
      socket.off("room-joined", handleRoomJoined);
      socket.off("room-error", handleRoomError);
      socket.off("question-started", handleQuestionStarted);
      socket.off("answer-result", handleAnswerResult);
      socket.off("answer-error", handleAnswerError);
      socket.off("question-ended", handleQuestionEnded);
      socket.off("leaderboard-updated", handleLeaderboard);
      socket.off("test-finished", handleTestFinished);
      socket.off("room-ended", handleRoomEnded);
    };
  }, [socket, isConnected, joinRoom]);

  // --------------------------------
  // QUESTION TIMER
  // --------------------------------

  useEffect(() => {
    if (!liveQuestion || questionEnded || testFinished) return;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((liveQuestion.endsAt - Date.now()) / 1000),
      );

      setRemainingSeconds(remaining);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 250);

    return () => clearInterval(interval);
  }, [liveQuestion, questionEnded, testFinished]);

  // --------------------------------
  // SUBMIT ANSWER
  // --------------------------------

  const submitAnswer = () => {
    if (!socket || !liveQuestion) return;

    if (selectedOption === null) {
      setAnswerFeedback("Please select an answer first.");
      return;
    }

    if (hasSubmitted || questionEnded || remainingSeconds <= 0) {
      return;
    }

    setHasSubmitted(true);
    setAnswerFeedback("Submitting your answer...");

    socket.emit("submit-answer", {
      questionIndex: liveQuestion.questionIndex,
      selectedOptionIndex: selectedOption,
    });
  };

  // Prefer socket id (usernames can repeat); fall back to username.
  const me =
    leaderboard.find((s) => s.socketId === socket?.id) ??
    leaderboard.find((s) => s.username === role?.username);

  // --------------------------------
  // ROOM CLOSED
  // --------------------------------

  if (roomEnded) {
    return (
      <MotionConfig reducedMotion="user">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-5">
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            className="rounded-full bg-red-100 p-5 text-3xl text-red-600"
          >
            ✕
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-red-500"
          >
            Room Closed
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-md text-center text-gray-500"
          >
            {pageError}
          </motion.p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/student/dashboard")}
            className="rounded-lg bg-indigo-600 px-5 py-3 text-white"
          >
            Go to Dashboard
          </motion.button>
        </main>
      </MotionConfig>
    );
  }

  // --------------------------------
  // CONNECTION / JOINING
  // --------------------------------

  if (!isConnected || isJoining) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <motion.div
            className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
          <motion.p
            key={isConnected ? "joining" : "connecting"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isConnected ? "Joining live quiz..." : "Connecting to server..."}
          </motion.p>
        </div>
      </main>
    );
  }

  if (pageError && !isJoined) {
    return (
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-screen flex-col items-center justify-center gap-4"
      >
        <h1 className="text-xl font-bold text-red-500">Unable to join room</h1>

        <p className="text-gray-500">{pageError}</p>

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
      </motion.main>
    );
  }

  // --------------------------------
  // FINAL RESULT
  // --------------------------------

  if (testFinished) {
    return (
      <MotionConfig reducedMotion="user">
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
              transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.2 }}
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
                transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 18 }}
                className="mt-6 rounded-xl bg-indigo-50 p-5"
              >
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
            <Podium entries={leaderboard} />
            <div className="mt-6">
              <Leaderboard
                entries={leaderboard}
                highlightId={socket?.id}
                highlightName={role?.username}
                showTime
              />
            </div>
          </section>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/student/dashboard")}
            className="rounded-lg bg-indigo-600 px-5 py-3 text-white"
          >
            Go to Dashboard
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
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-5">
          <div className="relative flex h-24 w-24 items-center justify-center">
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute h-full w-full rounded-full bg-green-400"
                initial={{ scale: 0.6, opacity: 0.4 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, delay: i, ease: "easeOut" }}
              />
            ))}
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <motion.path
                  d="M5 13l4 4L19 7"
                  stroke="#16a34a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
              </svg>
            </div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-green-600"
          >
            Successfully joined!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-500"
          >
            Room code: <span className="font-bold tracking-widest">{code}</span>
          </motion.p>

          <p className="flex items-center gap-2 text-center text-gray-500">
            Waiting for the teacher to start the live test
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-gray-400"
                animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </p>

          <p className="text-sm text-gray-400">
            <AnimatedNumber value={leaderboard.length} /> participants in the room
          </p>
        </main>
      </MotionConfig>
    );
  }

  // --------------------------------
  // LIVE QUESTION
  // --------------------------------

  const locked = hasSubmitted || questionEnded || remainingSeconds <= 0;

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Live Quiz</h1>
            <p className="text-sm text-gray-500">Room {code}</p>
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

            <CountdownRing
              remaining={remainingSeconds}
              total={liveQuestion.durationSeconds}
              ended={questionEnded}
              size={72}
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

            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className="h-full rounded-full bg-indigo-500"
                initial={false}
                animate={{
                  width: `${((liveQuestion.questionIndex + 1) / liveQuestion.totalQuestions) * 100}%`,
                }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>

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
                  style = "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-300";
                else if (showWrong)
                  style = "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-300";
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
                                opacity: questionEnded && !isSelected ? 0.5 : 1,
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
                  animate={{ opacity: selectedOption === null ? 0.5 : 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={selectedOption === null ? undefined : { scale: 1.02 }}
                  whileTap={selectedOption === null ? undefined : { scale: 0.97 }}
                  onClick={submitAnswer}
                  disabled={selectedOption === null || remainingSeconds <= 0}
                  className="mt-6 w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white"
                >
                  Submit Answer
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {answerFeedback && (
                <motion.div
                  key={answerFeedback}
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={
                    isCorrect === false
                      ? { opacity: 1, scale: 1, y: 0, x: [0, -8, 8, -6, 6, 0] }
                      : { opacity: 1, scale: 1, y: 0, x: 0 }
                  }
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`mt-5 rounded-lg p-4 ${
                    isCorrect === true
                      ? "bg-green-50 text-green-700"
                      : isCorrect === false
                        ? "bg-red-50 text-red-700"
                        : "bg-gray-50 text-gray-600"
                  }`}
                >
                  {answerFeedback}
                  {isCorrect && (
                    <motion.p
                      initial={{ opacity: 0, scale: 0.4, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.15 }}
                      className="mt-1 text-lg font-bold"
                    >
                      +{earnedMarks} marks
                    </motion.p>
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

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">Live Leaderboard</h2>

          {leaderboard.length === 0 ? (
            <p className="text-gray-500">Scores will appear here.</p>
          ) : (
            <Leaderboard
              entries={leaderboard}
              highlightId={socket?.id}
              highlightName={role?.username}
            />
          )}
        </section>
      </main>
    </MotionConfig>
  );
}