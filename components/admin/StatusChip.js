const STYLE = {
  published: 'bg-sage-wash text-sage-ink',
  draft: 'bg-notice text-notice-ink',
  archived: 'bg-stone/70 text-muted',
};
const LABEL = { published: 'Published', draft: 'Draft', archived: 'Archived' };
export function StatusChip({ status }) {
  return <span className={`chip ${STYLE[status]}`}>{LABEL[status]}</span>;
}
