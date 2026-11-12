
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  CirclePlay,
  ClipboardCheck,
  Trophy,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="overflow-hidden bg-[#f8faff]">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-28">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-md border border-blue-100 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            A better way to learn
          </div>

          <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[68px]">
            Learn at your pace.
            <span className="mt-2 block text-blue-600">
              Know how far you've come.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            Your classes, tests, results and learning progress — all in one
            place. Spend less time figuring out what to study next and more
            time getting better at it.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-3 rounded-lg bg-blue-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Go to student portal
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/quickzy"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-4 text-sm font-bold text-slate-800 transition hover:border-blue-300 hover:text-blue-700"
            >
              Try Quickzy
              <ArrowUpRight size={17} />
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-slate-200 pt-6 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <BookOpen size={17} className="text-blue-600" />
              Organised lessons
            </span>
            <span className="flex items-center gap-2">
              <ClipboardCheck size={17} className="text-blue-600" />
              Regular assessments
            </span>
            <span className="flex items-center gap-2">
              <ChartNoAxesCombined size={17} className="text-blue-600" />
              Progress reports
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[540px]">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-200/50 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-indigo-200/50 blur-3xl" />

          <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.25)] sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Student workspace
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Your learning overview
                </h2>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <ChartNoAxesCombined size={23} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Learning
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  Lessons
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Follow your class schedule
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-medium text-blue-700">
                  Practice
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  Quickzy
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Put your knowledge to work
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Keep your learning moving
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Learn something. Test yourself. Improve.
                  </p>
                </div>
                <CirclePlay size={25} className="text-blue-600" />
              </div>

              <div className="mt-5 space-y-4">
                {[
                  { icon: BookOpen, label: "Attend your lecture" },
                  { icon: ClipboardCheck, label: "Attempt a practice test" },
                  { icon: Trophy, label: "Check your results" },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Icon size={18} />
                      </div>
                      <p className="flex-1 text-sm font-medium text-slate-700">
                        {item.label}
                      </p>
                      <span className="text-xs font-semibold text-slate-400">
                        0{index + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              href="/quickzy"
              className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 p-4 text-white transition hover:bg-blue-950"
            >
              <div>
                <p className="text-sm font-bold">Ready for a quick challenge?</p>
                <p className="mt-1 text-xs text-slate-300">
                  Explore public Quickzy quizzes
                </p>
              </div>
              <ArrowUpRight size={20} />
            </Link>
          </div>

          <div className="absolute -bottom-6 -right-3 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:block">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <Trophy size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Learn by doing
                </p>
                <p className="text-[11px] text-slate-500">
                  Practice makes progress
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
