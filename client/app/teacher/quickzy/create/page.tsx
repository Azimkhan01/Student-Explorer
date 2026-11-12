
"use client";

import React, { useState } from "react";

import {
  Plus,
  Trash2,
  FileJson,
  Sparkles,
  Save,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Code2,
  X,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  ListChecks,
  RotateCcw,
} from "lucide-react";

// ================= TYPES =================

type Question = {
  question: string;
  options: string[];
  correct_answer: number;
  marks: number;
};

type QuickzyJSON = {
  quickzy_name?: string;
  questions: {
    question: string;
    options: string[];
    correct_answer: number | string;
    marks?: number;
  }[];
};

// ================= COMPONENT =================

export default function CreateQuickzyPage() {
  const [quickzyName, setQuickzyName] = useState("");

  const [questions, setQuestions] = useState<Question[]>([
    {
      question: "",
      options: ["", "", "", ""],
      correct_answer: -1,
      marks: 1,
    },
  ]);

  const [jsonInput, setJsonInput] = useState("");
  const [showJson, setShowJson] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ================= ADD QUESTION =================

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question: "",
        options: ["", "", "", ""],
        correct_answer: -1,
        marks: 1,
      },
    ]);
  };

  // ================= REMOVE QUESTION =================

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      setError("At least one question is required.");
      return;
    }

    setQuestions((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setError("");
  };

  // ================= UPDATE QUESTION =================

  const updateQuestion = (
    index: number,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, question: value }
          : item
      )
    );
  };

  // ================= ADD OPTION =================

  const addOption = (questionIndex: number) => {
    setQuestions((prev) =>
      prev.map((item, i) =>
        i === questionIndex
          ? {
              ...item,
              options: [...item.options, ""],
            }
          : item
      )
    );
  };

  // ================= REMOVE OPTION =================

  const removeOption = (
    questionIndex: number,
    optionIndex: number
  ) => {
    setQuestions((prev) =>
      prev.map((item, i) => {
        if (i !== questionIndex) return item;

        if (item.options.length <= 2) return item;

        let correctAnswer = item.correct_answer;

        if (correctAnswer === optionIndex) {
          correctAnswer = -1;
        } else if (correctAnswer > optionIndex) {
          correctAnswer -= 1;
        }

        return {
          ...item,
          options: item.options.filter(
            (_, j) => j !== optionIndex
          ),
          correct_answer: correctAnswer,
        };
      })
    );
  };

  // ================= UPDATE OPTION =================

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((item, i) =>
        i === questionIndex
          ? {
              ...item,
              options: item.options.map((option, j) =>
                j === optionIndex ? value : option
              ),
            }
          : item
      )
    );
  };

  // ================= SELECT CORRECT ANSWER =================

  const selectCorrectAnswer = (
    questionIndex: number,
    optionIndex: number
  ) => {
    setQuestions((prev) =>
      prev.map((item, i) =>
        i === questionIndex
          ? {
              ...item,
              correct_answer: optionIndex,
            }
          : item
      )
    );
  };

  // ================= UPDATE MARKS =================

  const updateMarks = (
    questionIndex: number,
    marks: number
  ) => {
    setQuestions((prev) =>
      prev.map((item, i) =>
        i === questionIndex
          ? { ...item, marks }
          : item
      )
    );
  };

  // ================= JSON IMPORT =================

  const generateFromJSON = () => {
    setError("");
    setSuccess("");

    try {
      const parsed: QuickzyJSON = JSON.parse(jsonInput);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error("JSON must be an object.");
      }

      if (!Array.isArray(parsed.questions)) {
        throw new Error(
          "JSON must contain a questions array."
        );
      }

      if (parsed.questions.length === 0) {
        throw new Error(
          "At least one question is required."
        );
      }

      const formattedQuestions: Question[] =
        parsed.questions.map((item, index) => {
          if (
            !item ||
            typeof item.question !== "string" ||
            !item.question.trim()
          ) {
            throw new Error(
              `Invalid question at item ${index + 1}.`
            );
          }

          if (
            !Array.isArray(item.options) ||
            item.options.length < 2
          ) {
            throw new Error(
              `Question ${index + 1} must have at least two options.`
            );
          }

          const options = item.options.map((option) => {
            if (
              typeof option !== "string" ||
              !option.trim()
            ) {
              throw new Error(
                `Empty option in question ${index + 1}.`
              );
            }

            return option.trim();
          });

          if (
            new Set(
              options.map((option) => option.toLowerCase())
            ).size !== options.length
          ) {
            throw new Error(
              `Duplicate options in question ${index + 1}.`
            );
          }

          let correctIndex = -1;

          if (typeof item.correct_answer === "number") {
            correctIndex = item.correct_answer;
          } else if (
            typeof item.correct_answer === "string"
          ) {
            correctIndex = options.indexOf(
              item.correct_answer.trim()
            );
          }

          if (
            !Number.isInteger(correctIndex) ||
            correctIndex < 0 ||
            correctIndex >= options.length
          ) {
            throw new Error(
              `Invalid correct_answer in question ${index + 1}.`
            );
          }

          const marks = item.marks ?? 1;

          if (
            !Number.isInteger(marks) ||
            marks < 1
          ) {
            throw new Error(
              `Invalid marks in question ${index + 1}.`
            );
          }

          return {
            question: item.question.trim(),
            options,
            correct_answer: correctIndex,
            marks,
          };
        });

      setQuestions(formattedQuestions);

      if (
        typeof parsed.quickzy_name === "string" &&
        parsed.quickzy_name.trim()
      ) {
        setQuickzyName(parsed.quickzy_name.trim());
      }

      setShowJson(false);

      setSuccess(
        `${formattedQuestions.length} MCQ questions generated successfully!`
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid JSON format."
      );
    }
  };

  // ================= VALIDATION =================

  const validateForm = () => {
    if (!quickzyName.trim()) {
      return "Please enter a Quickzy name.";
    }

    if (questions.length === 0) {
      return "At least one question is required.";
    }

    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];

      if (!item.question.trim()) {
        return `Please enter question ${i + 1}.`;
      }

      if (item.options.length < 2) {
        return `Question ${i + 1} needs at least two options.`;
      }

      if (item.options.some((option) => !option.trim())) {
        return `Please complete all options in question ${i + 1}.`;
      }

      const normalizedOptions = item.options.map(
        (option) => option.trim().toLowerCase()
      );

      if (
        new Set(normalizedOptions).size !==
        normalizedOptions.length
      ) {
        return `Duplicate options found in question ${i + 1}.`;
      }

      if (
        item.correct_answer < 0 ||
        item.correct_answer >= item.options.length
      ) {
        return `Please select the correct answer for question ${i + 1}.`;
      }

      if (
        !Number.isInteger(item.marks) ||
        item.marks < 1
      ) {
        return `Invalid marks for question ${i + 1}.`;
      }
    }

    return "";
  };

  // ================= SUBMIT =================

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/server/quickzy", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quickzy_name: quickzyName.trim(),

          questions: questions.map((item) => ({
            question: item.question.trim(),

            options: item.options.map((option) =>
              option.trim()
            ),

            correct_answer: item.correct_answer,

            marks: item.marks,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ||
              "Failed to create Quickzy."
        );
      }

      setSuccess("Quickzy created successfully!");

      setQuickzyName("");

      setQuestions([
        {
          question: "",
          options: ["", "", "", ""],
          correct_answer: -1,
          marks: 1,
        },
      ]);

      setJsonInput("");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= TOTAL MARKS =================

  const totalMarks = questions.reduce(
    (total, item) => total + item.marks,
    0
  );

  // ================= UI =================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-5xl space-y-6">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
              <BookOpen size={17} />
              Teacher Dashboard / Quickzy
            </div>

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Create Quickzy
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create an MCQ quiz manually or import questions
              using JSON.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs text-blue-500">
                Questions
              </p>

              <p className="text-xl font-bold text-blue-700">
                {questions.length}
              </p>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
              <p className="text-xs text-purple-500">
                Total Marks
              </p>

              <p className="text-xl font-bold text-purple-700">
                {totalMarks}
              </p>
            </div>

          </div>

        </div>

        {/* ALERTS */}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            {success}
          </div>
        )}

        {/* QUICKZY INFORMATION */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <BookOpen size={19} className="text-blue-600" />
            Quickzy Information
          </h2>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Quickzy Name
          </label>

          <input
            type="text"
            value={quickzyName}
            onChange={(e) =>
              setQuickzyName(e.target.value)
            }
            placeholder="Example: JavaScript Fundamentals"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </section>

        {/* JSON IMPORT */}

        <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">

          <div className="flex flex-col justify-between gap-3 bg-blue-50 p-5 sm:flex-row sm:items-center">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-blue-600 p-3 text-white">
                <FileJson size={22} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  JSON Question Generator
                </h2>

                <p className="text-xs text-slate-500">
                  Paste JSON to automatically create MCQs.
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() => {
                setShowJson(!showJson);
                setError("");
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Code2 size={17} />

              {showJson
                ? "Close JSON Editor"
                : "Import JSON"}

              {showJson ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

          </div>

          {showJson && (
            <div className="space-y-4 p-5">

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Paste JSON Object
                </label>

                <textarea
                  value={jsonInput}
                  onChange={(e) =>
                    setJsonInput(e.target.value)
                  }
                  rows={15}
                  placeholder={`{
  "quickzy_name": "JavaScript Basics",
  "questions": [
    {
      "question": "What is JavaScript?",
      "options": [
        "Programming Language",
        "Database",
        "Operating System",
        "Browser"
      ],
      "correct_answer": 0,
      "marks": 2
    }
  ]
}`}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-green-300 outline-none focus:border-blue-500"
                  spellCheck={false}
                />
              </div>

              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                <p className="text-xs text-slate-500">
                  correct_answer is a zero-based option index.
                  For example, 0 means Option A.
                </p>

                <button
                  type="button"
                  onClick={generateFromJSON}
                  disabled={!jsonInput.trim()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Sparkles size={17} />
                  Generate MCQs
                </button>

              </div>

            </div>
          )}

        </section>

        {/* QUESTION SECTION */}

        <section className="space-y-5">

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <ListChecks size={21} className="text-blue-600" />
                Questions & Options
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select the correct option for every question.
              </p>
            </div>

            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Question
            </button>

          </div>

          {/* QUESTION CARDS */}

          {questions.map((item, index) => (

            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >

              {/* QUESTION HEADER */}

              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">

                <div className="flex items-center gap-3">

                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <h3 className="font-semibold text-slate-800">
                      Question {index + 1}
                    </h3>

                    <p className="text-xs text-slate-500">
                      {item.options.length} options
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                  title="Delete question"
                >
                  <Trash2 size={18} />
                </button>

              </div>

              {/* QUESTION BODY */}

              <div className="space-y-5 p-5 sm:p-6">

                {/* QUESTION TEXT */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Question
                  </label>

                  <textarea
                    rows={3}
                    value={item.question}
                    onChange={(e) =>
                      updateQuestion(index, e.target.value)
                    }
                    placeholder="Enter your question here..."
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* OPTIONS HEADER */}

                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">

                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      Answer Options
                    </h4>

                    <p className="mt-1 text-xs text-slate-500">
                      Select the radio button beside the correct answer.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => addOption(index)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    <Plus size={15} />
                    Add Option
                  </button>

                </div>

                {/* OPTIONS */}

                <div className="space-y-3">

                  {item.options.map((option, optionIndex) => {

                    const isCorrect =
                      item.correct_answer === optionIndex;

                    return (
                      <div
                        key={optionIndex}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                          isCorrect
                            ? "border-green-300 bg-green-50"
                            : "border-slate-200 bg-white hover:border-blue-200"
                        }`}
                      >

                        {/* CORRECT ANSWER RADIO */}

                        <label
                          className="flex shrink-0 cursor-pointer items-center"
                          title="Select correct answer"
                        >
                          <input
                            type="radio"
                            name={`correct-answer-${index}`}
                            checked={isCorrect}
                            onChange={() =>
                              selectCorrectAnswer(
                                index,
                                optionIndex
                              )
                            }
                            className="h-4 w-4 accent-green-600"
                          />
                        </label>

                        {/* OPTION LABEL */}

                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isCorrect
                            ? "bg-green-200 text-green-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {String.fromCharCode(65 + optionIndex)}
                        </span>

                        {/* OPTION INPUT */}

                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            updateOption(
                              index,
                              optionIndex,
                              e.target.value
                            )
                          }
                          placeholder={`Enter option ${String.fromCharCode(65 + optionIndex)}...`}
                          className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none"
                        />

                        {/* CORRECT INDICATOR */}

                        {isCorrect && (
                          <span className="hidden items-center gap-1 text-xs font-semibold text-green-700 sm:flex">
                            <CircleCheck size={16} />
                            Correct
                          </span>
                        )}

                        {/* DELETE OPTION */}

                        <button
                          type="button"
                          onClick={() =>
                            removeOption(index, optionIndex)
                          }
                          disabled={item.options.length <= 2}
                          className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-20"
                          title="Remove option"
                        >
                          <X size={17} />
                        </button>

                      </div>
                    );
                  })}

                </div>

                {/* MARKS */}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700">
                      Question Marks
                    </h4>

                    <p className="mt-1 text-xs text-slate-500">
                      Set the marks for this question.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        updateMarks(
                          index,
                          Math.max(1, item.marks - 1)
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      -
                    </button>

                    <span className="min-w-8 text-center font-bold text-slate-800">
                      {item.marks}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        updateMarks(
                          index,
                          item.marks + 1
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      +
                    </button>

                    <span className="text-xs text-slate-500">
                      Marks
                    </span>

                  </div>

                </div>

                {/* ANSWER STATUS */}

                <div className={`flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
                  item.correct_answer !== -1
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}>

                  {item.correct_answer !== -1 ? (
                    <>
                      <CheckCircle2 size={16} />
                      Correct answer selected: Option{" "}
                      {String.fromCharCode(
                        65 + item.correct_answer
                      )}
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} />
                      Please select the correct answer.
                    </>
                  )}

                </div>

              </div>

            </div>

          ))}

        </section>

        {/* SUMMARY */}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">
              Total Questions
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {questions.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">
              Total Marks
            </p>

            <p className="mt-1 text-2xl font-bold text-blue-600">
              {totalMarks}
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:col-span-1">
            <p className="text-xs text-slate-500">
              Completed Answers
            </p>

            <p className="mt-1 text-2xl font-bold text-green-600">
              {questions.filter(
                (item) =>
                  item.correct_answer >= 0 &&
                  item.question.trim() &&
                  item.options.every((o) => o.trim())
              ).length}
              <span className="text-sm font-medium text-slate-400">
                {" "}/ {questions.length}
              </span>
            </p>
          </div>

        </section>

        {/* SUBMIT */}

        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">

          <div>
            <h3 className="font-semibold text-slate-800">
              Ready to create your Quickzy?
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Review all questions and correct answers before saving.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />

            {isSubmitting
              ? "Creating Quickzy..."
              : "Create Quickzy"}
          </button>

        </div>

      </div>

    </div>
  );
}
