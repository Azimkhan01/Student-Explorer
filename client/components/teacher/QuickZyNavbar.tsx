"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  School,
} from "lucide-react";

function QuickZyNavbar() {
  const pathname = usePathname();

  const [isExpanded, setIsExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    {
      title: "Overview",
      items: [
        {
          name: "Quickzy",
          link: "/teacher/quickzy",
          icon: LayoutDashboard,
        },
        // {
        //   name: "Analytics",
        //   link: "/admin/analytics",
        //   icon: ChartNoAxesCombined,
        // },
      ],
    },
    {
      title: "Manage",
      items: [
        {
          name: "Create",
          link: "/teacher/quickzy/create",
          icon: GraduationCap,
        },
      ],
    },
  ];

  const sidebarWidth = isExpanded ? "w-72" : "w-[88px]";

  const isActive = (link: string) =>
    pathname === link ||
    (link !== "/teacher/quickzy" && pathname.startsWith(`${link}/`));

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-[60] rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-lg lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={22} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[55] bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-[60] flex h-screen flex-col
          border-r border-slate-200/80 bg-white
          shadow-[4px_0_30px_rgba(15,23,42,0.04)]
          transition-all duration-300 ease-in-out
          ${sidebarWidth}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo Section */}
        <div className="flex h-[88px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <Link
            href="/admin/dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200">
              <School size={25} />
            </div>

            {isExpanded && (
              <div className="overflow-hidden">
                <h1 className="whitespace-nowrap text-lg font-extrabold tracking-tight text-slate-900">
                  Student<span className="text-blue-600">Explorer</span>
                </h1>
                <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[2px] text-slate-400">
                  Admin Portal
                </p>
              </div>
            )}
          </Link>

          {/* Mobile Close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Desktop Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="
            absolute -right-3 top-[105px] z-10 hidden h-7 w-7
            items-center justify-center rounded-full border border-slate-200
            bg-white text-slate-500 shadow-md transition-all
            hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600
            lg:flex
          "
          aria-label={isExpanded ? "Minimize sidebar" : "Expand sidebar"}
          title={isExpanded ? "Minimize sidebar" : "Expand sidebar"}
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-7 overflow-y-auto overflow-x-hidden px-3 py-7">
          {links.map((section) => (
            <div key={section.title}>
              {isExpanded && (
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[2px] text-slate-400">
                  {section.title}
                </p>
              )}

              {!isExpanded && (
                <div className="mb-3 mx-auto h-px w-8 bg-slate-200" />
              )}

              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.link);

                  return (
                    <Link
                      key={item.name}
                      href={item.link}
                      onClick={() => setMobileOpen(false)}
                      title={!isExpanded ? item.name : undefined}
                      aria-label={item.name}
                      aria-current={active ? "page" : undefined}
                      className={`
                        group relative flex items-center gap-3
                        rounded-xl px-3 py-3
                        transition-all duration-200
                        ${
                          active
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                        }
                        ${!isExpanded ? "justify-center px-0" : ""}
                      `}
                    >
                      <Icon
                        size={21}
                        strokeWidth={active ? 2.5 : 2}
                        className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                      />

                      {isExpanded && (
                        <span className="whitespace-nowrap text-sm font-semibold">
                          {item.name}
                        </span>
                      )}

                      {active && isExpanded && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                      )}

                      {/* Tooltip for minimized sidebar */}
                      {!isExpanded && (
                        <span
                          className="
                          pointer-events-none absolute left-[75px] z-[70]
                          whitespace-nowrap rounded-lg bg-slate-900
                          px-3 py-2 text-xs font-semibold text-white
                          opacity-0 shadow-xl transition-opacity
                          group-hover:opacity-100
                        "
                        >
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        {/* <div className="shrink-0 border-t border-slate-100 p-3">
          <Link
            href="/admin/settings"
            onClick={() => setMobileOpen(false)}
            title={!isExpanded ? "Settings" : undefined}
            className={`
              flex items-center gap-3 rounded-xl px-3 py-3
              text-slate-500 transition hover:bg-slate-100 hover:text-slate-900
              ${!isExpanded ? "justify-center px-0" : ""}
            `}
          >
            <Settings size={21} className="shrink-0" />
            {isExpanded && (
              <span className="text-sm font-semibold">Settings</span>
            )}
          </Link>

          <button
            onClick={() => {
              // Add your logout API and cookie-clearing logic here.
            }}
            title={!isExpanded ? "Logout" : undefined}
            className={`
              mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3
              text-red-500 transition hover:bg-red-50
              ${!isExpanded ? "justify-center px-0" : ""}
            `}
          >
            <LogOut size={21} className="shrink-0" />
            {isExpanded && (
              <span className="text-sm font-semibold">Logout</span>
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                A
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800">
                  Administrator
                </p>
                <p className="text-[10px] text-slate-400">School Admin</p>
              </div>
            </div>
          )}
        </div> */}
      </aside>
    </>
  );
}

export default QuickZyNavbar;
