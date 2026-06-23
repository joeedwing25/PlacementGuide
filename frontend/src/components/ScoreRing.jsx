import React from "react";

/** Circular progress ring for displaying scores 0-100. */
export default function ScoreRing({ value = 0, label = "Readiness", size = 200, thickness = 14, color }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const stroke = color || (v >= 75 ? "hsl(160 60% 45%)" : v >= 50 ? "hsl(var(--primary))" : "hsl(var(--accent))");
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={thickness} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={stroke}
          strokeWidth={thickness}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-heading font-black tracking-tighter" data-testid="score-ring-value">{v}</div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}
