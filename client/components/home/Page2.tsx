
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ClipboardList,
  Clock3,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

const features = [
  {
    number: "01",
    icon: Users,
    title: "Know how your batch is doing",
    description:
      "See how students are progressing across subjects and batches. Spot learning gaps early and understand where extra support is needed.",
    detail: "Batch-wise performance",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Tests with useful results",
    description:
      "Conduct assessments, review marks and follow student performance. Results help teachers understand what students have actually learned.",
    detail: "Exams and result tracking",
  },
  {
    number: "03",
    icon: Trophy,
    title: "Make practice competitive",
    description:
      "Use short quizzes and live contests to make revision more engaging. Give students a reason to participate after every lecture.",
    detail: "Live classroom contests",
  },
];

const learningSteps = [
  {
    icon: BookOpen,
    title: "Learn",
    description: "Attend lessons and understand new topics.",
  },
  {
    icon: Zap,
    title: "Practise",
    description: "Try questions and take part in Quickzy challenges.",
  },
  {
    icon: BarChart3,
    title: "Review",
    description: "Check results and see where you can improve.",
  },
];

export default function Page2() {
  return (
    <>
      <section className="bg-white px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">
              What you can do here
            </p>

            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              A classroom experience that doesn't stop at the classroom.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-500">
              Learning, assessment and progress belong together. The platform
              brings these parts into one place for both students and teachers.
            </p>
          </div>

          <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.number}
                  className="border-t-2 border-slate-200 pt-6 transition-colors hover:border-blue-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold tracking-wider text-slate-400">
                      {feature.number}
                    </span>
                    <Icon size={25} className="text-blue-600" />
                  </div>

                  <p className="mt-8 text-xs font-bold uppercase tracking-wider text-blue-600">
                    {feature.detail}
                  </p>

                  <h3 className="mt-3 text-xl font-bold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-slate-500">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Public Quickzy section */}
      <section className="bg-[#f4f7fc] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-blue-100 px-3 py-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              <Zap size={15} />
              Open to everyone
            </div>

            <h2 className="mt-6 max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              A little practice can go a long way.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              Quickzy is our quiz space for curious minds. Explore questions,
              test what you know and challenge yourself at your own pace.
              You don't need to be signed in to explore public quizzes.
            </p>

            <div className="mt-7 space-y-3">
              {[
                "Explore quizzes available to the public",
                "Practise topics at your own pace",
                "Challenge yourself with quick questions",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check size={14} />
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/quickzy"
              className="mt-9 inline-flex items-center gap-3 rounded-lg bg-blue-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Explore public Quickzy
              <ArrowRight size={18} />
            </Link>

            <p className="mt-3 text-xs text-slate-500">
              Public quiz access is available at /quickzy.
            </p>
          </div>

          {/* Quickzy preview */}
          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.25)] sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Quickzy
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                    Pick a topic.
                    <br />
                    Give it a try.
                  </h3>
                </div>

                <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                  <Trophy size={26} />
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
                  <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                    <BookOpen size={21} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">
                      Subject quizzes
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Revise what you've studied
                    </p>
                  </div>
                  <ArrowUpRight size={18} className="text-slate-400" />
                </div>

                <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
                  <div className="rounded-lg bg-violet-50 p-3 text-violet-600">
                    <Clock3 size={21} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">
                      Quick challenges
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Test yourself in a few minutes
                    </p>
                  </div>
                  <ArrowUpRight size={18} className="text-slate-400" />
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-slate-950 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                  Your next challenge
                </p>
                <p className="mt-2 text-lg font-bold">
                  How much do you know?
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Find out with Quickzy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning process */}
      <section
        id="how-it-works"
        className="bg-white px-5 py-24 sm:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">
                The learning cycle
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Learn it. Try it. Get better at it.
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-slate-500">
              A simple routine that connects what happens in class with how
              students practise and measure their progress.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {learningSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon size={25} />
                  </div>

                  <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step 0{index + 1}
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-slate-900">
                    {step.title}
                  </h3>

                  <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">
                    {step.description}
                  </p>

                  {index !== learningSteps.length - 1 && (
                    <div className="absolute right-0 top-7 hidden h-px w-1/3 bg-slate-200 md:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
