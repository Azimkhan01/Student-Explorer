
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock,
  Eye,
  FileQuestion,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

// ---------------------------------------------
// TYPES
// ---------------------------------------------

interface QnA {
  id?: string;
  quickzy_id?: string;
  question: string;
  options: string[];
  correct_answer: number;
  marks: number;
}

interface Quickzy {
  id: string;
  quickzy_name: string;
  teacher_id?: number;
  questions: QnA[];
  created_at?: string;
}

type ModalMode = "view" | "edit" | null;

// ---------------------------------------------
// HELPERS
// ---------------------------------------------

const API_URL = "/server/quickzy";

const emptyQuestion = (): QnA => ({
  question: "",
  options: ["", "", "", ""],
  correct_answer: -1,
  marks: 1,
});

async function getErrorMessage(response: Response) {
  try {
    const result = await response.json();

    if (Array.isArray(result.message)) {
      return result.message.join(", ");
    }

    return (
      result.message ||
      result.error ||
      `Request failed (${response.status})`
    );
  } catch {
    return `Request failed (${response.status})`;
  }
}

// Supports either a direct response or a { data: ... } wrapper.
function unwrapResponse<T>(result: unknown): T {
  if (
    result &&
    typeof result === "object" &&
    "data" in result
  ) {
    return (result as { data: T }).data;
  }

  return result as T;
}

function normalizeQuickzy(item: Quickzy): Quickzy {
  return {
    ...item,
    questions: Array.isArray(item.questions)
      ? item.questions.map((question) => ({
          ...question,
          options: Array.isArray(question.options)
            ? question.options
            : [],
          marks: question.marks ?? 1,
        }))
      : [],
  };
}

// ---------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------

