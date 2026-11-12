
"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";

function Navbar() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <GraduationCap size={24} />
          </div>

          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            Student
            <span className="ml-1 text-blue-600">Explorer</span>
            <span className="text-blue-600">.</span>
          </span>
        </Link>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/admin/login"
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-blue-600"
          >
            Admin Portal
          </Link>

          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-lg"
          >
            Student Login
            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenu(!mobileMenu)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 sm:hidden"
          aria-label={mobileMenu ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenu}
        >
          {mobileMenu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile navigation */}
      {mobileMenu && (
        <div className="border-t border-slate-100 bg-white px-5 py-5 shadow-lg sm:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenu(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
            >
              Student Login
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/admin/login"
              onClick={() => setMobileMenu(false)}
              className="rounded-xl border border-slate-200 px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
