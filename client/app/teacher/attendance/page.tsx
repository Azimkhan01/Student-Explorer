
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Search,
  Save,
  Users,
  X,
  QrCode,
  MapPin,
  Clock,
  ShieldCheck,
  Ban,
} from "lucide-react";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type ClassSubjectAssignment = {
  id: number;
  class: {
    id: number;
    standard: string;
    division: string;
  };
  subject: {
    id: number;
    subjectName: string;
    code: string;
  };
  teacher: {
    id: number;
    username: string;
    email: string;
  };
  academicYear: {
    id: number;
    yearName: string;
    isCurrent: boolean;
  };
};

type AttendanceStudent = {
  studentEnrollmentId: number;
  studentId: number;
  username: string;
  email: string;
  rollNumber: string;
  status: AttendanceStatus | null;
  remarks: string | null;
  attendanceId: number | null;
};

type AttendanceSheetResponse = {
  classSubject?: ClassSubjectAssignment;
  attendance: AttendanceStudent[];
  totalStudents?: number;
};

type QRSession = {
  sessionId: number;
  token: string;
  expiresAt: string;
  qrData: string;
};

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const statusOptions: {
  value: AttendanceStatus;
  label: string;
  active: string;
}[] = [
  {
    value: "present",
    label: "Present",
    active: "bg-emerald-600 text-white border-emerald-600",
  },
  {
    value: "absent",
    label: "Absent",
    active: "bg-red-600 text-white border-red-600",
  },
  {
    value: "late",
    label: "Late",
    active: "bg-amber-500 text-white border-amber-500",
  },
  {
    value: "excused",
    label: "Excused",
    active: "bg-blue-600 text-white border-blue-600",
  },
];

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function getLocationError(error: unknown): string {
  if (error instanceof GeolocationPositionError) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Location permission denied. Please allow location access in your browser.";
      case error.POSITION_UNAVAILABLE:
        return "Your current location is unavailable. Please try again.";
      case error.TIMEOUT:
        return "Getting your location timed out. Please try again.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Unable to get your location.";
}

function formatRemainingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

