// The TLV mark: three stave lines with a rising note, drawn for this committee
// (a choir's academic arm). Sage green is used for the note only.
export function Mark({ size = 28, title = 'TLV Academic' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={title}>
      <rect width="32" height="32" rx="9" fill="#1F2120" />
      <path d="M7 12h18M7 16h18M7 20h18" stroke="#F7F4EE" strokeOpacity=".55" strokeWidth="1.2" />
      <ellipse cx="19" cy="16" rx="3.4" ry="2.6" transform="rotate(-20 19 16)" fill="#8FA58A" />
      <path d="M22.1 15.2V7.5" stroke="#8FA58A" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Serif wordmark, as in the redesign mockups. Pass mark to show the square logo beside it.
export function Wordmark({ mark = false }) {
  return (
    <span className="inline-flex items-center gap-2">
      {mark && <Mark size={26} title="" />}
      <span className="display text-[1.0625rem] leading-none">TLV Academic</span>
    </span>
  );
}
