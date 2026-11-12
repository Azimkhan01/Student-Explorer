
"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, PlayCircle, CheckCircle2 } from "lucide-react";

function Hero() {
  return (
    <section className="relative isolate  bg-white px-5 pb-24 pt-20 sm:px-8 lg:pt-28">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-100/60 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 -z-10 h-72 w-72 rounded-full bg-indigo-100/50 blur-[100px]" />

      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <Sparkles size={16} />
            Smarter Learning. Better Results.
          </div>

          {/* Main heading */}
          <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Your Learning Journey,
            <span className="mt-2 block bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
              Reimagined.
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
            Learn smarter with structured lectures, interactive live tests,
            competitive quizzes, and detailed performance tracking.
            Everything you need to stay ahead, all in one place.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-xl sm:w-auto"
            >
              Start Learning
              <ArrowRight
                size={19}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

            <Link
              href="/admin/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-4 font-semibold text-slate-700 transition-all duration-300 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 sm:w-auto"
            >
              <PlayCircle size={19} />
              Admin Portal
            </Link>
          </div>

          {/* Trust points */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-blue-600" />
              Interactive Learning
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-blue-600" />
              Live Test Contests
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-blue-600" />
              Performance Analytics
            </span>
          </div>
        </div>

        {/* Bottom visual */}
        <div className="relative mx-auto mt-20 max-w-5xl">
          <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-r from-blue-200/50 via-indigo-200/40 to-blue-100/50 blur-2xl" />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10 sm:p-5">
            <div className="rounded-xl bg-slate-50 p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Your learning dashboard
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                    Learn. Practice. Improve.
                  </h3>
                </div>

                <div className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                  Student Portal
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">Learning</p>
                  <h4 className="mt-2 text-xl font-bold text-slate-900">
                    Structured
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Lecture-based learning
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">Assessments</p>
                  <h4 className="mt-2 text-xl font-bold text-slate-900">
                    Interactive
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Tests after lectures
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">Progress</p>
                  <h4 className="mt-2 text-xl font-bold text-slate-900">
                    Measurable
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Track academic growth
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white sm:p-8">
                <p className="text-sm font-medium text-blue-100">
                  The Student Explorer Experience
                </p>
                <h4 className="mt-2 text-2xl font-bold sm:text-3xl">
                  Every lesson takes you one step forward.
                </h4>
                <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
                  Practice regularly, compete with fellow students, and
                  understand your progress with every assessment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
