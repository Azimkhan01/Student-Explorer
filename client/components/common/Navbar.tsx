
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  ChevronDown,
  ChevronUp,
  House,
  FileUser,
  Users,
  GraduationCap,
  CalendarCheck,
  FileChartColumn,
  UserRound,
  SquareCheckBig,
  Zap,
} from "lucide-react";

const iconMap = {
  house: House,
  "file-user": FileUser,
  users: Users,
  "graduation-cap": GraduationCap,
  "calendar-check": CalendarCheck,
  "file-chart-column": FileChartColumn,
  "user-round": UserRound,
  "square-check-big": SquareCheckBig,
  zap: Zap,
};

interface NavbarLink {
  name: string;
  link: string;
  logo: keyof typeof iconMap;
}

interface NavbarProps {
  links: readonly NavbarLink[];
}

function Navbar({ links }: NavbarProps) {
  const pathname = usePathname();
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <header className="fixed bottom-6 left-0 z-50 flex w-full justify-center px-3 sm:px-6 pointer-events-none">

      <div className="flex w-fit max-w-full flex-col items-center gap-2 pointer-events-none">

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className={`
            pointer-events-auto
            w-fit max-w-full overflow-hidden rounded-[28px]
            border border-white/60 bg-white/80
            shadow-[0_10px_40px_rgba(0,0,0,0.12)]
            backdrop-blur-2xl ring-1 ring-black/[0.03]
            transition-all duration-300 ease-in-out
            origin-bottom
            ${
              isMinimized
                ? "invisible max-h-0 translate-y-4 scale-90 opacity-0 border-0 shadow-none"
                : "visible max-h-24 translate-y-0 scale-100 opacity-100"
            }
          `}
        >
          <div
            className="
              flex w-fit max-w-full items-center gap-1
              overflow-x-auto overscroll-x-contain
              px-2 py-2
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            {links.map((item) => {
              const Icon = iconMap[item.logo];

              const isActive =
                pathname === item.link ||
                (item.link !== "/" &&
                  pathname.startsWith(item.link + "/"));

              return (
                <Link
                  key={item.name}
                  href={item.link}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    group relative flex min-w-[76px] shrink-0
                    flex-col items-center justify-center gap-1
                    rounded-2xl px-3 py-2
                    transition-all duration-300
                    ${
                      isActive
                        ? "scale-105 bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                        : "text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                    }
                  `}
                >
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

                  <span className="whitespace-nowrap text-[10px] font-semibold tracking-wide">
                    {item.name}
                  </span>

                  {isActive && (
                    <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Minimize / Expand Button */}
        <button
          onClick={() => setIsMinimized((prev) => !prev)}
          aria-label={isMinimized ? "Expand navbar" : "Minimize navbar"}
          aria-expanded={!isMinimized}
          className="
            pointer-events-auto
            flex h-9 w-9 shrink-0 items-center justify-center
            rounded-full border border-white/60
            bg-white/90 text-slate-600
            shadow-lg backdrop-blur-xl
            transition-all duration-200
            hover:bg-blue-600 hover:text-white
          "
        >
          {isMinimized ? (
            <ChevronUp size={18} />
          ) : (
            <ChevronDown size={18} />
          )}
        </button>

      </div>
    </header>
  );
}

export default Navbar;
