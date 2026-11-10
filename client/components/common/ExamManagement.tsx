
"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Search,
  RefreshCw,
  Save,
  ClipboardList,
  CheckCircle2,
  Clock,
  BookOpen,
  CalendarDays,
  Users,
  AlertCircle,
  FileCheck,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

type ExamOption = {
  id: number;
  examName: string;
  examDate: string;
  maxMarks: number;

  classSubject?: {
    id: number;

    class?: {
      standard?: string;
      division?: string | null;
    };

    subject?: {
      subjectName?: string;
    };

    academicYear?: {
      yearName?: string;
    };
  };
};

type StudentResult = {
  studentId: number;
  username: string;
  email: string;
  resultId: number | null;
  marksObtained: number | null;
  remarks: string;
  isSubmitted: boolean;
};

type ExamDetails = {
  id: number;
  examName: string;
  examDate: string;
  maxMarks: number;
  classSubjectId: number;
  className: string;
  subjectName: string;
  academicYear: string;
};

type ExamResultsResponse = {
  exam: ExamDetails;
  totalStudents?: number;
  students: StudentResult[];
};

type Props = {
  role: "admin" | "teacher";
};

// ============================================
// HELPERS
// ============================================

const extractExamList = (data: any): ExamOption[] => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.exams)) return data.exams;

  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.data?.exams)) {
    return data.data.exams;
  }

  return [];
};