export default function AttendancePage() {
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState("");

  const [attendanceDate, setAttendanceDate] = useState(getToday());
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [search, setSearch] = useState("");

  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // QR session state
  const [qrSession, setQrSession] = useState<QRSession | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrSuccess, setQrSuccess] = useState("");
  const [closingSession, setClosingSession] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [sessionClosed, setSessionClosed] = useState(false);

  const selectedClassSubjectId = Number(selectedAssignment);

  // --------------------------------------------------
  // 1. Load teacher assignments
  // --------------------------------------------------

  const fetchAssignments = useCallback(async () => {
    try {
      setLoadingAssignments(true);
      setError("");

      const response = await fetch("/server/academic/assignments", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to load class assignments.");
      }

      const data: ClassSubjectAssignment[] = await response.json();

      setAssignments(data);

      const currentAssignment = data.find(
        (assignment) => assignment.academicYear.isCurrent,
      );

      if (currentAssignment) {
        setSelectedAssignment(String(currentAssignment.id));
      } else if (data.length > 0) {
        setSelectedAssignment(String(data[0].id));
      } else {
        setSelectedAssignment("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // --------------------------------------------------
  // 2. Load attendance sheet
  // --------------------------------------------------

  const fetchAttendance = useCallback(
    async (showLoading = true) => {
      if (!selectedAssignment || !attendanceDate) return;

      try {
        if (showLoading) {
          setLoadingAttendance(true);
        }

        const params = new URLSearchParams({
          classSubjectId: String(selectedClassSubjectId),
          attendanceDate,
        });

        const response = await fetch(
          `/server/attendance/sheet?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error("Unable to load attendance sheet.");
        }

        const data: AttendanceSheetResponse = await response.json();
        setStudents(data.attendance ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (showLoading) {
          setLoadingAttendance(false);
        }
      }
    },
    [selectedAssignment, selectedClassSubjectId, attendanceDate],
  );

  useEffect(() => {
    if (selectedAssignment && attendanceDate) {
      setSuccess("");
      fetchAttendance();
    } else {
      setStudents([]);
    }
  }, [selectedAssignment, attendanceDate, fetchAttendance]);

  // Reset QR session when assignment/date changes.
  // The previous session should be closed before changing the selection.
  useEffect(() => {
    setQrSession(null);
    setQrError("");
    setQrSuccess("");
    setSessionClosed(false);
    setRemainingSeconds(0);
  }, [selectedAssignment, attendanceDate]);

  // --------------------------------------------------
  // 3. QR countdown
  // --------------------------------------------------

  useEffect(() => {
    if (!qrSession || sessionClosed) return;

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(qrSession.expiresAt).getTime() - Date.now()) / 1000,
        ),
      );

      setRemainingSeconds(remaining);

      if (remaining === 0) {
        setSessionClosed(true);
      }
    };

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [qrSession, sessionClosed]);

  // --------------------------------------------------
  // 4. Automatically refresh attendance while QR active
  // --------------------------------------------------

  useEffect(() => {
    if (!qrSession || sessionClosed) return;

    const interval = window.setInterval(() => {
      fetchAttendance(false);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [qrSession, sessionClosed, fetchAttendance]);

  // --------------------------------------------------
  // 5. Create QR session using teacher GPS
  // --------------------------------------------------

  const createQRSession = async () => {
    if (!selectedClassSubjectId || !attendanceDate) {
      setQrError("Please select a class, subject and date.");
      return;
    }

    if (attendanceDate !== getToday()) {
      setQrError("QR attendance can only be started for today's date.");
      return;
    }

    try {
      setQrLoading(true);
      setQrError("");
      setQrSuccess("");
      setQrSession(null);
      setSessionClosed(false);

      // Get teacher's current GPS position.
      const position = await getPosition();

      const { latitude, longitude, accuracy } = position.coords;

      if (accuracy > 2000) {
        throw new Error(
          `GPS accuracy is too low (${Math.round(
            accuracy,
          )} metres). Please move to an open area and try again.`,
        );
      }

      const response = await fetch("/server/attendance/session/create", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classSubjectId: selectedClassSubjectId,
          attendanceDate,
          latitude,
          longitude,
          durationMinutes,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message = Array.isArray(result?.message)
          ? result.message.join(", ")
          : result?.message;

        throw new Error(message || "Unable to create QR session.");
      }

      const sessionId = Number(result?.sessionId ?? result?.id);
      const token = result?.token;
      const expiresAt = result?.expiresAt;

      if (!sessionId || !token || !expiresAt) {
        throw new Error(
          "Invalid response from server. Expected sessionId, token and expiresAt.",
        );
      }

      const qrData = JSON.stringify({
        sessionId,
        token,
      });

      setQrSession({
        sessionId,
        token,
        expiresAt,
        qrData,
      });

      setQrSuccess("QR attendance session created successfully.");
      setRemainingSeconds(
        Math.max(
          0,
          Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
        ),
      );
    } catch (err) {
      if (
        err instanceof Error &&
        "code" in err
      ) {
        setQrError(getLocationError(err));
      } else {
        setQrError(
          err instanceof Error ? err.message : "Unable to create QR session.",
        );
      }
    } finally {
      setQrLoading(false);
    }
  };

  // --------------------------------------------------
  // 6. Close QR session
  // --------------------------------------------------

  const closeQRSession = async () => {
    if (!qrSession) return;

    try {
      setClosingSession(true);
      setQrError("");
      setQrSuccess("");

      const response = await fetch(
        `/server/attendance/session/${qrSession.sessionId}/close`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message || "Unable to close QR attendance session.",
        );
      }

      setSessionClosed(true);
      setRemainingSeconds(0);
      setQrSuccess("QR attendance session closed successfully.");

      await fetchAttendance(false);
    } catch (err) {
      setQrError(
        err instanceof Error ? err.message : "Unable to close QR session.",
      );
    } finally {
      setClosingSession(false);
    }
  };

  // --------------------------------------------------
  // 7. Update one student's attendance
  // --------------------------------------------------

  const updateStudentStatus = (
    enrollmentId: number,
    status: AttendanceStatus,
  ) => {
    setStudents((previous) =>
      previous.map((student) =>
        student.studentEnrollmentId === enrollmentId
          ? { ...student, status }
          : student,
      ),
    );

    setSuccess("");
  };

  // --------------------------------------------------
  // 8. Mark all students
  // --------------------------------------------------

  const markAll = (status: AttendanceStatus) => {
    setStudents((previous) =>
      previous.map((student) => ({
        ...student,
        status,
      })),
    );

    setSuccess("");
  };

  // --------------------------------------------------
  // 9. Statistics
  // --------------------------------------------------

  const stats = useMemo(() => {
    return {
      total: students.length,
      present: students.filter((s) => s.status === "present").length,
      absent: students.filter((s) => s.status === "absent").length,
      late: students.filter((s) => s.status === "late").length,
      excused: students.filter((s) => s.status === "excused").length,
      unmarked: students.filter((s) => !s.status).length,
    };
  }, [students]);

  // --------------------------------------------------
  // 10. Search students
  // --------------------------------------------------

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return students;

    return students.filter(
      (student) =>
        student.username.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.rollNumber.toLowerCase().includes(query),
    );
  }, [students, search]);

  // --------------------------------------------------
  // 11. Save manual attendance
  // --------------------------------------------------

  const saveAttendance = async () => {
    if (!selectedAssignment || !selectedClassSubjectId) {
      setError("Please select a class and subject.");
      return;
    }

    if (stats.total === 0) {
      setError("There are no students to mark attendance.");
      return;
    }

    const markedStudents = students.filter(
      (student) => student.status !== null,
    );

    if (markedStudents.length === 0) {
      setError("Please mark attendance for at least one student.");
      return;
    }

    const payload = {
      classSubjectId: selectedClassSubjectId,
      attendanceDate,
      records: markedStudents.map((student) => ({
        studentEnrollmentId: student.studentEnrollmentId,
        status: student.status,
        remarks: student.remarks ?? undefined,
      })),
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/server/attendance/bulk", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message = Array.isArray(result?.message)
          ? result.message.join(", ")
          : result?.message;

        throw new Error(
          message || `Request failed with status ${response.status}`,
        );
      }

      setSuccess("Attendance saved successfully!");
      await fetchAttendance(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving attendance.",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedAssignmentData = assignments.find(
    (assignment) => assignment.id === selectedClassSubjectId,
  );

  const qrIsActive =
    !!qrSession && !sessionClosed && remainingSeconds > 0;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <ClipboardCheck size={17} />
              Teacher Portal
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Attendance Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage manual and QR-based student attendance.
            </p>
          </div>

          <button
            onClick={() => fetchAttendance()}
            disabled={!selectedAssignment || loadingAttendance}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loadingAttendance ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Assignment and Date Selection */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <CalendarDays size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Attendance Details
              </h2>
              <p className="text-xs text-slate-500">
                Select your assigned class, subject and date.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Class and Subject
              </label>

              <select
                value={selectedAssignment}
                onChange={(e) => setSelectedAssignment(e.target.value)}
                disabled={loadingAssignments || assignments.length === 0 || qrIsActive}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="">
                  {loadingAssignments
                    ? "Loading assignments..."
                    : assignments.length === 0
                      ? "No assignments available"
                      : "Select class and subject"}
                </option>

                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.class.standard} {assignment.class.division}
                    {" — "}
                    {assignment.subject.subjectName}
                    {" ("}
                    {assignment.academicYear.yearName}
                    {") "}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Attendance Date
              </label>

              <input
                type="date"
                value={attendanceDate}
                max={getToday()}
                disabled={qrIsActive}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>
          </div>

          {selectedAssignmentData && (
            <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Class</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {selectedAssignmentData.class.standard}{" "}
                  {selectedAssignmentData.class.division}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Subject</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {selectedAssignmentData.subject.subjectName}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Academic Year</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {selectedAssignmentData.academicYear.yearName}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Error and Success */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <Check size={18} />
            {success}
          </div>
        )}

        {/* QR Attendance Section */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                <QrCode size={23} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  QR Code Attendance
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Generate a temporary QR code using your current GPS location.
                </p>
              </div>
            </div>

            {qrIsActive && (
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Session Active
              </span>
            )}
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-2">

            {/* QR settings */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="text-violet-600" size={20} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Teacher GPS Verification
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Your location is captured when the session starts.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  QR Code Validity
                </label>

                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  disabled={qrLoading || qrIsActive}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 disabled:bg-slate-100"
                >
                  <option value={3}>3 minutes</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                </select>
              </div>

              <div className="rounded-xl bg-blue-50 p-4">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={18} className="mt-0.5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Location-based verification
                    </p>
                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      Students must share their GPS location while scanning.
                      The backend compares their location with the teacher's
                      session location.
                    </p>
                  </div>
                </div>
              </div>

              {qrError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {qrError}
                </div>
              )}

              {qrSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {qrSuccess}
                </div>
              )}

              {!qrIsActive ? (
                <button
                  type="button"
                  onClick={createQRSession}
                  disabled={
                    qrLoading ||
                    !selectedAssignment ||
                    loadingAssignments ||
                    attendanceDate !== getToday()
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {qrLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Getting GPS / Creating QR...
                    </>
                  ) : (
                    <>
                      <QrCode size={18} />
                      Generate QR Code
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeQRSession}
                  disabled={closingSession}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {closingSession ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Closing Session...
                    </>
                  ) : (
                    <>
                      <Ban size={18} />
                      Close QR Session
                    </>
                  )}
                </button>
              )}

              {attendanceDate !== getToday() && (
                <p className="text-xs text-amber-700">
                  QR sessions can only be generated for today's attendance.
                </p>
              )}
            </div>

            {/* QR display */}
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
              {qrSession && qrIsActive ? (
                <>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <QRCodeSVG
                      value={qrSession.qrData}
                      size={220}
                      level="H"
                      includeMargin
                    />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    Scan to Mark Attendance
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Students should scan this code using their attendance scanner.
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-bold tabular-nums text-amber-700">
                    <Clock size={17} />
                    {formatRemainingTime(remainingSeconds)}
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Session ID: {qrSession.sessionId}
                  </p>
                </>
              ) : qrSession && sessionClosed ? (
                <>
                  <div className="rounded-full bg-red-100 p-4 text-red-600">
                    <X size={30} />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">
                    QR Session Expired / Closed
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Generate a new QR code to start another session.
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-violet-100 p-4 text-violet-600">
                    <QrCode size={34} />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-800">
                    QR Code Will Appear Here
                  </h3>

                  <p className="mt-1 max-w-xs text-sm text-slate-500">
                    Select your class and validity, then generate a QR code.
                    Your browser will request GPS permission.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Total Students"
            value={stats.total}
            icon={<Users size={19} />}
            color="text-slate-700 bg-slate-100"
          />

          <StatCard
            label="Present"
            value={stats.present}
            icon={<Check size={19} />}
            color="text-emerald-700 bg-emerald-50"
          />

          <StatCard
            label="Absent"
            value={stats.absent}
            icon={<X size={19} />}
            color="text-red-700 bg-red-50"
          />

          <StatCard
            label="Late"
            value={stats.late}
            icon={<CalendarDays size={19} />}
            color="text-amber-700 bg-amber-50"
          />

          <StatCard
            label="Excused"
            value={stats.excused}
            icon={<CheckCheck size={19} />}
            color="text-blue-700 bg-blue-50"
          />

          <StatCard
            label="Unmarked"
            value={stats.unmarked}
            icon={<ClipboardCheck size={19} />}
            color="text-orange-700 bg-orange-50"
          />
        </section>

        {/* Attendance Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-semibold text-slate-900">
                Student Attendance
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Select an attendance status for each student.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search students..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 sm:w-56"
                />
              </div>

              <button
                onClick={() => markAll("present")}
                disabled={students.length === 0 || loadingAttendance}
                className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                Mark All Present
              </button>

              <button
                onClick={saveAttendance}
                disabled={saving || stats.total === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Save Attendance
                  </>
                )}
              </button>
            </div>
          </div>

          {loadingAttendance ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3">
              <Loader2 size={30} className="animate-spin text-blue-600" />
              <p className="text-sm text-slate-500">
                Loading attendance sheet...
              </p>
            </div>
          ) : !selectedAssignment ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <ClipboardCheck size={35} className="text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">
                Select a class and subject
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Your attendance sheet will appear here.
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <Users size={35} className="text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">
                No students found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                There are no enrolled students for this class and academic year.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No students match your search.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Roll No.</th>
                      <th className="px-5 py-4">Student</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Attendance Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.studentEnrollmentId}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {student.rollNumber}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-900">
                          {student.username}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {student.email}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {statusOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  updateStudentStatus(
                                    student.studentEnrollmentId,
                                    option.value,
                                  )
                                }
                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                                  student.status === option.value
                                    ? option.active
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col justify-between gap-4 border-t border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:items-center">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {stats.total - stats.unmarked}
                  </span>{" "}
                  of {stats.total} students marked
                  {stats.unmarked > 0 && (
                    <span className="ml-2 text-orange-600">
                      ({stats.unmarked} unmarked)
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

// --------------------------------------------------
// Reusable Statistics Card
// --------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}
      >
        {icon}
      </div>

      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
