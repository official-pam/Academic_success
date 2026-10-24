// "Who can see what" — the spec's release gate asks that members can explain this themselves.
// Mentors = committee heads for the member's school (and level, if set). Admin = the committee chair.
const ROWS = [
  ['Your name, school, programme and level', 'You, your committee head (mentor) and the admin'],
  ['Your courses, targets, goals and results (grades, scores, CGPA)', 'You, your committee head and the admin'],
  ['Your focus sessions and planned study sessions', 'You, your committee head and the admin. They are notified when you finish a focus session or record a result'],
  ['Which days you checked in', 'You, your committee head and the admin (the days only)'],
  ['Your prayer requests to the committee', 'You, your committee head and the admin'],
  ['Prayer points you share', 'Every member, with your first name'],
  ['Your check-in notes and memorised verses', 'Only you'],
  ['Totals for your level', 'The committee, as totals only (hidden when fewer than 3 people)'],
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
