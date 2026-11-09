'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarDays,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

type Student = {
  id: number;
  username: string;
  email: string;
};

type SchoolClass = {
  id: number;
  standard: string;
  division: string | null;
};

type AcademicYear = {
  id: number;
  yearName: string;
  isCurrent: boolean;
};

type Enrollment = {
  id: number;
  rollNumber: string;
  status: string;
  student: Student;
  class: SchoolClass;
  academicYear: AcademicYear;
};

type PaginatedResponse<T> = {
  data: T[];
  meta?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
};

const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
) => {
  const path = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;

  const response = await fetch(`/server${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message || 'Something went wrong.',
    );
  }

  return data;
};

const unwrapArray = <T,>(response: unknown): T[] => {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray((response as { data: unknown }).data)
  ) {
    return (response as { data: T[] }).data;
  }

  return [];
};

const initialForm = {
  studentId: '',
  classId: '',
  academicYearId: '',
  rollNumber: '',
  status: 'active',
};

export default function AdminStudentEnrollmentPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const yearQuery = selectedYear
        ? `?page=1&limit=100&academicYearId=${selectedYear}`
        : '?page=1&limit=100';

      const [
        studentResponse,
        classResponse,
        yearResponse,
        enrollmentResponse,
      ] = await Promise.all([
        apiRequest('/students?page=1&limit=100'),
        apiRequest('/academic/classes'),
        apiRequest('/academic/years'),
        apiRequest(`/student-enrollments${yearQuery}`),
      ]);

      setStudents(
        unwrapArray<Student>(studentResponse),
      );

      setClasses(
        unwrapArray<SchoolClass>(classResponse),
      );

      setAcademicYears(
        unwrapArray<AcademicYear>(yearResponse),
      );

      setEnrollments(
        unwrapArray<Enrollment>(enrollmentResponse),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load enrollment data.',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFormChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleEnrollment = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (
      !form.studentId ||
      !form.classId ||
      !form.academicYearId ||
      !form.rollNumber.trim()
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest('/student-enrollments', {
        method: 'POST',
        body: JSON.stringify({
          studentId: Number(form.studentId),
          classId: Number(form.classId),
          academicYearId: Number(form.academicYearId),
          rollNumber: form.rollNumber.trim(),
          status: form.status,
        }),
      });

      setSuccess('Student enrolled successfully.');
      setForm(initialForm);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to enroll student.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this enrollment?',
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError('');
    setSuccess('');

    try {
      await apiRequest(`/student-enrollments/${id}`, {
        method: 'DELETE',
      });

      setSuccess('Enrollment deleted successfully.');
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete enrollment.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const searchText = search.toLowerCase();

    return (
      enrollment.student?.username
        ?.toLowerCase()
        .includes(searchText) ||
      enrollment.student?.email
        ?.toLowerCase()
        .includes(searchText) ||
      enrollment.rollNumber
        ?.toLowerCase()
        .includes(searchText) ||
      enrollment.class?.standard
        ?.toLowerCase()
        .includes(searchText) ||
      enrollment.class?.division
        ?.toLowerCase()
        .includes(searchText)
    );
  });

  const activeCount = enrollments.filter(
    (item) => item.status === 'active',
  ).length;

  const currentYear = academicYears.find(
    (year) => year.isCurrent,
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
              <GraduationCap size={18} />
              Academic Management
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Student Enrollments
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage student admissions, classes, roll numbers and academic years.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </section>

        {/* Notifications */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Enrollments"
            value={enrollments.length}
            icon={<Users size={22} />}
          />

          <StatCard
            title="Active Enrollments"
            value={activeCount}
            icon={<GraduationCap size={22} />}
          />

          <StatCard
            title="Current Academic Year"
            value={currentYear?.yearName || 'Not configured'}
            icon={<CalendarDays size={22} />}
          />
        </section>

        {/* Enrollment Form */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Plus size={21} />
              </div>

              <div>
                <h2 className="font-bold">Enroll a Student</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Assign a student to a class for a particular academic year.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleEnrollment}
            className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3"
          >
            <FormField label="Select Student">
              <select
                name="studentId"
                value={form.studentId}
                onChange={handleFormChange}
                required
                className="form-select"
              >
                <option value="">Choose student</option>

                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.username} — {student.email}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Select Class">
              <select
                name="classId"
                value={form.classId}
                onChange={handleFormChange}
                required
                className="form-select"
              >
                <option value="">Choose class</option>

                {classes.map((schoolClass) => (
                  <option
                    key={schoolClass.id}
                    value={schoolClass.id}
                  >
                    {schoolClass.standard}
                    {schoolClass.division
                      ? ` - ${schoolClass.division}`
                      : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Academic Year">
              <select
                name="academicYearId"
                value={form.academicYearId}
                onChange={handleFormChange}
                required
                className="form-select"
              >
                <option value="">Choose academic year</option>

                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.yearName}
                    {year.isCurrent ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Roll Number">
              <input
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleFormChange}
                placeholder="e.g. 101"
                maxLength={20}
                required
                className="form-input"
              />
            </FormField>

            <FormField label="Enrollment Status">
              <select
                name="status"
                value={form.status}
                onChange={handleFormChange}
                className="form-select"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="transferred">Transferred</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </FormField>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting || loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={17} />
                {submitting ? 'Enrolling...' : 'Enroll Student'}
              </button>
            </div>
          </form>
        </section>

        {/* Enrollment Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:px-7">
            <div>
              <h2 className="font-bold">Enrollment Records</h2>
              <p className="mt-1 text-xs text-slate-500">
                View and manage existing student enrollments.
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
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search enrollments..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
                />
              </div>

              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">All academic years</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.yearName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              Loading enrollment records...
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <BookOpen size={35} className="mb-3 text-slate-300" />
              <h3 className="font-semibold">No enrollments found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Enroll a student to see records here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Academic Year</th>
                    <th className="px-6 py-4">Roll Number</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredEnrollments.map((enrollment) => (
                    <tr
                      key={enrollment.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">
                          {enrollment.student?.username}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {enrollment.student?.email}
                        </p>
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {enrollment.class?.standard}
                        {enrollment.class?.division
                          ? ` - ${enrollment.class.division}`
                          : ''}
                      </td>

                      <td className="px-6 py-4">
                        {enrollment.academicYear?.yearName}
                      </td>

                      <td className="px-6 py-4 font-semibold">
                        {enrollment.rollNumber}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={enrollment.status} />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(enrollment.id)}
                          disabled={deletingId === enrollment.id}
                          title="Delete enrollment"
                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === enrollment.id ? (
                            <RefreshCw
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
            Showing {filteredEnrollments.length} enrollment record(s)
          </div>
        </section>
      </div>

      <style jsx>{`
        .form-input,
        .form-select {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
          background: white;
          transition: border-color 0.2s;
        }

        .form-input:focus,
        .form-select:focus {
          border-color: #3b82f6;
        }
      `}</style>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    completed: 'bg-blue-50 text-blue-700',
    transferred: 'bg-amber-50 text-amber-700',
    withdrawn: 'bg-red-50 text-red-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {status}
    </span>
  );
}