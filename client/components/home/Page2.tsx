
"use client";

import React from "react";
import {
  BarChart3,
  Trophy,
  ClipboardCheck,
  Zap,
  BookOpenCheck,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

function Page2() {
  const features = [
    {
      icon: BarChart3,
      title: "Batch-wise Performance",
      description:
        "Track the academic performance of every batch and understand how students are progressing through their learning journey.",
      color: "blue",
      metric: "Every batch",
    },
    {
      icon: ClipboardCheck,
      title: "Exam & Result Tracking",
      description:
        "Conduct regular examinations, evaluate student knowledge, and provide detailed results to identify strengths and weaknesses.",
      color: "violet",
      metric: "Real-time results",
    },
    {
      icon: Trophy,
      title: "Live Test Contests",
      description:
        "Organize exciting live quizzes and competitive tests after every lecture to keep students engaged and motivated.",
      color: "amber",
      metric: "After every lecture",
    },
  ];

  const styles: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  const benefits = [
    "Monitor every batch's learning progress",
    "Evaluate understanding after each lecture",
    "Identify students who need extra attention",
    "Encourage participation through live competitions",
  ];

  const steps = [
    {
      icon: BookOpenCheck,
      title: "Attend Lecture",
      desc: "Learn new concepts",
    },
    {
      icon: ClipboardCheck,
      title: "Take Live Test",
      desc: "Test understanding",
    },
    {
      icon: Trophy,
      title: "Join Competition",
      desc: "Challenge other students",
    },
    {
      icon: BarChart3,
      title: "Analyze Performance",
      desc: "Track progress and results",
    },
  ];

  return (
    <section className="relative isolate overflow-x-clip bg-white px-5 py-24 sm:px-8 lg:px-16">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-40 top-20 -z-10 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 -z-10 h-96 w-96 rounded-full bg-indigo-100/50 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        {/* Heading */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <Zap size={16} />
            Smart Learning & Performance
          </span>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Every Lecture.
            <span className="block text-blue-600">
              Every Test. Every Progress.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
            Learning doesn't end when a lecture finishes. We continuously
            monitor student participation, conduct live contests, and track
            batch-wise academic performance to ensure every student stays
            engaged and keeps improving.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <div
                key={index}
                className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${styles[feature.color]}`}
                  >
                    <Icon size={27} />
                  </div>

                  <ArrowUpRight
                    className="text-slate-300 transition group-hover:text-blue-600"
                    size={22}
                  />
                </div>

                <p className="mt-8 text-sm font-semibold text-blue-600">
                  {feature.metric}
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-slate-500">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom highlight */}
        <div className="mt-12 overflow-hidden rounded-3xl bg-slate-950 p-8 sm:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-400">
                Beyond Traditional Learning
              </span>

              <h3 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
                We don't just track attendance.
                <span className="text-blue-400">
                  {" "}We track actual learning.
                </span>
              </h3>

              <p className="mt-5 leading-8 text-slate-400">
                With post-lecture assessments, live competitions, and detailed
                performance analytics, we make sure students actively
                participate instead of simply attending classes.
              </p>

              <div className="mt-8 space-y-4">
                {benefits.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2
                      className="shrink-0 text-blue-400"
                      size={20}
                    />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning workflow visual */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Learning cycle</p>
                  <h4 className="mt-1 text-xl font-bold text-white">
                    Every Lecture Counts
                  </h4>
                </div>

                <div className="rounded-xl bg-blue-500/20 p-3 text-blue-400">
                  <TrendingUp size={25} />
                </div>
              </div>

              <div className="mt-8 space-y-5">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;

                  return (
                    <div
                      key={step.title}
                      className="flex items-center gap-4"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                        <StepIcon size={22} />
                      </div>

                      <div className="flex-1">
                        <h5 className="font-semibold text-white">
                          {step.title}
                        </h5>
                        <p className="mt-1 text-sm text-slate-400">
                          {step.desc}
                        </p>
                      </div>

                      <span className="text-xs font-bold text-slate-500">
                        0{index + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-center">
                <p className="text-sm font-semibold text-blue-300">
                  Continuous Learning. Measurable Improvement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Page2;
