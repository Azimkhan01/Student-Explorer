
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  ChartColumnIncreasing,
  Crown,
  Medal,
  RefreshCw,
  Search,
  Star,
  Trophy,
  User,
} from "lucide-react";

type LeaderboardStudent = {
  rank: number;
  username: string;
  marksObtained: number;
};

type StudentExam = {
  examId: number;
  examName: string;
  subjectName: string;
  examDate: string;
  maxMarks: number;
  className: string;
  academicYear: string;
  myResult: {
    marksObtained: number;
    remarks: string | null;
  } | null;
  rank: number | null;
  totalStudents: number;
  highestMarks: number;
  averageMarks: number;
  winner: {
    username: string;
    marksObtained: number;
  } | null;
  leaderboard: LeaderboardStudent[];
};

export default function StudentExamDashboard() {
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/server/student-exam-result/exam-results", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to fetch exam results.");
      }

      const data = await response.json();
      const examList = Array.isArray(data)
        ? data
        : data.exams ?? data.data?.exams ?? [];

      setExams(examList);

      setSelectedExamId((previous) => {
        if (examList.length === 0) return null;

        return examList.some(
          (exam: StudentExam) => exam.examId === previous
        )
          ? previous
          : examList[0].examId;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const selectedExam = useMemo(
    () => exams.find((exam) => exam.examId === selectedExamId) ?? null,
    [exams, selectedExamId]
  );

  const filteredLeaderboard = useMemo(() => {
    if (!selectedExam) return [];

    return selectedExam.leaderboard.filter((student) =>
      student.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [selectedExam, search]);

  const percentage =
    selectedExam?.myResult
      ? (selectedExam.myResult.marksObtained / selectedExam.maxMarks) * 100
      : 0;

  const getGrade = (value: number) => {
    if (value >= 90) return "A+";
    if (value >= 80) return "A";
    if (value >= 70) return "B";
    if (value >= 60) return "C";
    if (value >= 50) return "D";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="animate-spin" size={20} />
          Loading your exam results...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">{error}</p>
        <button
          onClick={fetchExams}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7 p-4 md:p-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">
            STUDENT PORTAL
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
            Exam Results
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your performance and compare your results with your classmates.
          </p>
        </div>

        <button
          onClick={fetchExams}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <BookOpen className="mx-auto text-gray-400" size={42} />
          <h2 className="mt-4 text-lg font-semibold text-gray-800">
            No exam results available
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Your exam results will appear here once they are published.
          </p>
        </div>
      ) : (
        <>
          {/* Exam selector */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Select examination
            </label>

            <select
              value={selectedExamId ?? ""}
              onChange={(e) => setSelectedExamId(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-500 sm:max-w-md"
            >
              {exams.map((exam) => (
                <option key={exam.examId} value={exam.examId}>
                  {exam.examName} — {exam.subjectName}
                </option>
              ))}
            </select>
          </div>

          {selectedExam && (
            <>
              {/* Exam information */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <p className="text-sm text-blue-100">EXAMINATION</p>
                    <h2 className="mt-2 text-2xl font-bold">
                      {selectedExam.examName}
                    </h2>
                    <p className="mt-1 text-blue-100">
                      {selectedExam.subjectName}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-blue-100">
                    <p className="flex items-center gap-2">
                      <CalendarDays size={16} />
                      {new Date(selectedExam.examDate).toLocaleDateString()}
                    </p>
                    <p className="flex items-center gap-2">
                      <BookOpen size={16} />
                      {selectedExam.className}
                    </p>
                    <p>{selectedExam.academicYear}</p>
                  </div>
                </div>
              </div>

              {/* Performance cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Your Marks</p>
                    <BookOpen className="text-blue-600" size={21} />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-gray-900">
                    {selectedExam.myResult
                      ? `${selectedExam.myResult.marksObtained}/${selectedExam.maxMarks}`
                      : "Pending"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Marks obtained
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Percentage</p>
                    <ChartColumnIncreasing className="text-green-600" size={21} />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-gray-900">
                    {selectedExam.myResult
                      ? `${percentage.toFixed(1)}%`
                      : "--"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedExam.myResult
                      ? `Grade: ${getGrade(percentage)}`
                      : "Result not published"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Your Rank</p>
                    <Medal className="text-amber-500" size={21} />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-gray-900">
                    {selectedExam.rank
                      ? `#${selectedExam.rank}`
                      : "--"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Out of {selectedExam.totalStudents} students
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Class Topper</p>
                    <Crown className="text-yellow-500" size={21} />
                  </div>
                  <p className="mt-3 truncate text-xl font-bold text-gray-900">
                    {selectedExam.winner?.username ?? "Not available"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedExam.winner
                      ? `${selectedExam.winner.marksObtained}/${selectedExam.maxMarks} marks`
                      : "No result published"}
                  </p>
                </div>
              </div>

              {/* My performance */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <div className="flex items-center gap-2">
                    <Star className="text-blue-600" size={20} />
                    <h3 className="font-bold text-gray-900">
                      Your Performance
                    </h3>
                  </div>

                  {selectedExam.myResult ? (
                    <>
                      <div className="mt-6 flex items-end justify-between">
                        <div>
                          <p className="text-sm text-gray-500">
                            Marks achieved
                          </p>
                          <p className="mt-1 text-3xl font-bold text-gray-900">
                            {selectedExam.myResult.marksObtained}
                            <span className="text-lg text-gray-400">
                              /{selectedExam.maxMarks}
                            </span>
                          </p>
                        </div>
                        <p className="text-lg font-bold text-blue-600">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>

                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(0, percentage))}%`,
                          }}
                        />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Class average</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {selectedExam.averageMarks.toFixed(1)} marks
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Highest marks</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {selectedExam.highestMarks} marks
                          </p>
                        </div>
                      </div>

                      {selectedExam.myResult.remarks && (
                        <div className="mt-5 rounded-xl bg-blue-50 p-4">
                          <p className="text-xs font-semibold uppercase text-blue-700">
                            Teacher's remarks
                          </p>
                          <p className="mt-1 text-sm text-blue-900">
                            {selectedExam.myResult.remarks}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-5 text-sm text-gray-500">
                      Your result has not been published yet.
                    </p>
                  )}
                </div>

                {/* Winner card */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                  <Trophy className="text-amber-500" size={30} />
                  <p className="mt-4 text-sm font-medium text-amber-800">
                    EXAM TOPPER
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-gray-900">
                    {selectedExam.winner?.username ?? "Not available"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {selectedExam.winner
                      ? `${selectedExam.winner.marksObtained} marks secured`
                      : "Winner will appear when results are published."}
                  </p>
                  <div className="mt-5 border-t border-amber-200 pt-4">
                    <p className="text-xs text-gray-500">
                      Total students evaluated
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {selectedExam.totalStudents}
                    </p>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="flex items-center gap-2 font-bold text-gray-900">
                      <Award className="text-amber-500" size={21} />
                      Class Leaderboard
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Top-performing students in this examination.
                    </p>
                  </div>

                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search student..."
                      className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-60"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[550px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-4">Rank</th>
                        <th className="px-5 py-4">Student</th>
                        <th className="px-5 py-4">Marks</th>
                        <th className="px-5 py-4">Percentage</th>
                        <th className="px-5 py-4">Position</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {filteredLeaderboard.map((student) => {
                        const studentPercentage =
                          (student.marksObtained / selectedExam.maxMarks) * 100;

                        const isWinner = student.rank === 1;

                        return (
                          <tr
                            key={`${student.rank}-${student.username}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-5 py-4 font-bold text-gray-700">
                              {student.rank === 1 ? (
                                <span className="flex items-center gap-2 text-amber-600">
                                  <Crown size={17} /> 1
                                </span>
                              ) : (
                                `#${student.rank}`
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                                  <User size={17} />
                                </div>
                                <span className="font-medium text-gray-900">
                                  {student.username}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 font-semibold text-gray-900">
                              {student.marksObtained}/{selectedExam.maxMarks}
                            </td>

                            <td className="px-5 py-4 text-gray-600">
                              {studentPercentage.toFixed(1)}%
                            </td>

                            <td className="px-5 py-4">
                              {isWinner ? (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                  Winner
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  {student.rank === 2
                                    ? "Runner-up"
                                    : student.rank === 3
                                      ? "Third"
                                      : "Participant"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredLeaderboard.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 py-10 text-center text-gray-500"
                          >
                            No students found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
