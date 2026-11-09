"use client";

import {
  CalendarDays,
  School,
  BookOpen,
  Users,
  Plus,
  Search,
  ChevronRight,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  Layers3,
} from "lucide-react";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  academicService,
  teacherService,
  type AcademicYear,
  type SchoolClass,
  type Subject,
  type Teacher,
  type Assignment,
} from "@/services/academic.service";

type Tab = "years" | "classes" | "subjects" | "assignments";

const tabs = [
  { id: "years", label: "Academic Years", icon: CalendarDays },
  { id: "classes", label: "Classes", icon: School },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "assignments", label: "Class Subjects", icon: Users },
] as const;

export default function AcademicSetupPage() {
  const [activeTab, setActiveTab] = useState<Tab>("years");

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [yearName, setYearName] = useState("");
  const [standard, setStandard] = useState("");
  const [division, setDivision] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");

  const [assignment, setAssignment] = useState({
    class_id: "",
    subject_id: "",
    teacher_id: "",
    academic_year_id: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentYear = years.find((year) => year.isCurrent);

  const stats = [
    {
      label: "Academic Years",
      value: years.length,
      icon: CalendarDays,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Classes",
      value: classes.length,
      icon: School,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Total Subjects",
      value: subjects.length,
      icon: BookOpen,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Assignments",
      value: assignments.length,
      icon: Users,
      color: "bg-orange-50 text-orange-600",
    },
  ];

  const filteredData = useMemo(() => {
    const term = search.toLowerCase();

    if (activeTab === "years") {
      return years.filter((item) => item.yearName.toLowerCase().includes(term));
    }

    if (activeTab === "classes") {
      return classes.filter((item) =>
        `${item.standard} ${item.division ?? ""}`.toLowerCase().includes(term),
      );
    }

    if (activeTab === "subjects") {
      return subjects.filter((item) =>
        `${item.subjectName} ${item.code}`.toLowerCase().includes(term),
      );
    }

    return assignments.filter((item) =>
      `${item.class?.standard ?? ""}
   ${item.class?.division ?? ""}
   ${item.subject?.subjectName ?? ""}
   ${item.teacher?.username ?? ""}
   ${item.academicYear?.yearName ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [activeTab, search, years, classes, subjects, assignments]);

  const resetForm = () => {
    setYearName("");
    setStandard("");
    setDivision("");
    setSubjectName("");
    setSubjectCode("");

    setAssignment({
      class_id: "",
      subject_id: "",
      teacher_id: "",
      academic_year_id: "",
    });

    setShowForm(false);
  };

  const fetchAcademicData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [
        yearsData,
        classesData,
        subjectsData,
        assignmentsData,
        teachersData,
      ] = await Promise.all([
        academicService.getYears(),
        academicService.getClasses(),
        academicService.getSubjects(),
        academicService.getAssignments(),
        teacherService.getTeachers(),
      ]);

      setYears(yearsData);
      setClasses(classesData);
      setSubjects(subjectsData);
      setAssignments(assignmentsData);
      setTeachers(teachersData);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch academic data",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");

      if (activeTab === "years") {
        const duplicate = years.some(
          (year) =>
            year.yearName.toLowerCase() === yearName.trim().toLowerCase(),
        );

        if (duplicate) {
          setError("This academic year already exists.");
          return;
        }

        await academicService.createYear({
          yearName: yearName.trim(),
        });
      }

      if (activeTab === "classes") {
        const duplicate = classes.some(
          (item) =>
            item.standard === standard.trim() &&
            (item.division ?? "").toLowerCase() ===
              division.trim().toLowerCase(),
        );

        if (duplicate) {
          setError("This class and division already exist.");
          return;
        }

        await academicService.createClass({
          standard: standard.trim(),
          division: division.trim().toUpperCase(),
        });
      }

      if (activeTab === "subjects") {
        const duplicate = subjects.some(
          (item) =>
            item.code.toLowerCase() === subjectCode.trim().toLowerCase(),
        );

        if (duplicate) {
          setError("Subject code already exists.");
          return;
        }

        await academicService.createSubject({
          subjectName: subjectName.trim(),
          code: subjectCode.trim().toUpperCase(),
        });
      }

      if (
        !assignment.class_id ||
        !assignment.subject_id ||
        !assignment.teacher_id ||
        !assignment.academic_year_id
      ) {
        setError("Please select Class, Subject, Teacher and Academic Year.");
        return;
      }

      if (activeTab === "assignments") {
        const newAssignment = {
          class_id: Number(assignment.class_id),
          subject_id: Number(assignment.subject_id),
          teacher_id: Number(assignment.teacher_id),
          academic_year_id: Number(assignment.academic_year_id),
        };

        const duplicate = assignments.some(
          (item) =>
            item.class.id === newAssignment.class_id &&
            item.subject.id === newAssignment.subject_id &&
            item.academicYear.id === newAssignment.academic_year_id,
        );

        if (duplicate) {
          setError("This subject is already assigned to this class.");
          return;
        }

        await academicService.createAssignment({
          classId: Number(assignment.class_id),
          subjectId: Number(assignment.subject_id),
          teacherId: Number(assignment.teacher_id),
          academicYearId: Number(assignment.academic_year_id),
        });
      }

      await fetchAcademicData();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setCurrentYear = async (id: number) => {
    try {
      setError("");

      await academicService.setCurrentYear(id);

      await fetchAcademicData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update current year",
      );
    }
  };

  const deleteItem = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this record?",
    );

    if (!confirmed) return;

    try {
      setError("");

      if (activeTab === "years") {
        const selectedYear = years.find((year) => year.id === id);

        if (selectedYear?.isCurrent) {
          setError("Select another current academic year first.");
          return;
        }

        await academicService.deleteYear(id);
      }

      if (activeTab === "classes") {
        await academicService.deleteClass(id);
      }

      if (activeTab === "subjects") {
        await academicService.deleteSubject(id);
      }

      if (activeTab === "assignments") {
        await academicService.deleteAssignment(id);
      }

      await fetchAcademicData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    }
  };

  const heading = tabs.find((t) => t.id === activeTab);

  useEffect(() => {
    fetchAcademicData();
  }, [fetchAcademicData]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-28 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
            Admin Dashboard
            <ChevronRight size={14} />
            Academic Management
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Academic Setup
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage academic years, classes, subjects and assignments.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <CalendarDays size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Current Academic Year</p>
            <p className="font-semibold text-slate-800">
              {currentYear?.yearName ?? "Not selected"}
            </p>
          </div>
          <CheckCircle2 className="ml-2 text-emerald-500" size={19} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>{error}</span>

          <button
            onClick={() => setError("")}
            className="font-semibold hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex min-h-[250px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

            <p className="text-sm font-medium text-slate-500">
              Loading academic data...
            </p>
          </div>
        </div>
      )}

      {/* Statistics */}
      {!isLoading && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className={`rounded-xl p-3 ${stat.color}`}>
                      <Icon size={22} />
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      Overview
                    </span>
                  </div>

                  <h2 className="mt-4 text-3xl font-bold text-slate-900">
                    {stat.value}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3 sm:p-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearch("");
                      resetForm();
                    }}
                    className={`
                  flex shrink-0 items-center gap-2 rounded-xl px-4 py-3
                  text-sm font-semibold transition-all
                  ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }
                `}
                  >
                    <Icon size={17} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Table Header */}
            <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {heading?.label}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your {heading?.label.toLowerCase()}.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search records..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 sm:w-56"
                  />
                </div>

                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
                >
                  <Plus size={18} />
                  Add New
                </button>
              </div>
            </div>

            {/* Add Form */}
            {showForm && (
              <form
                onSubmit={handleSubmit}
                className="mx-5 mb-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-5"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">
                    Add {heading?.label}
                  </h3>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm text-slate-400 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>

                {activeTab === "years" && (
                  <div className="max-w-md">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Academic Year
                    </label>
                    <input
                      required
                      value={yearName}
                      onChange={(e) => setYearName(e.target.value)}
                      placeholder="Example: 2027-2028"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {activeTab === "classes" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Standard
                      </label>
                      <input
                        required
                        value={standard}
                        onChange={(e) => setStandard(e.target.value)}
                        placeholder="Example: 10"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Division
                      </label>
                      <input
                        required
                        value={division}
                        onChange={(e) => setDivision(e.target.value)}
                        placeholder="Example: A"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "subjects" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Subject Name
                      </label>
                      <input
                        required
                        value={subjectName}
                        onChange={(e) => setSubjectName(e.target.value)}
                        placeholder="Example: Mathematics"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Subject Code
                      </label>
                      <input
                        required
                        value={subjectCode}
                        onChange={(e) => setSubjectCode(e.target.value)}
                        placeholder="Example: MATH101"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "assignments" && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Class */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Class
                      </label>

                      <select
                        required
                        value={assignment.class_id}
                        onChange={(e) =>
                          setAssignment({
                            ...assignment,
                            class_id: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                      >
                        <option value="">Select Class</option>

                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.standard} - {c.division ?? "No Division"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Subject
                      </label>

                      <select
                        required
                        value={assignment.subject_id}
                        onChange={(e) =>
                          setAssignment({
                            ...assignment,
                            subject_id: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                      >
                        <option value="">Select Subject</option>

                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.subjectName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Teacher */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Teacher
                      </label>

                      <select
                        required
                        value={assignment.teacher_id}
                        onChange={(e) =>
                          setAssignment({
                            ...assignment,
                            teacher_id: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                      >
                        <option value="">Select Teacher</option>

                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.username}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Academic Year */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Academic Year
                      </label>

                      <select
                        required
                        value={assignment.academic_year_id}
                        onChange={(e) =>
                          setAssignment({
                            ...assignment,
                            academic_year_id: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                      >
                        <option value="">Select Year</option>

                        {years.map((y) => (
                          <option key={y.id} value={y.id}>
                            {y.yearName} {y.isCurrent ? "(Current)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving..." : "Save Record"}
                  </button>
                </div>
              </form>
            )}

            {/* Data Tables */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  {activeTab === "years" && (
                    <tr>
                      <th className="px-6 py-4">Academic Year</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Current Year</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  )}

                  {activeTab === "classes" && (
                    <tr>
                      <th className="px-6 py-4">Standard</th>
                      <th className="px-6 py-4">Division</th>
                      <th className="px-6 py-4">Class Name</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  )}

                  {activeTab === "subjects" && (
                    <tr>
                      <th className="px-6 py-4">Subject Name</th>
                      <th className="px-6 py-4">Subject Code</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  )}

                  {activeTab === "assignments" && (
                    <tr>
                      <th className="px-6 py-4">Class</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Teacher</th>
                      <th className="px-6 py-4">Academic Year</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  )}
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredData.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-16 text-center text-slate-400"
                      >
                        <Layers3
                          size={30}
                          className="mx-auto mb-3 opacity-40"
                        />
                        <p className="font-medium">No records found</p>
                        <p className="mt-1 text-xs">
                          Add a new record to get started.
                        </p>
                      </td>
                    </tr>
                  )}

                  {activeTab === "years" &&
                    (filteredData as AcademicYear[]).map((year) => (
                      <tr key={year.id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 font-semibold text-slate-800">
                          {year.yearName}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              year.isCurrent
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {year.isCurrent ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <button
                            onClick={() => setCurrentYear(year.id)}
                            disabled={year.isCurrent}
                            className="flex items-center gap-2 text-xs font-semibold text-blue-600 disabled:cursor-default disabled:text-emerald-600"
                          >
                            {year.isCurrent ? (
                              <CheckCircle2 size={17} />
                            ) : (
                              <Circle size={17} />
                            )}
                            {year.isCurrent ? "Current" : "Set as Current"}
                          </button>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => deleteItem(year.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {activeTab === "classes" &&
                    (filteredData as SchoolClass[]).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 font-semibold text-slate-800">
                          Standard {item.standard}
                        </td>
                        <td className="px-6 py-5">{item.division}</td>
                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-blue-50 px-3 py-1 font-semibold text-blue-600">
                            {item.standard}-{item.division}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {activeTab === "subjects" &&
                    (filteredData as Subject[]).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 font-semibold text-slate-800">
                          {item.subjectName}
                        </td>
                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-violet-50 px-3 py-1 font-mono text-xs font-semibold text-violet-600">
                            {item.code}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-medium text-emerald-600">
                            Available
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {activeTab === "assignments" &&
                    (filteredData as Assignment[]).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 font-semibold text-slate-800">
                          {item.class?.standard ?? "Unknown"}-
                          {item.class?.division ?? ""}
                        </td>

                        <td className="px-6 py-5">
                          {item.subject?.subjectName ?? "Unknown"}
                        </td>

                        <td className="px-6 py-5">
                          {item.teacher?.username ?? "Unknown"}
                        </td>

                        <td className="px-6 py-5">
                          {item.academicYear?.yearName ?? "Unknown"}
                        </td>

                        <td className="px-6 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400">
                Showing {filteredData.length} records
              </p>
              <p className="text-xs font-medium text-slate-400">
                Academic Management
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