export default function TeacherQuickzyPage() {
  const [quickzies, setQuickzies] = useState<Quickzy[]>([]);
  console.log(quickzies);
  
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedQuickzy, setSelectedQuickzy] =
    useState<Quickzy | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [formData, setFormData] = useState<Quickzy | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [modalError, setModalError] = useState("");

  // ---------------------------------------------
  // FETCH ALL QUICKZIES
  // ---------------------------------------------

  const fetchQuickzies = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result: unknown = await response.json();
      const data = unwrapResponse<Quickzy[]>(result);

      if (!Array.isArray(data)) {
        throw new Error("Invalid Quickzy response from server.");
      }

      setQuickzies(data.map(normalizeQuickzy));
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load Quickzies."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuickzies();
  }, [fetchQuickzies]);

  // ---------------------------------------------
  // FETCH SINGLE QUICKZY
  // ---------------------------------------------

  const openQuickzy = async (
    id: string,
    mode: Exclude<ModalMode, null>
  ) => {
    setModalError("");
    setSuccessMessage("");

    if (mode === "edit") {
      setIsSaving(false);
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result: unknown = await response.json();
      const data = normalizeQuickzy(
        unwrapResponse<Quickzy>(result)
      );

      setSelectedQuickzy(data);
      setFormData({
        ...data,
        questions: data.questions.map((question) => ({
          ...question,
          options: [...question.options],
        })),
      });

      setModalMode(mode);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load this Quickzy."
      );
    }
  };

  // ---------------------------------------------
  // CLOSE MODAL
  // ---------------------------------------------

  const closeModal = () => {
    if (isSaving) return;

    setModalMode(null);
    setSelectedQuickzy(null);
    setFormData(null);
    setModalError("");
  };

  // ---------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------

  const updateQuizName = (value: string) => {
    setFormData((previous) =>
      previous
        ? { ...previous, quickzy_name: value }
        : previous
    );
  };

  const updateQuestion = (
    index: number,
    field: keyof QnA,
    value: string | number
  ) => {
    setFormData((previous) => {
      if (!previous) return previous;

      const questions = [...previous.questions];

      questions[index] = {
        ...questions[index],
        [field]: value,
      };

      return { ...previous, questions };
    });
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    setFormData((previous) => {
      if (!previous) return previous;

      const questions = [...previous.questions];
      const options = [...questions[questionIndex].options];

      options[optionIndex] = value;

      questions[questionIndex] = {
        ...questions[questionIndex],
        options,
      };

      return { ...previous, questions };
    });
  };

  const addQuestion = () => {
    setFormData((previous) =>
      previous
        ? {
            ...previous,
            questions: [
              ...previous.questions,
              emptyQuestion(),
            ],
          }
        : previous
    );
  };

  const removeQuestion = (index: number) => {
    setFormData((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        questions: previous.questions.filter(
          (_, questionIndex) => questionIndex !== index
        ),
      };
    });
  };

  const addOption = (questionIndex: number) => {
    setFormData((previous) => {
      if (!previous) return previous;

      const questions = [...previous.questions];

      questions[questionIndex] = {
        ...questions[questionIndex],
        options: [...questions[questionIndex].options, ""],
      };

      return { ...previous, questions };
    });
  };

  const removeOption = (
    questionIndex: number,
    optionIndex: number
  ) => {
    setFormData((previous) => {
      if (!previous) return previous;

      const questions = [...previous.questions];
      const question = questions[questionIndex];

      if (question.options.length <= 2) return previous;

      const options = question.options.filter(
        (_, index) => index !== optionIndex
      );

      let correctAnswer = question.correct_answer;

      if (correctAnswer === optionIndex) {
        correctAnswer = -1;
      } else if (correctAnswer > optionIndex) {
        correctAnswer -= 1;
      }

      questions[questionIndex] = {
        ...question,
        options,
        correct_answer: correctAnswer,
      };

      return { ...previous, questions };
    });
  };

  // ---------------------------------------------
  // VALIDATION
  // ---------------------------------------------

  const validateForm = (data: Quickzy): string | null => {
    if (!data.quickzy_name.trim()) {
      return "Please enter a Quickzy name.";
    }

    if (!data.questions.length) {
      return "Add at least one question.";
    }

    for (let i = 0; i < data.questions.length; i++) {
      const question = data.questions[i];
      const questionNumber = i + 1;

      if (!question.question.trim()) {
        return `Question ${questionNumber} cannot be empty.`;
      }

      if (question.options.length < 2) {
        return `Question ${questionNumber} needs at least two options.`;
      }

      if (question.options.some((option) => !option.trim())) {
        return `Please fill in all options for question ${questionNumber}.`;
      }

      const uniqueOptions = new Set(
        question.options.map((option) =>
          option.trim().toLowerCase()
        )
      );

      if (uniqueOptions.size !== question.options.length) {
        return `Duplicate options found in question ${questionNumber}.`;
      }

      if (
        !Number.isInteger(question.correct_answer) ||
        question.correct_answer < 0 ||
        question.correct_answer >= question.options.length
      ) {
        return `Select a correct answer for question ${questionNumber}.`;
      }

      if (
        !Number.isInteger(Number(question.marks)) ||
        Number(question.marks) < 1
      ) {
        return `Question ${questionNumber} must have at least 1 mark.`;
      }
    }

    return null;
  };

  // ---------------------------------------------
  // UPDATE QUICKZY
  // ---------------------------------------------

  const handleUpdate = async () => {
    if (!formData) return;

    setModalError("");

    const validationError = validateForm(formData);

    if (validationError) {
      setModalError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        quickzy_name: formData.quickzy_name.trim(),
        questions: formData.questions.map((question) => ({
          question: question.question.trim(),
          options: question.options.map((option) =>
            option.trim()
          ),
          correct_answer: question.correct_answer,
          marks: Number(question.marks),
        })),
      };

      const response = await fetch(
        `${API_URL}/${formData.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result: unknown = await response.json();
      const updated = normalizeQuickzy(
        unwrapResponse<Quickzy>(result)
      );

      setSelectedQuickzy(updated);
      setFormData(updated);
      setModalMode("view");
      setSuccessMessage("Quickzy updated successfully.");

      await fetchQuickzies();
    } catch (error) {
      setModalError(
        error instanceof Error
          ? error.message
          : "Unable to update Quickzy."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------
  // DELETE QUICKZY
  // ---------------------------------------------

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this Quickzy? All its questions will also be deleted. This action cannot be undone."
    );

    if (!confirmed) return;

    setIsDeleting(id);
    setPageError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setQuickzies((previous) =>
        previous.filter((item) => item.id !== id)
      );

      if (selectedQuickzy?.id === id) {
        closeModal();
      }

      setSuccessMessage("Quickzy deleted successfully.");
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to delete Quickzy."
      );
    } finally {
      setIsDeleting(null);
    }
  };

  // ---------------------------------------------
  // RENDER
  // ---------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/teacher/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                <BookOpen size={23} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  My Quickzies
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Create, manage and organize your quizzes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void fetchQuickzies()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <Link
              href="/teacher/quickzy/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Create Quickzy
            </Link>
          </div>
        </header>

        {/* NOTIFICATIONS */}
        {pageError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <CircleHelp size={18} className="mt-0.5 shrink-0" />
            <p>{pageError}</p>
            <button
              onClick={() => setPageError("")}
              className="ml-auto"
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={18} />
            <p>{successMessage}</p>
            <button
              onClick={() => setSuccessMessage("")}
              className="ml-auto"
              aria-label="Dismiss success"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* SUMMARY */}
        <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Quickzies
              </p>
              <BookOpen className="text-blue-600" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {quickzies.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Questions
              </p>
              <FileQuestion className="text-purple-600" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {quickzies.reduce(
                (total, item) =>
                  total + item.questions.length,
                0
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Marks
              </p>
              <CheckCircle2 className="text-green-600" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {quickzies.reduce(
                (total, item) =>
                  total +
                  item.questions.reduce(
                    (sum, question) =>
                      sum + Number(question.marks || 0),
                    0
                  ),
                0
              )}
            </p>
          </div>
        </section>

        {/* QUICKZY LIST */}
        <section className="pb-40">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Your quizzes
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage the quizzes you have created.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {quickzies.length} quizzes
            </span>
          </div>

          {isLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <Loader2
                size={30}
                className="animate-spin text-blue-600"
              />
              <p className="mt-3 text-sm text-slate-500">
                Loading your Quickzies...
              </p>
            </div>
          ) : quickzies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <BookOpen size={30} />
              </div>

              <h3 className="mt-5 text-lg font-bold">
                No Quickzies yet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                You haven't created any quizzes. Create your first
                Quickzy and start building your question collection.
              </p>

              <Link
                href="/teacher/quickzy/create"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={17} />
                Create your first Quickzy
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {quickzies.map((item) => (
                <article
                  key={item.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BookOpen size={21} />
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      MCQ Quiz
                    </span>
                    <Link className="bg-blue-500 p-2 shadow-2xs text-white rounded-md text-xs" href={`/teacher/quickzy/test/${item.id}`}>
                        Start
                    </Link>
                  </div>

                  <h3 className="line-clamp-2 min-h-14 text-lg font-bold text-slate-900">
                    {item.quickzy_name}
                  </h3>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <FileQuestion size={15} />
                      {item.questions.length} questions
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      {item.questions.reduce(
                        (total, question) =>
                          total + Number(question.marks || 0),
                        0
                      )}{" "}
                      marks
                    </span>
                  </div>

                  {item.created_at && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={13} />
                      Created{" "}
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  )}

                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() =>
                        void openQuickzy(item.id, "view")
                      }
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-2 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      onClick={() =>
                        void openQuickzy(item.id, "edit")
                      }
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-2 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      onClick={() => void handleDelete(item.id)}
                      disabled={isDeleting === item.id}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-2 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {isDeleting === item.id ? (
                        <Loader2
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={15} />
                      )}
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* --------------------------------------------- */}
      {/* VIEW / EDIT MODAL */}
      {/* --------------------------------------------- */}

      {modalMode && formData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    {modalMode === "edit" ? (
                      <Pencil size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </span>

                  <h2 className="text-lg font-bold">
                    {modalMode === "edit"
                      ? "Edit Quickzy"
                      : "Quickzy Details"}
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {modalMode === "edit"
                    ? "Update your quiz and its questions."
                    : "Review questions, options and correct answers."}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close modal"
              >
                <X size={21} />
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">

              {modalError && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {modalError}
                </div>
              )}

              {/* QUIZ NAME */}
              <div className="mb-7">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Quickzy name
                </label>

                {modalMode === "edit" ? (
                  <input
                    type="text"
                    value={formData.quickzy_name}
                    onChange={(event) =>
                      updateQuizName(event.target.value)
                    }
                    placeholder="Enter Quickzy name"
                    maxLength={150}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 font-semibold">
                    {selectedQuickzy?.quickzy_name}
                  </div>
                )}
              </div>

              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">
                    Questions
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {formData.questions.length} questions in this quiz
                  </p>
                </div>

                {modalMode === "edit" && (
                  <button
                    onClick={addQuestion}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Plus size={15} />
                    Add question
                  </button>
                )}
              </div>

              {/* QUESTIONS */}
              <div className="space-y-5">
                {formData.questions.map((question, questionIndex) => (
                  <div
                    key={question.id ?? questionIndex}
                    className="rounded-2xl border border-slate-200 p-4 sm:p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                        Question {questionIndex + 1}
                      </span>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500">
                          {question.marks} marks
                        </span>

                        {modalMode === "edit" && (
                          <button
                            onClick={() =>
                              removeQuestion(questionIndex)
                            }
                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                            title="Remove question"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* QUESTION TEXT */}
                    {modalMode === "edit" ? (
                      <textarea
                        value={question.question}
                        onChange={(event) =>
                          updateQuestion(
                            questionIndex,
                            "question",
                            event.target.value
                          )
                        }
                        rows={2}
                        placeholder="Enter your question..."
                        className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      />
                    ) : (
                      <p className="font-semibold leading-7 text-slate-800">
                        {question.question}
                      </p>
                    )}

                    {/* OPTIONS */}
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Answer options
                      </p>

                      {question.options.map((option, optionIndex) => {
                        const isCorrect =
                          question.correct_answer === optionIndex;

                        return (
                          <div
                            key={optionIndex}
                            className={`flex items-center gap-3 rounded-xl border p-3 ${
                              modalMode === "view" && isCorrect
                                ? "border-green-300 bg-green-50"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            {modalMode === "edit" ? (
                              <input
                                type="radio"
                                name={`correct-${questionIndex}`}
                                checked={isCorrect}
                                onChange={() =>
                                  updateQuestion(
                                    questionIndex,
                                    "correct_answer",
                                    optionIndex
                                  )
                                }
                                className="h-4 w-4 accent-green-600"
                                title="Mark as correct answer"
                              />
                            ) : (
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                  isCorrect
                                    ? "bg-green-600 text-white"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                            )}

                            {modalMode === "edit" ? (
                              <input
                                type="text"
                                value={option}
                                onChange={(event) =>
                                  updateOption(
                                    questionIndex,
                                    optionIndex,
                                    event.target.value
                                  )
                                }
                                placeholder={`Option ${optionIndex + 1}`}
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                              />
                            ) : (
                              <span className="min-w-0 flex-1 text-sm text-slate-700">
                                {option}
                              </span>
                            )}

                            {modalMode === "view" && isCorrect && (
                              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-green-700">
                                <Check size={15} />
                                Correct
                              </span>
                            )}

                            {modalMode === "edit" &&
                              question.options.length > 2 && (
                                <button
                                  onClick={() =>
                                    removeOption(
                                      questionIndex,
                                      optionIndex
                                    )
                                  }
                                  className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                  title="Remove option"
                                >
                                  <X size={15} />
                                </button>
                              )}
                          </div>
                        );
                      })}

                      {modalMode === "edit" && (
                        <button
                          onClick={() => addOption(questionIndex)}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <Plus size={14} />
                          Add option
                        </button>
                      )}
                    </div>

                    {/* MARKS */}
                    {modalMode === "edit" && (
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <label className="text-sm font-semibold text-slate-600">
                          Marks
                        </label>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              updateQuestion(
                                questionIndex,
                                "marks",
                                Math.max(1, Number(question.marks) - 1)
                              )
                            }
                            disabled={question.marks <= 1}
                            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40"
                          >
                            <ChevronDown size={15} />
                          </button>

                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={question.marks}
                            onChange={(event) =>
                              updateQuestion(
                                questionIndex,
                                "marks",
                                Number(event.target.value)
                              )
                            }
                            className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-center text-sm font-bold outline-none focus:border-blue-500"
                          />

                          <button
                            onClick={() =>
                              updateQuestion(
                                questionIndex,
                                "marks",
                                Number(question.marks) + 1
                              )
                            }
                            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                          >
                            <ChevronUp size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {formData.questions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
                    No questions available.
                  </div>
                )}
              </div>

              {/* TOTAL MARKS */}
              <div className="mt-6 flex items-center justify-between rounded-xl bg-blue-50 p-4">
                <span className="text-sm font-semibold text-blue-800">
                  Total marks
                </span>
                <span className="text-xl font-bold text-blue-700">
                  {formData.questions.reduce(
                    (total, question) =>
                      total + Number(question.marks || 0),
                    0
                  )}
                </span>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {modalMode === "edit" ? "Cancel" : "Close"}
              </button>

              {modalMode === "view" ? (
                <button
                  onClick={() => setModalMode("edit")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Pencil size={16} />
                  Edit Quickzy
                </button>
              ) : (
                <button
                  onClick={() => void handleUpdate()}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save changes
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
