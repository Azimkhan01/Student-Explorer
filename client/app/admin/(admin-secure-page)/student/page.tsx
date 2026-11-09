"use client";

import StudentCharts from "@/components/admin/Student-Charts";
import React, { useEffect, useState } from "react";

type Student = {
  id: number;
  username: string;
  email: string;
  dob: string | null;
  contact: string | null;
};

type PaginationMeta = {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
};

type StudentAction = "add" | "update" | "delete" | null;

const initialForm = {
  username: "",
  email: "",
  dob: "",
  contact: "",
};

function AdminStudentPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activeAction, setActiveAction] = useState<StudentAction>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [formData, setFormData] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [pagination, setPagination] = useState<PaginationMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: 10,
    totalPages: 0,
    currentPage: 1,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  // API REQUEST HELPER
   const apiRequest = async (
    endpoint: string,
    options: RequestInit = {},
  ) => {
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    const response = await fetch(`/server${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message || "Something went wrong.",
      );
    }

    return data;
  };

  // GET ALL STUDENTS
  const fetchStudents = async (
    search = "",
    pageNumber = 1,
    pageLimit = limit,
  ) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: String(pageLimit),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await apiRequest(`/students?${params.toString()}`);

      setStudents(response.data);
      setPagination(response.meta);
      setPage(response.meta.currentPage);

      // If the current page no longer exists, move to the last page.
      if (
        response.meta.totalPages > 0 &&
        pageNumber > response.meta.totalPages
      ) {
        await fetchStudents(search, response.meta.totalPages, pageLimit);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to fetch students.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // SEARCH STUDENTS
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setPage(1);
    fetchStudents(searchQuery, 1, limit);
  };

  // OPEN ACTION
  const openAction = (action: StudentAction) => {
    setActiveAction(action);
    setSelectedStudent(null);
    setFormData(initialForm);
    setError("");
    setSuccess("");
  };

  // CLOSE ACTION
  const closeAction = () => {
    setActiveAction(null);
    setSelectedStudent(null);
    setFormData(initialForm);
    setError("");
    setSuccess("");
  };

  // HANDLE INPUT
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // SELECT STUDENT FOR UPDATE / DELETE
  const handleSelectStudent = (id: string) => {
    const student = students.find((s) => s.id === Number(id));

    setSelectedStudent(student || null);
    setError("");
    setSuccess("");

    if (student) {
      setFormData({
        username: student.username,
        email: student.email,
        dob: student.dob ? student.dob.slice(0, 10) : "",
        contact: student.contact || "",
      });
    } else {
      setFormData(initialForm);
    }
  };

  // ADD STUDENT
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        dob: formData.dob || null,
        contact: formData.contact.trim() || null,
      };

      await apiRequest("/students", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess("Student registered successfully!");
      setFormData(initialForm);

      await fetchStudents(searchQuery, page, limit);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create student.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // UPDATE STUDENT
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedStudent) {
      setError("Please select a student first.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        dob: formData.dob || null,
        contact: formData.contact.trim() || null,
      };

      await apiRequest(`/students/${selectedStudent.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setSuccess("Student updated successfully!");

      await fetchStudents(searchQuery, page, limit);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update student.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE STUDENT
  const handleDelete = async () => {
    if (!selectedStudent) {
      setError("Please select a student first.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedStudent.username}?`,
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      await apiRequest(`/students/${selectedStudent.id}`, {
        method: "DELETE",
      });

      setSuccess("Student deleted successfully!");
      setSelectedStudent(null);

      await fetchStudents(searchQuery, page, limit);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete student.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (
      pageNumber < 1 ||
      pageNumber > pagination.totalPages ||
      pageNumber === page
    ) {
      return;
    }

    setPage(pageNumber);
    fetchStudents(searchQuery, pageNumber, limit);
  };

  const changeLimit = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    fetchStudents(searchQuery, 1, newLimit);
  };

  const managementActions = [
    {
      id: "add" as const,
      title: "Add Student",
      description: "Register a new student in the system.",
      icon: "+",
      color: "bg-blue-50 text-blue-600",
    },
    {
      id: "update" as const,
      title: "Update Student",
      description: "Edit existing student information.",
      icon: "✎",
      color: "bg-amber-50 text-amber-600",
    },
    {
      id: "delete" as const,
      title: "Delete Student",
      description: "Remove a student from the system.",
      icon: "×",
      color: "bg-red-50 text-red-600",
    },
  ];

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const selectedTitle = managementActions.find(
    (item) => item.id === activeAction,
  )?.title;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 pb-32 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* PAGE HEADER */}

        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Admin Panel / Students
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Student Management
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Manage student registrations, information and records.
            </p>
          </div>

          <span className="w-fit rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
            Student Administration
          </span>
        </section>

        {/* student charts */}

        <StudentCharts />

        {/* OVERVIEW */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Total Students</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900">
              {loading ? "..." : students.length}
            </h2>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Search Results</p>
            <h2 className="mt-3 text-3xl font-bold text-blue-600">
              {students.length}
            </h2>
            <p className="mt-2 text-xs text-gray-400">
              Matching student records
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Management Actions</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900">03</h2>
            <p className="mt-2 text-xs text-gray-400">
              Create, update and delete
            </p>
          </div>
        </section>

        {/* SEARCH */}

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h2 className="font-semibold text-gray-900">Search Students</h2>
            <p className="mt-1 text-sm text-gray-500">
              Search using student name, email or ID.
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email or student ID..."
              className={inputClass}
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gray-900 px-7 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setPage(1);
                fetchStudents("", 1, limit);
              }}
              className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Reset
            </button>
          </form>
        </section>

        {/* CRUD ACTIONS */}

        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Students
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Select an action to manage student records.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {managementActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => openAction(action.id)}
                className={`rounded-xl border bg-white p-5 text-left transition hover:-translate-y-1 hover:shadow-md ${
                  activeAction === action.id
                    ? "border-blue-500 ring-2 ring-blue-100"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-lg text-xl font-semibold ${action.color}`}
                  >
                    {action.icon}
                  </div>
                  <span className="text-gray-400">↗</span>
                </div>

                <h3 className="mt-5 font-semibold text-gray-900">
                  {action.title}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* ACTION WORKSPACE */}

        {activeAction && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Student Workspace
                </p>

                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                  {selectedTitle}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAction}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 transition hover:bg-gray-100"
              >
                Close ×
              </button>
            </div>

            <div className="mt-6">
              {/* ADD FORM */}

              {activeAction === "add" && (
                <form onSubmit={handleCreate} className="space-y-5">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      Register New Student
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Enter the student's basic information.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Student Name *
                      </label>
                      <input
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Enter student name"
                        className={inputClass}
                        minLength={2}
                        maxLength={50}
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="student@example.com"
                        className={inputClass}
                        maxLength={100}
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        name="contact"
                        value={formData.contact}
                        onChange={handleChange}
                        placeholder="Enter contact number"
                        className={inputClass}
                        maxLength={10}
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  {success && (
                    <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                      {success}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? "Registering..." : "Register Student"}
                  </button>
                </form>
              )}

              {/* UPDATE FORM */}

              {activeAction === "update" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      Select Student
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select an existing student to edit their information.
                    </p>
                  </div>

                  <select
                    value={selectedStudent?.id ?? ""}
                    onChange={(e) => handleSelectStudent(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose a student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        #{student.id} - {student.username} ({student.email})
                      </option>
                    ))}
                  </select>

                  {selectedStudent && (
                    <form onSubmit={handleUpdate} className="space-y-5">
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Student Name *
                          </label>
                          <input
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className={inputClass}
                            minLength={2}
                            maxLength={50}
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={inputClass}
                            maxLength={100}
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Contact Number
                          </label>
                          <input
                            type="tel"
                            name="contact"
                            value={formData.contact}
                            onChange={handleChange}
                            className={inputClass}
                            maxLength={10}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-amber-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
                      >
                        {submitting ? "Updating..." : "Update Student"}
                      </button>
                    </form>
                  )}

                  {!selectedStudent && (
                    <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                      Select a student to load their information.
                    </p>
                  )}
                </div>
              )}

              {/* DELETE STUDENT */}

              {activeAction === "delete" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      Delete Student
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select the student you want to remove.
                    </p>
                  </div>

                  <select
                    value={selectedStudent?.id ?? ""}
                    onChange={(e) => handleSelectStudent(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose a student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        #{student.id} - {student.username} ({student.email})
                      </option>
                    ))}
                  </select>

                  {selectedStudent && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                      <p className="text-sm font-semibold text-red-700">
                        Confirm student deletion
                      </p>

                      <div className="mt-4 space-y-2 text-sm text-gray-700">
                        <p>
                          <strong>ID:</strong> {selectedStudent.id}
                        </p>
                        <p>
                          <strong>Name:</strong> {selectedStudent.username}
                        </p>
                        <p>
                          <strong>Email:</strong> {selectedStudent.email}
                        </p>
                      </div>

                      <p className="mt-4 text-xs text-red-600">
                        This action permanently removes the student if the
                        backend allows deletion.
                      </p>

                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={submitting}
                        className="mt-5 rounded-lg bg-red-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {submitting ? "Deleting..." : "Confirm Delete"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && activeAction !== "add" && (
                <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              {success && activeAction !== "add" && (
                <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  {success}
                </p>
              )}
            </div>
          </section>
        )}

        {/* STUDENT TABLE */}

        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              All Students
            </h2>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">ID</th>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Date of Birth</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-gray-500"
                      >
                        Loading students...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-gray-500"
                      >
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr
                        key={student.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4 font-medium text-gray-700">
                          #{student.id}
                        </td>

                        <td className="px-5 py-4 font-medium text-gray-900">
                          {student.username}
                        </td>

                        <td className="px-5 py-4 text-gray-500">
                          {student.email}
                        </td>

                        <td className="px-5 py-4 text-gray-500">
                          {student.dob
                            ? student.dob.slice(0, 10)
                            : "Not provided"}
                        </td>

                        <td className="px-5 py-4 text-gray-500">
                          {student.contact || "Not provided"}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                openAction("update");
                                setSelectedStudent(student);
                                setFormData({
                                  username: student.username,
                                  email: student.email,
                                  dob: student.dob
                                    ? student.dob.slice(0, 10)
                                    : "",
                                  contact: student.contact || "",
                                });
                              }}
                              className="font-medium text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                openAction("delete");
                                setSelectedStudent(student);
                              }}
                              className="font-medium text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              {/* RECORD INFORMATION */}

              <div className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-900">
                  {pagination.totalItems === 0 ? 0 : (page - 1) * limit + 1}
                </span>
                {" - "}
                <span className="font-semibold text-gray-900">
                  {Math.min(page * limit, pagination.totalItems)}
                </span>
                {" of "}
                <span className="font-semibold text-gray-900">
                  {pagination.totalItems}
                </span>
                {" students"}
              </div>

              {/* PAGE SIZE */}

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Rows:</span>

                <select
                  value={limit}
                  onChange={(e) => changeLimit(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* PAGINATION CONTROLS */}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => goToPage(page - 1)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="min-w-[90px] text-center text-sm font-medium text-gray-700">
                  Page {page} of {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() => goToPage(page + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AdminStudentPage;
