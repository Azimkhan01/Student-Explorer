
'use client';

import React from 'react';
import Link from 'next/link';
import { Home, LogIn, ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-[#050b1f] flex items-center justify-center px-6 py-12 text-white">

            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full" />

                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                        backgroundSize: '45px 45px',
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-2xl text-center">

                {/* Icon */}
                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-400/20 bg-blue-500/10 shadow-[0_0_60px_rgba(59,130,246,0.15)]">
                    <Compass className="h-10 w-10 text-blue-400" />
                </div>

                {/* 404 */}
                <div className="relative">
                    <h1 className="select-none text-[120px] sm:text-[180px] font-black leading-none tracking-tighter bg-gradient-to-b from-white via-blue-200 to-blue-500 bg-clip-text text-transparent">
                        404
                    </h1>

                    <div className="absolute inset-0 -z-10 blur-3xl opacity-20 text-blue-500 text-[120px] sm:text-[180px] font-black">
                        404
                    </div>
                </div>

                {/* Heading */}
                <h2 className="mt-5 text-2xl sm:text-4xl font-bold tracking-tight">
                    Lost in the digital space?
                </h2>

                <p className="mx-auto mt-4 max-w-md text-sm sm:text-base leading-7 text-slate-400">
                    Oops! The page you're looking for doesn't exist,
                    has been moved, or you may have followed an
                    incorrect link.
                </p>

                {/* Divider */}
                <div className="mx-auto my-9 h-px w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-center gap-4">

                    <Link
                        href="/"
                        className="group flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 font-semibold shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-blue-500 hover:shadow-blue-500/30"
                    >
                        <Home size={19} />
                        Go to Home
                    </Link>

                    <Link
                        href="/login"
                        className="group flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 font-semibold text-slate-200 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:bg-blue-500/10"
                    >
                        <LogIn size={19} />
                        Go to Login
                    </Link>

                </div>

                {/* Back Button */}
                <button
                    onClick={() => window.history.back()}
                    className="mt-8 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-blue-400"
                >
                    <ArrowLeft size={16} />
                    Take me back
                </button>

                {/* Footer */}
                <div className="mt-16 text-xs tracking-widest text-slate-600 uppercase">
                    Something went wrong? Let's get you back on track.
                </div>

            </div>
        </main>
    );
}
