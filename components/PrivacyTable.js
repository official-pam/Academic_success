// "Who can see what" — the spec's release gate asks that members can explain this themselves.
const ROWS = [
  ['Your name, level and department', 'You, your level coordinator, the chairman'],
  ['Your reading check-ins and notes', 'Only you'],
  ['Your goals and study plan', 'Only you'],
  ['Whether your level is reading this week', 'Coordinators and the chairman, as totals only (e.g. "18 of 31 members")'],
  ['CGPA or academic struggles', 'Not collected'],
];

export function PrivacyTable() {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">Who can see each kind of information</caption>
      <thead>
        <tr className="text-xs text-muted">
          <th scope="col" className="pb-2 pr-4 font-semibold">Information</th>
          <th scope="col" className="pb-2 font-semibold">Who can see it</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map(([what, who]) => (
          <tr key={what} className="border-t border-rule align-top">
            <th scope="row" className="py-3 pr-4 font-semibold">{what}</th>
            <td className="py-3">{who}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
