"use client";

import type React from "react";

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  isFixed?: boolean;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  children,
  className = "",
  isFixed = false,
}) => {
  return (
    <div
      className={`${
        isFixed ? "fixed inset-0" : "absolute inset-0"
      } overflow-hidden pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* ── Diagonal Light-Blade Gradient Streaks ─────────────── */}
      <div className="aurora-blade aurora-blade-1" />
      <div className="aurora-blade aurora-blade-2" />
      <div className="aurora-blade aurora-blade-3" />
      <div className="aurora-blade aurora-blade-4" />
      <div className="aurora-blade aurora-blade-5" />

      {/* ── Radial Vignette: keeps typography crisp & high-contrast ── */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_80%_65%_at_50%_35%,transparent_20%,#07080a_92%)]" />

      {/* ── Subtle Film-Grain feTurbulence Texture ─────────────── */}
      <svg
        className="absolute inset-0 z-[2] w-full h-full opacity-[0.035] mix-blend-overlay pointer-events-none"
        aria-hidden="true"
      >
        <filter id="aurora-film-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#aurora-film-grain)" />
      </svg>

      {children}
    </div>
  );
};
