// Renders committee text safely: paragraphs from blank lines, and only http(s) links.
const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

function linkify(text) {
  return text.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow">{part.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}</a>
    ) : (
      part
    )
  );
}

export function RichText({ text, className = '' }) {
  if (!text?.trim()) return null;
  return (
    <div className={`prose-tlv text-base ${className}`}>
      {text.trim().split(/\n{2,}/).map((p, i) => (
        <p key={i} className="whitespace-pre-line">{linkify(p)}</p>
      ))}
    </div>
  );
}

export function ResourceList({ text }) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {lines.map((line, i) => {
        const m = line.match(URL_RE);
        const label = line.replace(URL_RE, '').replace(/[-–:|]\s*$/, '').trim();
        return (
          <li key={i} className="py-3 text-base">
            {m ? (
              <a href={m[0]} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-lavender-ink underline underline-offset-2">
                {label || m[0].replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)}
              </a>
            ) : (
              line
            )}
          </li>
        );
      })}
    </ul>
  );
}
