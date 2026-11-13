"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useMemo } from "react";

export interface LeaderboardEntry {
  rank: number;
  id: string; // stable student id (survives reconnects)
  username: string;
  avatar?: string;
  score: number;
  totalTimeMs: number;
  answeredQuestions: number;
  connected?: boolean;
}

// ------------------------------------------------------------
// Number that counts up/down to its new value
// ------------------------------------------------------------
export function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

// ------------------------------------------------------------
// Confetti burst (skipped when the user prefers reduced motion)
// ------------------------------------------------------------
const CONFETTI_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
];

export function Confetti({ count = 56 }: { count?: number }) {
  const reduce = useReducedMotion();

  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        duration: 2.4 + Math.random() * 1.8,
        rotate: Math.random() * 720 - 360,
        drift: (Math.random() - 0.5) * 180,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [count],
  );

  if (reduce) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            backgroundColor: p.color,
          }}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: "105vh",
            x: p.drift,
            rotate: p.rotate,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}