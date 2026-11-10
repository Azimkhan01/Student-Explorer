"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Camera,
  X,
  Navigation,
  BookOpen,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type AttendanceRecord = {
  id: number;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks?: string | null;
  subjectName: string;
  subjectCode?: string;
};

type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
};

type QRPayload = {
  sessionId: number;
  token: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

const emptySummary: AttendanceSummary = {
  total: 0,
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  percentage: 0,
};

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const earthRadius = 6371000;

  const toRadians = (value: number) => (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "Location permission denied. Please allow location access.",
          2: "Your current location could not be determined.",
          3: "Location request timed out. Please try again.",
        };

        reject(
          new Error(messages[error.code] || "Unable to access your location."),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const styles: Record<AttendanceStatus, string> = {
    present: "bg-green-50 text-green-700 border-green-200",
    absent: "bg-red-50 text-red-700 border-red-200",
    late: "bg-yellow-50 text-yellow-700 border-yellow-200",
    excused: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function StudentAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>(emptySummary);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [locationInfo, setLocationInfo] = useState("");

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  // Fetch student attendance history
  const fetchAttendance = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        else setRefreshing(true);

        setError("");

        const response = await fetch(
          `/server/attendance/student/me?month=${month}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "Unable to load attendance.");
        }

        setRecords(result.records ?? []);
        setSummary(result.summary ?? emptySummary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month],
  );

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Stop camera scanner
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        await scanner.clear();
      } catch (err) {
        console.warn("Scanner cleanup:", err);
      }

      scannerRef.current = null;
    }

    setScanning(false);
  }, []);

  // Verify QR and mark attendance

  const handleQRScan = useCallback(
    async (decodedText: string) => {
      if (processingRef.current) return;

      processingRef.current = true;
      setProcessing(true);
      setError("");
      setSuccess("");
      setLocationInfo("Reading QR code...");

      await stopScanner();

      try {
        // STEP 1: Read QR code
        let qr: QRPayload;

        try {
          qr = JSON.parse(decodedText);
        } catch {
          throw new Error("Invalid QR code format.");
        }

        // STEP 2: Validate QR payload
        if (
          !qr ||
          !Number.isInteger(qr.sessionId) ||
          qr.sessionId <= 0 ||
          typeof qr.token !== "string" ||
          !qr.token
        ) {
          throw new Error("Invalid attendance QR information.");
        }

        setLocationInfo("Getting your current GPS location...");

        // STEP 3: Get student's current GPS location
        const location = await getCurrentLocation();

        if (location.accuracy > 50) {
          throw new Error(
            `GPS accuracy is ${Math.round(
              location.accuracy,
            )}m. Please move to an open area and try again.`,
          );
        }

        setLocationInfo(
          "GPS location captured. Verifying classroom location...",
        );

        // STEP 4: Send QR and GPS to backend
        const response = await fetch("/server/attendance/qr/mark", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            qrData: decodedText,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          const message = Array.isArray(result?.message)
            ? result.message.join(", ")
            : result?.message;

          throw new Error(message || "Unable to mark attendance.");
        }

        // STEP 5: Attendance successfully marked
        setSuccess(
          result?.message || "Your attendance has been marked successfully!",
        );

        setLocationInfo(
          `Location verified. Distance from classroom: ${
            result?.data?.distanceMeters ?? "Verified"
          }${typeof result?.data?.distanceMeters === "number" ? "m" : ""}`,
        );

        // STEP 6: Refresh attendance history
        await fetchAttendance(false);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to verify your attendance.",
        );
      } finally {
        setProcessing(false);
        processingRef.current = false;
      }
    },
    [fetchAttendance, stopScanner],
  );

  // Start camera when scanner dialog opens
  const startScanner = async () => {
    setError("");
    setScanning(false);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is unavailable. Open this website using HTTPS or localhost.",
        );
      }

      // Make sure an older scanner is stopped first.
      await stopScanner();

      const scanner = new Html5Qrcode("student-qr-reader");
      scannerRef.current = scanner;

      // This call is triggered directly by the Start Camera button.
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          void handleQRScan(decodedText);
        },
        () => {
          // Ignore individual frame decoding errors.
        },
      );

      setScanning(true);
    } catch (err) {
      console.error("Safari camera error:", err);

      const message =
        err instanceof Error ? err.message : "Unable to access the camera.";

      setError(`${message} Check Safari camera permissions and try again.`);

      await stopScanner();
    }
  };

  const openScanner = () => {
    setError("");
    setSuccess("");
    setLocationInfo("");
    setScannerOpen(true);
  };

  const closeScanner = async () => {
    await stopScanner();
    setScannerOpen(false);
  };

  const attendancePercentage = Math.min(100, Math.max(0, summary.percentage));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600">Student Portal</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              My Attendance
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Track your attendance and scan your classroom QR code.
            </p>
          </div>

          <button
            onClick={openScanner}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <QrCode size={19} />
            Scan Attendance QR
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Attendance Percentage
              </p>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <ShieldCheck size={21} />
              </div>
            </div>

            <h2 className="mt-4 text-3xl font-bold text-slate-900">
              {loading ? "--" : `${attendancePercentage.toFixed(1)}%`}
            </h2>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${attendancePercentage}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">Overall attendance</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Present</p>
              <div className="rounded-xl bg-green-50 p-2.5 text-green-600">
                <CheckCircle2 size={21} />
              </div>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">
              {loading ? "--" : summary.present}
            </h2>
            <p className="mt-2 text-xs text-slate-400">Classes attended</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Absent</p>
              <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
                <XCircle size={21} />
              </div>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">
              {loading ? "--" : summary.absent}
            </h2>
            <p className="mt-2 text-xs text-slate-400">Classes missed</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Late</p>
              <div className="rounded-xl bg-yellow-50 p-2.5 text-yellow-600">
                <Clock size={21} />
              </div>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">
              {loading ? "--" : summary.late}
            </h2>
            <p className="mt-2 text-xs text-slate-400">Late arrivals</p>
          </div>
        </div>

        {/* QR scanner banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg md:p-8">
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex rounded-lg bg-white/15 p-2">
                <QrCode size={24} />
              </div>

              <h2 className="text-xl font-bold md:text-2xl">
                Mark your attendance instantly
              </h2>

              <p className="mt-2 text-sm leading-6 text-blue-100">
                Scan the QR code displayed by your teacher. Your location will
                be verified before attendance is recorded.
              </p>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-blue-100">
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} />
                  GPS verification
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  Secure verification
                </span>
              </div>
            </div>

            <button
              onClick={openScanner}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              <Camera size={19} />
              Open Scanner
            </button>
          </div>

          <QrCode
            className="absolute -bottom-12 -right-5 text-white opacity-10"
            size={220}
          />
        </div>

        {/* Attendance history */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center">
            <div>
              <h2 className="font-bold text-slate-900">Attendance History</h2>
              <p className="mt-1 text-sm text-slate-500">
                View your subject-wise attendance records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
              />

              <button
                onClick={() => fetchAttendance(false)}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw className="animate-spin text-blue-600" size={28} />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">
                <CalendarDays size={32} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-800">
                No attendance records found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Your attendance records will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Subject</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Remarks</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {formatDate(record.attendanceDate)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                            <BookOpen size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {record.subjectName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {record.subjectCode || "Subject"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={record.status} />
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {record.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-bold text-slate-900">Scan Attendance QR</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Position the QR code inside the scanner.
                </p>
              </div>

              <button
                onClick={closeScanner}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="overflow-hidden rounded-xl bg-slate-950 p-2">
                <div id="student-qr-reader" className="w-full" />
                {!scanning && !processing && (
                  <button
                    onClick={startScanner}
                    className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Camera size={18} className="mr-2 inline" />
                    Start Camera
                  </button>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                <Navigation size={19} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Location verification enabled</p>
                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Keep your device location enabled. You must be within the
                    permitted distance of the classroom.
                  </p>
                </div>
              </div>

              {scanning && (
                <p className="text-center text-xs font-medium text-green-600">
                  Camera is active. Waiting for QR code...
                </p>
              )}

              {processing && (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                  <RefreshCw size={16} className="animate-spin" />
                  Verifying QR code and GPS location...
                </div>
              )}

              {locationInfo && (
                <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-600">
                  {locationInfo}
                </p>
              )}

              <button
                onClick={closeScanner}
                className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
