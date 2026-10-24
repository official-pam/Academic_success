/*
  Memory verse backgrounds (server-safe, no client code). Five soft themes in the app palette, picked by
  day so each day looks fresh: a two-tone gradient, two soft glows, a scatter of petals and a hand-drawn
  botanical sprig anchored bottom-right (as in the mockups). Body text sits on the light side; all text
  colours used on these backgrounds are >= 4.5:1.
*/
export const THEMES = [
  { name: 'lavender', from: '#F4EFFB', to: '#DACCF2', glow: '#C4B2EA', leaf: '#A78BCE', stem: '#8D72B8', ink: '#5E4690' },
  { name: 'sage', from: '#F0F5ED', to: '#D2E0CC', glow: '#B7CBB1', leaf: '#8FA58A', stem: '#728C6C', ink: '#4A6145' },
  { name: 'slate', from: '#EEF2F7', to: '#D0DBE8', glow: '#B3C3D6', leaf: '#7189A6', stem: '#5C7493', ink: '#3F5878' },
  { name: 'rose', from: '#F9EFF2', to: '#EBD2D9', glow: '#DCB7C1', leaf: '#BC8795', stem: '#A26F7D', ink: '#86475A' },
  { name: 'dawn', from: '#F6F1FA', to: '#DFE8DA', glow: '#D6C8EC', leaf: '#8FA58A', stem: '#A78BCE', ink: '#5E4690' },
];

export function themeFor(index) {
  return THEMES[((index % THEMES.length) + THEMES.length) % THEMES.length];
}

const LEAVES = [
  // x, y, rotation, scale: pairs alternating left/right up the stem
  [44, 150, -150, 1.05], [47, 136, -25, 1.0], [40, 118, -155, 0.95], [44, 104, -20, 0.92],
  [34, 86, -160, 0.85], [37, 72, -15, 0.8], [27, 56, -165, 0.72], [29, 44, -10, 0.66],
];

function Sprig({ theme, className }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 90 180" className={className}>
      <path d="M52 180 C 50 140, 44 96, 20 30" fill="none" stroke={theme.stem} strokeWidth="1.8" strokeLinecap="round" opacity=".8" />
      {LEAVES.map(([x, y, r, s], i) => (
        <path
          key={i}
          d="M0 0 C 7 -9, 24 -11, 32 -2 C 22 6, 7 7, 0 0 Z"
          transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
          fill={theme.leaf}
          opacity={i % 2 ? 0.75 : 0.55}
        />
      ))}
      <circle cx="20" cy="28" r="3.2" fill={theme.leaf} opacity=".7" />
    </svg>
  );
}

export function VerseBackground({ theme, compact = false }) {
  const t = theme;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${t.from} 0%, ${t.from} 35%, ${t.to} 100%)` }} />
      <div className="absolute -right-16 -top-20 size-56 rounded-full" style={{ background: `radial-gradient(circle, ${t.glow}99 0%, ${t.glow}00 70%)` }} />
      <div className="absolute -bottom-24 -left-16 size-52 rounded-full" style={{ background: `radial-gradient(circle, ${t.glow}80 0%, ${t.glow}00 70%)` }} />
      {!compact && (
        <>
          <span className="absolute bottom-10 right-28 size-2 rounded-full" style={{ background: t.leaf, opacity: 0.35 }} />
          <span className="absolute bottom-16 right-32 size-1.5 rounded-full" style={{ background: t.leaf, opacity: 0.3 }} />
          <span className="absolute right-24 top-8 size-1.5 rounded-full" style={{ background: t.leaf, opacity: 0.3 }} />
        </>
      )}
      <Sprig theme={t} className={compact ? 'absolute -bottom-3 right-2 h-24 w-12' : 'absolute -bottom-2 right-3 h-52 w-26'} />
    </div>
  );
}
