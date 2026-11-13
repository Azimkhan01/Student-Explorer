"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { clearPlayer, loadPlayer, type QuizPlayer } from "@/components/quiz/player";
import StudentLiveQuiz from "@/components/quiz/Studentlivequiz";

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

export default function PublicLiveQuizPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();

  const code = params.code;
  const codeIsValid = /^\d{6}$/.test(code);

  // Identity entered on /quickzy
  const [player, setPlayer] = useState<QuizPlayer | null>(null);
  const [playerChecked, setPlayerChecked] = useState(false);

  // Load the saved identity; send people without one to the form.
  useEffect(() => {
    const saved = loadPlayer();
    setPlayer(saved);
    setPlayerChecked(true);

    if (!saved) {
      router.replace(`/quickzy?code=${encodeURIComponent(code)}`);
    }
  }, [code, router]);

  const leaveToJoinPage = (forgetPlayer: boolean) => {
    if (forgetPlayer) clearPlayer();
    router.push("/quickzy");
  };

  if (!playerChecked || !player) {
    return <Spinner label="Loading..." />;
  }

  if (!codeIsValid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-5">
        <h1 className="text-xl font-bold text-red-500">Invalid room code</h1>
        <p className="text-gray-500">Room codes are exactly 6 digits.</p>
        <button
          onClick={() => leaveToJoinPage(false)}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-white"
        >
          Enter a code
        </button>
      </main>
    );
  }

  return (
    <StudentLiveQuiz
      code={code}
      username={player.username}
      email={player.email}
      headerTitle={player.username}
      exitLabel="Join another quiz"
      onExit={() => leaveToJoinPage(false)}
      onChangeUser={() => leaveToJoinPage(false)}
      onChangeCode={() => leaveToJoinPage(false)}
    />
  );
}