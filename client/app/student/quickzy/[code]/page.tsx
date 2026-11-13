"use client";

import { useParams, useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/hooks";
import StudentLiveQuiz from "@/components/quiz/Studentlivequiz";

export default function StudentLiveQuizPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();

  const code = params.code;
  const role = useAppSelector((state) => state.role);

  const goDashboard = () => router.push("/student/dashboard");

  if (!/^\d{6}$/.test(code)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-5">
        <h1 className="text-xl font-bold text-red-500">Invalid room code</h1>
        <p className="text-gray-500">Room codes are exactly 6 digits.</p>
        <button
          onClick={goDashboard}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-white"
        >
          Go to Dashboard
        </button>
      </main>
    );
  }

  if (!role?.email || !role?.username) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-5">
        <h1 className="text-xl font-bold text-red-500">Student information is missing</h1>
        <p className="text-gray-500">Please log in again.</p>
        <button
          onClick={goDashboard}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-white"
        >
          Go to Dashboard
        </button>
      </main>
    );
  }

  return (
    <StudentLiveQuiz
      code={code}
      username={role.username}
      email={role.email}
      headerTitle="Live Quiz"
      exitLabel="Go to Dashboard"
      onExit={goDashboard}
    />
  );
}