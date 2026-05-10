'use client';

// "Before" frame 2 — a stopped analog clock at 11:47. The hands do NOT move;
// that's the point. SVG so it scales sharp on retina + inherits the scene's
// monochrome filter without any image asset.

import { forwardRef } from 'react';

export const StoppedClock = forwardRef<HTMLDivElement>(function StoppedClock(_, ref) {
  // 11:47 in clock-hand angles:
  //   minute hand at 47 min => (47/60)*360 = 282°
  //   hour hand at 11h + 47/60h => ((11 + 47/60) / 12) * 360 = 353.5°
  const minuteAngle = 282;
  const hourAngle = 353.5;

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 grid place-items-center">
      <svg
        viewBox="0 0 200 200"
        className="w-[min(72vw,360px)] h-auto"
        role="presentation"
      >
        {/* Outer ring */}
        <circle cx="100" cy="100" r="92" fill="none" stroke="#3A3A44" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="86" fill="#0A0A0B" />
        {/* Hour ticks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * 360;
          const r = (angle * Math.PI) / 180;
          const x1 = 100 + Math.sin(r) * 78;
          const y1 = 100 - Math.cos(r) * 78;
          const x2 = 100 + Math.sin(r) * 86;
          const y2 = 100 - Math.cos(r) * 86;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#76767D"
              strokeWidth={i % 3 === 0 ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}
        {/* Hour hand — frozen */}
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((hourAngle * Math.PI) / 180) * 50}
          y2={100 - Math.cos((hourAngle * Math.PI) / 180) * 50}
          stroke="#A1A1AA"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Minute hand — frozen */}
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((minuteAngle * Math.PI) / 180) * 72}
          y2={100 - Math.cos((minuteAngle * Math.PI) / 180) * 72}
          stroke="#D4D4DA"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Center cap */}
        <circle cx="100" cy="100" r="3" fill="#D4D4DA" />
      </svg>
    </div>
  );
});