const getErrorMessage = (
  data: any,
  fallback: string,
): string => {
  if (Array.isArray(data?.message)) {
    return data.message.join(", ");
  }

  return data?.message || fallback;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ExamResultManagement({
  role,
}: Props) {
  // ------------------------------------------
  // STATES
  // ------------------------------------------

  const [exams, setExams] = useState<ExamOption[]>([]);

  const [selectedExamId, setSelectedExamId] =
    useState("");

  const [examDetails, setExamDetails] =
    useState<ExamDetails | null>(null);

  const [students, setStudents] =
    useState<StudentResult[]>([]);

  const [search, setSearch] = useState("");

  const [loadingExams, setLoadingExams] =
    useState(true);

  const [loadingResults, setLoadingResults] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // ------------------------------------------
  // FETCH EXAMS
  // ------------------------------------------

  const fetchExams = useCallback(async () => {
    try {
      setLoadingExams(true);
      setError("");

      const response = await fetch("/server/exams", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to fetch exams"),
        );
      }

      const examList = extractExamList(data);

      setExams(examList);

      setSelectedExamId((previousId) => {
        if (examList.length === 0) return "";

        const previousExists = examList.some(
          (exam) => String(exam.id) === previousId,
        );

        return previousExists
          ? previousId
          : String(examList[0].id);
      });

    } catch (err) {
      console.error("Fetch exams error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to fetch exams",
      );

      setExams([]);
      setSelectedExamId("");

    } finally {
      setLoadingExams(false);
    }
  }, []);

  // ------------------------------------------
  // FETCH RESULTS
  // ------------------------------------------

  const fetchResults = useCallback(
    async (
      examId: string,
      signal?: AbortSignal,
    ) => {
      if (!examId) return;

      try {
        setLoadingResults(true);
        setError("");

        const response = await fetch(
          `/server/exam-results/exam/${examId}`,
          {
            method: "GET",
            credentials: "include",
            signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              "Unable to load exam results",
            ),
          );
        }

        const resultData =
          data as ExamResultsResponse;

        setExamDetails(resultData.exam ?? null);

        setStudents(
          Array.isArray(resultData.students)
            ? resultData.students
            : [],
        );

      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error("Fetch results error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load results",
        );

        setStudents([]);
        setExamDetails(null);

      } finally {
        if (!signal?.aborted) {
          setLoadingResults(false);
        }
      }
    },
    [],
  );

  // ------------------------------------------
  // INITIAL EXAM FETCH
  // ------------------------------------------

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // ------------------------------------------
  // FETCH RESULTS WHEN EXAM CHANGES
  // ------------------------------------------

  useEffect(() => {
    if (!selectedExamId) {
      setExamDetails(null);
      setStudents([]);
      setLoadingResults(false);
      return;
    }

    const controller = new AbortController();

    fetchResults(
      selectedExamId,
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [selectedExamId, fetchResults]);

  // ------------------------------------------
  // UPDATE STUDENT DATA
  // ------------------------------------------

  const updateStudent = (
    studentId: number,
    field: "marksObtained" | "remarks",
    value: string,
  ) => {
    setStudents((previous) =>
      previous.map((student) => {
        if (student.studentId !== studentId) {
          return student;
        }

        if (field === "marksObtained") {
          return {
            ...student,
            marksObtained:
              value === "" ? null : Number(value),
          };
        }

        return {
          ...student,
          remarks: value,
        };
      }),
    );
  };

  // ------------------------------------------
  // SAVE RESULTS
  // ------------------------------------------

  const saveResults = async () => {
    if (!examDetails || !selectedExamId || saving) {
      return;
    }

    setError("");
    setSuccess("");

    const enteredStudents = students.filter(
      (student) => student.marksObtained !== null,
    );

    if (enteredStudents.length === 0) {
      setError(
        "Please enter marks for at least one student.",
      );
      return;
    }

    // Validate marks
    const invalidStudent = enteredStudents.find(
      (student) =>
        !Number.isInteger(student.marksObtained) ||
        student.marksObtained! < 0 ||
        student.marksObtained! > examDetails.maxMarks,
    );

    if (invalidStudent) {
      setError(
        `Enter valid marks between 0 and ${examDetails.maxMarks} for every student.`,
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/server/exam-results/exam/${selectedExamId}/bulk`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            results: enteredStudents.map((student) => ({
              studentId: student.studentId,
              marksObtained: student.marksObtained,
              remarks: student.remarks.trim(),
            })),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to save results",
          ),
        );
      }

      setSuccess(
        `${data.updatedCount ?? enteredStudents.length} student results saved successfully.`,
      );

      // Reload saved results
      await fetchResults(selectedExamId);

    } catch (err) {
      console.error("Save results error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save results",
      );

    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------
  // FILTER STUDENTS
  // ------------------------------------------

  const filteredStudents = (
    Array.isArray(students) ? students : []
  ).filter((student) => {
    const query = search.toLowerCase().trim();

    return (
      student.username?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    );
  });

  // ------------------------------------------
  // STATISTICS
  // ------------------------------------------

  const submittedCount = students.filter(
    (student) => student.isSubmitted,
  ).length;

  const pendingCount =
    students.length - submittedCount;

  const completionPercentage =
    students.length > 0
      ? Math.round(
          (submittedCount / students.length) * 100,
        )
      : 0;

  // ------------------------------------------
  // LOADING SCREEN
  // ------------------------------------------

  if (loadingExams) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3">
        <RefreshCw
          size={30}
          className="animate-spin text-blue-600"
        />

        <p className="text-sm font-medium text-gray-500">
          Loading examinations...
        </p>
      </div>
    );
  }

  // ============================================
  // UI
  // ============================================

  return (
    <div className="space-y-6">

      {/* ================================== */}
      {/* HEADER */}
      {/* ================================== */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-100 p-2.5">
              <ClipboardList
                size={23}
                className="text-blue-700"
              />
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              Exam Result Management
            </h1>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            {role === "admin"
              ? "Manage examination results across all classes."
              : "Enter and manage results for your assigned classes."}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchExams}
          disabled={saving || loadingExams}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loadingExams ? "animate-spin" : ""}
          />

          Refresh
        </button>
      </div>

      {/* ================================== */}
      {/* ERROR MESSAGE */}
      {/* ================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>{error}</p>
        </div>
      )}

      {/* ================================== */}
      {/* SUCCESS MESSAGE */}
      {/* ================================== */}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">

          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>{success}</p>
        </div>
      )}

      {/* ================================== */}
      {/* EXAM SELECTOR */}
      {/* ================================== */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

        <div className="mb-4 flex items-center gap-2">
          <BookOpen
            size={19}
            className="text-blue-600"
          />

          <h2 className="font-semibold text-gray-900">
            Select Examination
          </h2>
        </div>

        <select
          value={selectedExamId}
          disabled={saving}
          onChange={(event) => {
            setSelectedExamId(event.target.value);
            setSuccess("");
            setError("");
            setSearch("");
          }}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
        >
          <option value="">
            Select an examination
          </option>

          {exams.map((exam) => (
            <option
              key={exam.id}
              value={String(exam.id)}
            >
              {exam.examName} —{" "}
              {exam.classSubject?.class?.standard ??
                "Class"}
              {exam.classSubject?.class?.division
                ? ` - ${exam.classSubject.class.division}`
                : ""}
              {" / "}
              {exam.classSubject?.subject?.subjectName ??
                "Subject"}
              {" / "}
              {exam.classSubject?.academicYear?.yearName ??
                "Academic Year"}
            </option>
          ))}
        </select>

        {exams.length === 0 && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center">
            <ClipboardList
              size={28}
              className="mx-auto text-gray-300"
            />

            <p className="mt-2 text-sm font-medium text-gray-600">
              No examinations available
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Create an examination before entering student results.
            </p>
          </div>
        )}
      </div>

      {/* ================================== */}
      {/* EXAM DETAILS AND STATISTICS */}
      {/* ================================== */}

      {examDetails && (
        <>

          {/* EXAM INFORMATION */}

          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow-sm">

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

              <div>
                <p className="text-sm text-blue-100">
                  Currently selected examination
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {examDetails.examName}
                </h2>

                <p className="mt-2 text-sm text-blue-100">
                  {examDetails.className}
                  {" · "}
                  {examDetails.subjectName}
                  {" · "}
                  {examDetails.academicYear}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-3">

                <CalendarDays size={19} />

                <span className="text-sm font-medium">
                  {new Date(
                    examDetails.examDate,
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* STATISTICS CARDS */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* MAX MARKS */}

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Maximum Marks
                  </p>

                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {examDetails.maxMarks}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-3">
                  <BookOpen
                    size={22}
                    className="text-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* TOTAL STUDENTS */}

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Total Students
                  </p>

                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {students.length}
                  </p>
                </div>

                <div className="rounded-xl bg-purple-50 p-3">
                  <Users
                    size={22}
                    className="text-purple-600"
                  />
                </div>
              </div>
            </div>

            {/* SUBMITTED */}

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Results Entered
                  </p>

                  <p className="mt-2 text-3xl font-bold text-green-600">
                    {submittedCount}
                  </p>
                </div>

                <div className="rounded-xl bg-green-50 p-3">
                  <FileCheck
                    size={22}
                    className="text-green-600"
                  />
                </div>
              </div>
            </div>

            {/* PENDING */}

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Pending
                  </p>

                  <p className="mt-2 text-3xl font-bold text-orange-600">
                    {pendingCount}
                  </p>
                </div>

                <div className="rounded-xl bg-orange-50 p-3">
                  <Clock
                    size={22}
                    className="text-orange-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ================================== */}
          {/* COMPLETION PROGRESS */}
          {/* ================================== */}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

            <div className="mb-3 flex items-center justify-between">

              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Result Completion
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Students whose result records have been saved
                </p>
              </div>

              <span className="text-lg font-bold text-blue-600">
                {completionPercentage}%
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">

              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${completionPercentage}%`,
                }}
              />
            </div>
          </div>

          {/* ================================== */}
          {/* STUDENT RESULTS TABLE */}
          {/* ================================== */}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            {/* TABLE HEADER */}

            <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 lg:flex-row lg:items-center">

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Student Results
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Enter marks and remarks for enrolled students.
                </p>
              </div>

              {/* SEARCH */}

              <div className="relative w-full lg:w-72">

                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search students..."
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* LOADING */}

            {loadingResults ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3">

                <RefreshCw
                  size={28}
                  className="animate-spin text-blue-600"
                />

                <p className="text-sm text-gray-500">
                  Loading student results...
                </p>
              </div>
            ) : students.length === 0 ? (

              /* EMPTY STUDENTS */

              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">

                <div className="rounded-full bg-gray-100 p-4">
                  <ClipboardList
                    size={32}
                    className="text-gray-400"
                  />
                </div>

                <h3 className="mt-4 font-semibold text-gray-800">
                  No enrolled students found
                </h3>

                <p className="mt-1 max-w-sm text-sm text-gray-500">
                  There are no students enrolled in this examination's class and academic year.
                </p>
              </div>

            ) : (

              <>
                {/* TABLE */}

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[800px] text-left text-sm">

                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">

                      <tr>
                        <th className="px-5 py-4">
                          Student
                        </th>

                        <th className="px-5 py-4">
                          Marks Obtained
                        </th>

                        <th className="px-5 py-4">
                          Remarks
                        </th>

                        <th className="px-5 py-4">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">

                      {filteredStudents.map((student) => (

                        <tr
                          key={student.studentId}
                          className="transition hover:bg-blue-50/40"
                        >

                          {/* STUDENT */}

                          <td className="px-5 py-4">

                            <p className="font-semibold text-gray-900">
                              {student.username}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {student.email}
                            </p>
                          </td>

                          {/* MARKS */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2">

                              <input
                                type="number"
                                min={0}
                                max={examDetails.maxMarks}
                                step={1}
                                value={
                                  student.marksObtained ?? ""
                                }
                                onChange={(event) => {
                                  const value =
                                    event.target.value;

                                  if (value === "") {
                                    updateStudent(
                                      student.studentId,
                                      "marksObtained",
                                      "",
                                    );
                                    return;
                                  }

                                  const number = Number(value);

                                  if (
                                    !Number.isFinite(number)
                                  ) {
                                    return;
                                  }

                                  updateStudent(
                                    student.studentId,
                                    "marksObtained",
                                    value,
                                  );
                                }}
                                placeholder="Enter marks"
                                className="w-28 rounded-lg border border-gray-200 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />

                              <span className="text-xs font-medium text-gray-400">
                                / {examDetails.maxMarks}
                              </span>
                            </div>
                          </td>

                          {/* REMARKS */}

                          <td className="px-5 py-4">

                            <input
                              type="text"
                              maxLength={255}
                              value={student.remarks ?? ""}
                              onChange={(event) =>
                                updateStudent(
                                  student.studentId,
                                  "remarks",
                                  event.target.value,
                                )
                              }
                              placeholder="Optional remarks"
                              className="w-52 rounded-lg border border-gray-200 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">

                            {student.isSubmitted ? (

                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">

                                <CheckCircle2 size={13} />

                                Submitted
                              </span>

                            ) : (

                              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">

                                <Clock size={13} />

                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>

                {/* NO SEARCH RESULTS */}

                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center">

                    <Search
                      size={28}
                      className="mx-auto text-gray-300"
                    />

                    <p className="mt-3 text-sm font-medium text-gray-700">
                      No students match your search.
                    </p>
                  </div>
                )}

                {/* ================================== */}
                {/* TABLE FOOTER */}
                {/* ================================== */}

                <div className="flex flex-col justify-between gap-4 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:items-center">

                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {filteredStudents.length} of {students.length} students
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Saving will add new results and update existing results.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={saveResults}
                    disabled={
                      saving ||
                      loadingResults ||
                      students.length === 0
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={17} />
                    )}

                    {saving
                      ? "Saving Results..."
                      : "Save Results"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ================================== */}
      {/* NO EXAM SELECTED */}
      {/* ================================== */}

      {!examDetails &&
        !loadingResults &&
        exams.length > 0 &&
        selectedExamId === "" && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">

            <ClipboardList
              size={40}
              className="mx-auto text-gray-300"
            />

            <h3 className="mt-4 font-semibold text-gray-800">
              Select an examination
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Choose an examination above to manage student results.
            </p>
          </div>
        )}

    </div>
  );
}
