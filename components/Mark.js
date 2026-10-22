// The TLV mark: three stave lines with a rising note, drawn for this committee
// (a choir's academic arm). Clay is used for the note only.
export function Mark({ size = 28, title = 'TLV Academic' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={title}>
      <rect width="32" height="32" rx="7" fill="#20221F" />
      <path d="M7 12h18M7 16h18M7 20h18" stroke="#F1EEE7" strokeOpacity=".55" strokeWidth="1.2" />
      <ellipse cx="19" cy="16" rx="3.4" ry="2.6" transform="rotate(-20 19 16)" fill="#C65B37" />
      <path d="M22.1 15.2V7.5" stroke="#C65B37" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark size={28} title="" />
      <span className="text-sm font-bold tracking-tight">
        TLV <span className="font-medium text-muted">Academic</span>
      </span>
    </span>
  );
}
