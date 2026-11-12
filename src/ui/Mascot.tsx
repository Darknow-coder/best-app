/**
 * The Cobaye guinea pig: a geometric, friendly mascot drawn in SVG.
 * `mood` tweaks the eyes; everything inherits currentColor for the outline.
 */
export function Mascot({ className, mood = 'calm', size }: { className?: string; mood?: 'calm' | 'curious' | 'happy'; size?: number }) {
  const eye =
    mood === 'happy' ? (
      <>
        <path d="M66 86c3-4 8-4 11 0" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M104 86c3-4 8-4 11 0" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </>
    ) : (
      <>
        <circle cx="71" cy="86" r={mood === 'curious' ? 5.5 : 4.5} fill="var(--ink)" />
        <circle cx="109" cy="86" r={mood === 'curious' ? 5.5 : 4.5} fill="var(--ink)" />
        <circle cx="72.8" cy="84.2" r="1.6" fill="var(--paper)" />
        <circle cx="110.8" cy="84.2" r="1.6" fill="var(--paper)" />
      </>
    );
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 180 160"
      role="img"
      aria-label="Cobaye"
      fill="none"
    >
      {/* body */}
      <path
        d="M30 112c0-38 26-66 62-66s62 26 62 62c0 16-10 26-26 26H52c-14 0-22-8-22-22z"
        fill="var(--a-soft)"
        stroke="var(--ink)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* patch */}
      <path d="M96 48c22 2 40 18 48 42-14 8-30 12-46 10-6-16-8-34-2-52z" fill="var(--a)" opacity="0.85" />
      {/* ears */}
      <path d="M58 56c-10-8-24-6-26 6 6 6 16 8 24 4z" fill="var(--a)" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M118 50c8-10 24-10 28 2-6 8-16 10-26 4z" fill="var(--a-soft)" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
      {/* feet */}
      <path d="M62 134v8M78 134v8M112 134v8M128 134v8" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
      {/* nose & mouth */}
      <ellipse cx="90" cy="100" rx="6" ry="4.5" fill="var(--ink)" />
      <path d="M90 104v5M84 112c3 3 9 3 12 0" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      {/* whiskers */}
      <path d="M60 102h18M60 108l18-3M120 102h-18M120 108l-18-3" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {eye}
      {/* lab goggles strap hint */}
      <path d="M46 78c10-10 30-16 44-16s34 6 44 16" stroke="var(--b)" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Cobaye" fill="none">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="var(--ink)" />
      <path d="M11 30c0-9 6-15 13-15s13 6 13 14c0 4-2.5 6-6 6H17c-4 0-6-2-6-5z" fill="var(--paper)" />
      <path d="M26 15.5c5 .5 9 4 11 9.5-3 1.8-6.5 2.6-10 2-1.5-3.6-1.8-7.6-1-11.5z" fill="var(--a)" />
      <path d="M17.5 18c-2.6-2.2-6.4-1.6-7 1.6 1.6 1.6 4.2 2 6.4 1z" fill="var(--a)" />
      <circle cx="19.5" cy="26" r="1.4" fill="var(--ink)" />
      <circle cx="28.5" cy="26" r="1.4" fill="var(--ink)" />
      <ellipse cx="24" cy="29.5" rx="1.6" ry="1.2" fill="var(--ink)" />
      <path d="M13.5 23.5c3-3 7-4.5 10.5-4.5s7.5 1.5 10.5 4.5" stroke="var(--b)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
