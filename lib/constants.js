export const LEVELS = [100, 200, 300, 400, 500];
export const levelLabel = (l) => (l ? `${l}L` : 'All levels');

// Database role names stay the same; these are the names people see.
export const ROLE_LABEL = { member: 'Member', coordinator: 'Committee head', chairman: 'Admin' };

/** "Committee head · SEET · 300L", "Admin · everyone", "Member". */
export function roleLine(profile) {
  if (profile?.role === 'chairman') return 'Admin · everyone';
  if (profile?.role === 'coordinator') {
    const parts = [profile.committee_school, profile.coordinator_level ? `${profile.coordinator_level}L` : profile.committee_school ? 'all levels' : null].filter(Boolean);
    return `Committee head${parts.length ? ` · ${parts.join(' · ')}` : ''}`;
  }
  return 'Member';
}

// Reading shares are hidden for groups this small, so totals can't reveal one person's activity.
export const MIN_GROUP = 3;
