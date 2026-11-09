
"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPassword() {

    const router = useRouter();
    const searchParams = useSearchParams();

    const email = searchParams.get("email") || "";
    const role = searchParams.get("role") || "";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const apiRequest = async (
        endpoint: string,
        method: string,
        body?: object
    ) => {

        const response = await fetch(
            `/server/${endpoint.replace(/^\/+/, "")}`,
            {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong.");
        }

        return data;
    };

    const handleResetPassword = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        if (!email || !["student", "teacher"].includes(role)) {
            setError("Invalid password reset session. Please verify your OTP again.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {

            setLoading(true);

            const response = await apiRequest(
                "auth/reset-password",
                "POST",
                {
                    email,
                    role,
                    newPassword
                }
            );

            if (response.status === true) {

                setSuccess("Password reset successfully!");

                setNewPassword("");
                setConfirmPassword("");

                setTimeout(() => {
                    router.push("/login");
                }, 1500);

            } else {

                setError(
                    response.message || "Unable to reset password."
                );

            }

        } catch (err) {

            setError(
                err instanceof Error
                    ? err.message
                    : "Password reset failed."
            );

        } finally {

            setLoading(false);

        }
    };

    return (

        <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-10">

            <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-7 shadow-2xl">

                {/* HEADER */}

                <div className="mb-8 text-center">

                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-2xl text-blue-400">
                        🔐
                    </div>

                    <h1 className="text-2xl font-bold text-white">
                        Reset Password
                    </h1>

                    <p className="mt-2 text-sm text-gray-400">
                        Create a new password for your account.
                    </p>

                </div>

                {/* ACCOUNT DETAILS */}

                <div className="mb-6 rounded-lg border border-gray-800 bg-gray-800/50 p-4">

                    <p className="text-xs text-gray-500">
                        Account Email
                    </p>

                    <p className="mt-1 break-all text-sm font-medium text-white">
                        {email}
                    </p>

                    <p className="mt-2 text-xs capitalize text-gray-500">
                        Account Type: {role}
                    </p>

                </div>

                {/* ERROR */}

                {error && (

                    <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>

                )}

                {/* SUCCESS */}

                {success && (

                    <div className="mb-5 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                        {success}
                    </div>

                )}

                {/* RESET FORM */}

                <form
                    onSubmit={handleResetPassword}
                    className="space-y-5"
                >

                    <div>

                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            New Password
                        </label>

                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            minLength={8}
                            required
                            autoComplete="new-password"
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-500"
                        />

                    </div>

                    <div>

                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            Confirm New Password
                        </label>

                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            minLength={8}
                            required
                            autoComplete="new-password"
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-500"
                        />

                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email || !role}
                        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Resetting Password..." : "Reset Password"}
                    </button>

                </form>

                <div className="mt-8 border-t border-gray-800 pt-5 text-center">

                    <a
                        href="/login"
                        className="text-sm text-gray-400 transition hover:text-blue-400"
                    >
                        ← Back to Login
                    </a>

                </div>

            </div>

        </main>
    );
}

export default ResetPassword;
