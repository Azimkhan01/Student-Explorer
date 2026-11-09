
const API_BASE = "/server/academic";

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(result?.message)
      ? result.message.join(", ")
      : result?.message || result?.error;

    throw new Error(
      message || `Request failed with status ${response.status}`,
    );
  }

  return (result?.data ?? result) as T;
}

// Types matching NestJS entities
export type AcademicYear = {
  id: number;
  yearName: string;
  isCurrent: boolean;
};

export type SchoolClass = {
  id: number;
  standard: string;
  division: string | null;
};

export type Subject = {
  id: number;
  subjectName: string;
  code: string;
};

export type Teacher = {
  id: number;
  username: string;
  email?: string;
};

export type Assignment = {
  id: number;
  class: SchoolClass;
  subject: Subject;
  teacher: Teacher;
  academicYear: AcademicYear;
};

export const academicService = {
  // Academic Years
  getYears: () =>
    apiRequest<AcademicYear[]>("/years"),

  createYear: (data: { yearName: string }) =>
    apiRequest<AcademicYear>("/years", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  setCurrentYear: (id: number) =>
    apiRequest<AcademicYear>(`/years/${id}/current`, {
      method: "PATCH",
    }),

  deleteYear: (id: number) =>
    apiRequest<{ message: string }>(`/years/${id}`, {
      method: "DELETE",
    }),

  // Classes
  getClasses: () =>
    apiRequest<SchoolClass[]>("/classes"),

  createClass: (data: {
    standard: string;
    division?: string | null;
  }) =>
    apiRequest<SchoolClass>("/classes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteClass: (id: number) =>
    apiRequest<{ message: string }>(`/classes/${id}`, {
      method: "DELETE",
    }),

  // Subjects
  getSubjects: () =>
    apiRequest<Subject[]>("/subjects"),

  createSubject: (data: {
    subjectName: string;
    code: string;
  }) =>
    apiRequest<Subject>("/subjects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteSubject: (id: number) =>
    apiRequest<{ message: string }>(`/subjects/${id}`, {
      method: "DELETE",
    }),

  // Class Subject Assignments
  getAssignments: () =>
    apiRequest<Assignment[]>("/assignments"),

  createAssignment: (data: {
    classId: number;
    subjectId: number;
    teacherId: number;
    academicYearId: number;
  }) =>
    apiRequest<Assignment>("/assignments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteAssignment: (id: number) =>
    apiRequest<{ message: string }>(`/assignments/${id}`, {
      method: "DELETE",
    }),
};

// Teachers
export const teacherService = {
  getTeachers: async (): Promise<Teacher[]> => {
    const response = await fetch("/server/teachers", {
      credentials: "include",
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.message || "Failed to fetch teachers",
      );
    }

    return (result?.data ?? result) as Teacher[];
  },
};
